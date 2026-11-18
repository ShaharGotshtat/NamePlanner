/**
 * Holds the next round while the parent is still voting on the current one. A prefetch belongs to the
 * round it was started from: it is used only to follow that round, and a failed one is dropped quietly
 * so the caller can ask again with every vote.
 */
export class Prefetch<T> {
  private entry: { key: string; controller: AbortController; result?: T; failed?: boolean; done: Promise<void> } | null = null;

  /** Starts loading for the round with this key, unless a load for it is already running or done. */
  start(key: string, load: (signal: AbortSignal) => Promise<T>, onLoaded?: (result: T) => void) {
    if (this.entry?.key === key) return;
    this.cancel();
    const controller = new AbortController();
    const entry: NonNullable<typeof this.entry> = { key, controller, done: Promise.resolve() };
    entry.done = load(controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        entry.result = result;
        onLoaded?.(result);
      },
      () => {
        entry.failed = true;
      },
    );
    this.entry = entry;
  }

  /**
   * Hands over the prefetch for the round with this key and forgets it. `ready` is set when it has
   * already arrived; `pending` resolves to it, or to null if it fails. Null when there is none to use.
   */
  take(key: string): { ready: T } | { pending: Promise<T | null> } | null {
    const entry = this.entry;
    this.entry = null;
    if (!entry || entry.key !== key || entry.failed) {
      entry?.controller.abort();
      return null;
    }
    if (entry.result !== undefined) return { ready: entry.result };
    return { pending: entry.done.then(() => (entry.failed ? null : (entry.result ?? null))) };
  }

  has(key: string) {
    return this.entry?.key === key && !this.entry.failed;
  }

  cancel() {
    this.entry?.controller.abort();
    this.entry = null;
  }
}
