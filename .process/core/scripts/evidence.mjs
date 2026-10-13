import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolveProjectPath, resolveProjectRoots } from '../lib/project-roots.mjs';
import { readFrontmatter, readRecovered } from '../lib/frontmatter.mjs';
import { readDeltaRecords } from '../lib/delta.mjs';
import { evidenceReport } from '../lib/checks/evidence-cited.mjs';
import { readFileSync } from 'node:fs';

const USAGE = 'Usage: node evidence.mjs <projectDir> [<document>]';
const isMain = (() => {
  try { return process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();

if (isMain) {
  const [projectDir, document, ...extra] = process.argv.slice(2);
  const usage = () => { console.error(USAGE); process.exit(2); };
  if (!projectDir || extra.length || (document && (!/^docs\/living\/.+\.md$/.test(document) || document.includes('..') || document.includes('\\')))) usage();
  let roots;
  try { roots = resolveProjectRoots(projectDir); }
  catch { usage(); }
  if (document) {
    try {
      const data = readFrontmatter(readFileSync(resolveProjectPath(roots, document), 'utf8'));
      if (!readRecovered(data).recovered) usage();
    } catch { usage(); }
  }
  let records;
  try { records = readDeltaRecords(projectDir); }
  catch { records = []; }
  const { findings, notes } = evidenceReport({ projectDir, records, only: document });
  for (const { rule, path, message } of [...findings, ...notes]) console.log(`${rule} ${path}: ${message}`);
  if (findings.length) process.exitCode = 1;
}
