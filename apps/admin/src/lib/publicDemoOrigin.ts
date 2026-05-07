/** Public demo deployment (shared admin UX copy). */
export const PUBLIC_DEMO_ORIGIN = 'https://proxify-cf.rjoshi.net';

/** Whether the public demo mode is enabled (set via Vite env var). */
export const PUBLIC_DEMO_ORIGIN_ENABLED = import.meta.env.VITE_PUBLIC_DEMO_ENABLED === 'true';

/** Sample Host header for demo users. */
export const PUBLIC_DEMO_ORIGIN_HOST = 'proxify-cf-protected.rjoshi.net';

/** Sample CF headers for demo users. */
export const PUBLIC_DEMO_ORIGIN_HEADERS = [
  { name: 'CF-Access-Client-Id', value: '45548292b57eddcabb76f1312e7c4a74.access' },
  { name: 'CF-Access-Client-Secret', value: '1dddd69bf04eaf0734abe7996412e78f3292306be06665969aec6228088e840f' },
];

/** How often data is cleaned up (in hours) for display in the notice. */
export const PUBLIC_DEMO_RETENTION_HOURS = 24; // keep same value as DEMO_CLEANUP_RETENTION_MINUTES in wrangler.jsonc
