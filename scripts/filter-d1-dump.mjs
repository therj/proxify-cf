#!/usr/bin/env node
/**
 * Remote D1 `--no-schema` dumps often include rows for `d1_migrations`.
 * Applying those INSERTs locally collides with migration bookkeeping → UNIQUE on d1_migrations.id.
 * Strip internal bookkeeping inserts before `wrangler d1 execute --local`.
 *
 * Usage: node scripts/filter-d1-dump.mjs <input.sql> <output.sql>
 * Paths may be relative to cwd (run from apps/worker) or absolute.
 */
import fs from "node:fs";
import path from "node:path";

const [inPath, outPath] = process.argv.slice(2);

if (!inPath || !outPath) {
  console.error("Usage: node scripts/filter-d1-dump.mjs <input.sql> <output.sql>");
  process.exit(1);
}

const inAbs = path.resolve(inPath);
const outAbs = path.resolve(outPath);

if (!fs.existsSync(inAbs)) {
  console.error(`filter-d1-dump: input file not found: ${inAbs}`);
  process.exit(1);
}

/** @param {string} line */
function isBookkeepingInsert(line) {
  const t = line.trim();
  return (
    /^INSERT INTO\s+[`'"]?d1_migrations[`'"]?/i.test(t) ||
    /^INSERT INTO\s+[`'"]?sqlite_sequence[`'"]?/i.test(t)
  );
}

const raw = fs.readFileSync(inAbs, "utf8");
const lines = raw.split(/\r?\n/);
let dropped = 0;

const filtered = lines.filter((line) => {
  if (isBookkeepingInsert(line)) {
    dropped++;
    return false;
  }
  return true;
});

fs.mkdirSync(path.dirname(outAbs), { recursive: true });
fs.writeFileSync(outAbs, filtered.join("\n"), "utf8");
console.log(
  `Filtered D1 dump: dropped ${dropped} bookkeeping line(s) → ${path.relative(process.cwd(), outAbs)}`,
);
