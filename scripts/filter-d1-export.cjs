/**
 * Remote D1 `--no-schema` dumps often include rows for `d1_migrations`.
 * Applying those INSERTs locally collides with migration bookkeeping → UNIQUE on d1_migrations.id.
 * Strip internal bookkeeping inserts before `wrangler d1 execute --local`.
 */
const fs = require('fs');
const path = require('path');

const workerRoot = path.join(__dirname, '../apps/worker');
const rawPath = path.join(workerRoot, '.remote-d1-data.raw.sql');
const outPath = path.join(workerRoot, '.remote-d1-data.sql');

const raw = fs.readFileSync(rawPath, 'utf8');
const lines = raw.split(/\r?\n/);
let dropped = 0;

const filtered = lines.filter((line) => {
  const t = line.trim();
  if (
    /^INSERT INTO\s+[`'"]?d1_migrations[`'"]?/i.test(t) ||
    /^INSERT INTO\s+[`'"]?sqlite_sequence[`'"]?/i.test(t)
  ) {
    dropped++;
    return false;
  }
  return true;
});

fs.writeFileSync(outPath, filtered.join('\n'), 'utf8');
console.log(`Filtered remote D1 dump: dropped ${dropped} bookkeeping line(s) → ${path.relative(process.cwd(), outPath)}`);
