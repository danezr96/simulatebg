import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EXTS = new Set([".ts", ".tsx", ".sql", ".css", ".md"]);

const PATTERNS = [
  /temporary/i,
  /placeholder/i,
  /\bstub\b/i,
  /\bTODO\b/i,
  /uuid\s*\(temporary\)/i,
  /\bas any\b/,
  /ts-ignore/i,
  /Math\.random\s*\(/ // 🔒 determinisme-killer
];

const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  ".vite",
  ".git"
]);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (!IGNORE_DIRS.has(ent.name)) {
        walk(path.join(dir, ent.name), out);
      }
    } else {
      const ext = path.extname(ent.name);
      if (EXTS.has(ext)) {
        out.push(path.join(dir, ent.name));
      }
    }
  }
  return out;
}

let hits = 0;

for (const file of walk(ROOT)) {
  const txt = fs.readFileSync(file, "utf8");
  const lines = txt.split(/\r?\n/);

  lines.forEach((line, i) => {
    if (PATTERNS.some((re) => re.test(line))) {
      hits++;
      console.error(`${file}:${i + 1}: ${line.trim()}`);
    }
  });
}

if (hits > 0) {
  console.error(`\n❌ Placeholder gate failed: ${hits} hit(s).`);
  process.exit(1);
}

console.log("✅ No placeholders found.");
