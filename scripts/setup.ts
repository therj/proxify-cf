import { execSync } from 'child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

console.log(
  'Applying local D1 migrations for Wrangler env `dev` (database_name from wrangler.jsonc, e.g. proxify_demo-db). Create that D1 DB and update apps/worker/wrangler.jsonc if needed.',
);

try {
  execSync('pnpm --filter worker run db:migrate:local', {
    stdio: 'inherit',
    cwd: repoRoot,
  });

  console.log('Setup complete. Run `pnpm dev` to start the worker and admin watch build.');
} catch (error) {
  console.error('Setup failed:', error);
  process.exit(1);
}
