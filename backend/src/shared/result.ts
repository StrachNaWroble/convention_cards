export type Result<T, E extends string = string> =
  | { ok: true; data: T }
  | { ok: false; error: E; message?: string };

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function err<E extends string>(error: E, message?: string): Result<never, E> {
  return message ? { ok: false, error, message } : { ok: false, error };
}
