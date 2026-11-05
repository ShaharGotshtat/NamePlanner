import { AsyncLocalStorage } from "node:async_hooks";
import { randomInt } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";

// No 0/O or 1/I/L, so an ID read aloud or copied from a screenshot stays unambiguous.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const newRequestId = () => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

const storage = new AsyncLocalStorage<string>();

export const withRequestId = <T>(id: string, run: () => T) => storage.run(id, run);

export const currentRequestId = () => storage.getStore();

const prefix = () => {
  const id = currentRequestId();
  return id ? `[req ${id}]` : "[req -]";
};

/** Server log lines carry the request ID, so an ID shown to a user can be found in the logs. */
export const log = {
  warn: (message: string, ...details: unknown[]) => console.warn(prefix(), message, ...details),
  error: (message: string, ...details: unknown[]) => console.error(prefix(), message, ...details),
};
