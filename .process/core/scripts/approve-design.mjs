import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { approveDesign, DesignApprovalError } from '../lib/design-approval.mjs';

const isMain = (() => {
  try { return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();

if (isMain) {
  const usage = 'Usage: node approve-design.mjs <projectDir> <cycle> --by <name>';
  const [projectDir, cycle, flag, by, ...extra] = process.argv.slice(2);
  if (!projectDir || !cycle || flag !== '--by' || !by || extra.length) {
    console.error(usage);
    process.exit(2);
  }
  try {
    const approval = approveDesign(resolve(projectDir), cycle, { by });
    for (const { hash, path } of approval.approves) console.log(`${hash} ${path}`);
    console.log(`design approved by ${approval.approved_by} on ${approval.approved_on}`);
  } catch (cause) {
    console.error(cause instanceof DesignApprovalError ? cause.message : `${cause.name}: ${cause.message}`);
    process.exit(1);
  }
}
