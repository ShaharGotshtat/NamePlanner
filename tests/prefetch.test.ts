import { afterEach, describe, expect, it, vi } from "vitest";
import { checkPreferences, fetchRound } from "@/lib/client/api";
import { Prefetch } from "@/lib/client/prefetch";
import type { RoundRequest } from "@/lib/types";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
};
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("Prefetch", () => {
  it("hands over a round that has arrived, once", async () => {
    const p = new Prefetch<string>();
    const onLoaded = vi.fn();
    p.start("1:2", async () => "round 2", onLoaded);
    await flush();
    expect(onLoaded).toHaveBeenCalledWith("round 2");
    expect(p.take("1:2")).toEqual({ ready: "round 2" });
    expect(p.take("1:2")).toBeNull();
  });

  it("hands over a round that is still loading", async () => {
    const p = new Prefetch<string>();
    const load = deferred<string>();
    p.start("1:2", () => load.promise);
    const taken = p.take("1:2");
    load.resolve("round 2");
    expect(taken && "pending" in taken && (await taken.pending)).toBe("round 2");
  });

  it("drops a failed prefetch quietly so the caller asks again", async () => {
    const p = new Prefetch<string>();
    p.start("1:2", async () => {
      throw new Error("offline");
    });
    await flush();
    expect(p.has("1:2")).toBe(false);
    expect(p.take("1:2")).toBeNull();
  });

  it("resolves to null when it fails after being taken", async () => {
    const p = new Prefetch<string>();
    const load = deferred<string>();
    p.start("1:2", () => load.promise);
    const taken = p.take("1:2");
    load.reject(new Error("500"));
    expect(taken && "pending" in taken && (await taken.pending)).toBeNull();
  });

  it("never uses a prefetch for another round, and cancels it", () => {
    const p = new Prefetch<string>();
    let signal: AbortSignal | undefined;
    p.start("1:2", (s) => ((signal = s), new Promise(() => {})));
    expect(p.take("1:3")).toBeNull();
    expect(signal?.aborted).toBe(true);
  });

  it("starts one load per round", () => {
    const p = new Prefetch<string>();
    const load = vi.fn(() => new Promise<string>(() => {}));
    p.start("1:2", load);
    p.start("1:2", load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("ignores a load that arrives after it was cancelled", async () => {
    const p = new Prefetch<string>();
    const load = deferred<string>();
    const onLoaded = vi.fn();
    p.start("1:2", () => load.promise, onLoaded);
    p.cancel();
    load.resolve("late");
    await flush();
    expect(onLoaded).not.toHaveBeenCalled();
  });
});

describe("session token requests", () => {
  afterEach(() => vi.restoreAllMocks());

  const request = { shownIds: [], ratings: [] } as unknown as RoundRequest;
  const preferences = { chips: {}, texts: ["note"], namesWeLike: [], family: [] };

  it("run one at a time, each with the token the one before returned", async () => {
    const sent: { path: string; token: string | null }[] = [];
    const responses = [deferred<Response>(), deferred<Response>()];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const token = new Headers(init?.headers).get("x-session-token");
      sent.push({ path: String(url), token });
      return responses[sent.length - 1].promise;
    });

    const round = fetchRound(request, "t0");
    const check = checkPreferences(preferences, "t0");
    await flush();
    expect(sent).toEqual([{ path: "/api/rounds", token: "t0" }]);

    responses[0].resolve(Response.json({ suggestions: [], token: "t1" }));
    expect((await round).token).toBe("t1");
    await flush();
    expect(sent[1]).toEqual({ path: "/api/preferences", token: "t1" });

    responses[1].resolve(Response.json({ status: "ok", token: "t2" }));
    expect((await check).token).toBe("t2");
  });

  it("send nothing when cancelled while waiting their turn", async () => {
    const first = deferred<Response>();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() => first.promise);
    const running = checkPreferences(preferences, "a0");
    const controller = new AbortController();
    const waiting = fetchRound(request, "a0", controller.signal);
    controller.abort();
    first.resolve(Response.json({ status: "ok", token: "a1" }));
    await running;
    await expect(waiting).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
