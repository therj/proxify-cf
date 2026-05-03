export function loadErrorMessage(e: unknown): string {
  if (e instanceof Error && e.message.trim()) return e.message;
  return 'Request failed';
}
