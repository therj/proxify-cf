/** session: auth gates / Access; server: 5xx + structured API failures; network: transport / unreadable body */
export type FatalApiErrorVariant = 'session' | 'server' | 'network';

export type FatalApiErrorPayload = {
  message: string;
  variant: FatalApiErrorVariant;
};

type Listener = (payload: FatalApiErrorPayload) => void;

let listener: Listener | null = null;

export function subscribeFatalApiError(fn: Listener): () => void {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

export function notifyFatalApiError(payload: FatalApiErrorPayload): void {
  queueMicrotask(() => listener?.(payload));
}

let clearListener: (() => void) | null = null;

/** Provider registers this to close the blocking fatal modal. */
export function registerFatalApiClear(fn: () => void): () => void {
  clearListener = fn;
  return () => {
    if (clearListener === fn) clearListener = null;
  };
}

/** Close blocking modal (e.g. before triggering SPA refetch). */
export function clearFatalApiError(): void {
  queueMicrotask(() => clearListener?.());
}
