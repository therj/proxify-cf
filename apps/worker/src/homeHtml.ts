/** Public landing page served at `GET /` (not part of the admin SPA build). */
export const HOME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Proxify CF</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0f1115;
      --text: #f0f0f5;
      --muted: #a1a5b5;
      --accent: #6366f1;
      --accent-hover: #4f46e5;
      --surface: rgba(255,255,255,0.04);
      --border: rgba(255,255,255,0.08);
      --radius: 12px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: radial-gradient(circle at top right, #1a1e28, var(--bg));
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .wrap { max-width: 36rem; width: 100%; text-align: center; }
    h1 {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: clamp(1.75rem, 4vw, 2.25rem);
      margin-bottom: 0.75rem;
      letter-spacing: -0.02em;
    }
    p { color: var(--muted); line-height: 1.6; margin-bottom: 2rem; }
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
      margin-bottom: 2rem;
    }
    nav a {
      color: var(--muted);
      text-decoration: none;
      font-size: 0.9rem;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--surface);
      transition: color 0.2s, border-color 0.2s;
    }
    nav a:hover { color: var(--text); border-color: rgba(255,255,255,0.15); }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.85rem 1.75rem;
      font-size: 1rem;
      font-weight: 600;
      font-family: inherit;
      color: #fff;
      background: var(--accent);
      border: none;
      border-radius: var(--radius);
      text-decoration: none;
      cursor: pointer;
      transition: background 0.2s;
      box-shadow: 0 4px 24px rgba(99, 102, 241, 0.35);
    }
    .btn:hover { background: var(--accent-hover); }
    footer { margin-top: 3rem; font-size: 0.8rem; color: var(--muted); opacity: 0.8; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Proxify CF</h1>
    <p>Edge proxy control plane. Manage clients, routes, keys, and grants from the admin console.</p>
    <nav aria-label="Quick links">
      <a href="/admin">Admin panel</a>
      <a href="/admin/health">Admin health</a>
    </nav>
    <a class="btn" href="/admin">Open admin panel</a>
    <footer>API for the console lives under <code>/admin/api/v1</code></footer>
  </div>
</body>
</html>`;
