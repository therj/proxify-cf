const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function toDate(ts: number | string | Date): Date {
  if (ts instanceof Date) return ts;
  if (typeof ts === 'number') return new Date(ts);
  return new Date(ts);
}

/** e.g. 11.26am, 30 April - same style everywhere (Access, Audit, Dashboard, …). */
export function formatDateTime(ts: number | string | Date): string {
  const d = toDate(ts);
  const h24 = d.getHours();
  const minutes = d.getMinutes();
  const ampm = h24 >= 12 ? 'pm' : 'am';
  const h12 = h24 % 12 || 12;
  const mm = minutes.toString().padStart(2, '0');
  const day = d.getDate();
  const monthName = MONTH_NAMES[d.getMonth()];
  return `${h12}.${mm}${ampm}, ${day} ${monthName}`;
}

/** Calendar date only, same month naming. e.g. 30 April 2026 */
export function formatDate(ts: number | string | Date): string {
  const d = toDate(ts);
  const day = d.getDate();
  const monthName = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${monthName} ${year}`;
}
