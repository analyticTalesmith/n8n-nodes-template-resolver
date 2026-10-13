import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PackError, checkMarketplace, skillDescriptionWarnings, validatePack } from '../lib/pack.mjs';

/**
 * Validates a pack folder, and optionally its marketplace listing. Warnings never affect ok.
 * @param {string} packDir
 * @param {{ marketplace?: string }} [options]
 * @returns {{ ok: boolean, findings: import('./validate.mjs').Finding[], warnings: import('./validate.mjs').Finding[] }}
 */
export function packValidate(packDir, options = {}) {
  const { findings } = validatePack(packDir);
  if (options.marketplace) findings.push(...checkMarketplace(packDir, options.marketplace));
  return { ok: findings.length === 0, findings, warnings: skillDescriptionWarnings(packDir) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const USAGE = 'Usage: node pack-validate.mjs <packDir> [--marketplace <file>]';
  const usage = (detail) => {
    console.error(detail ? `${detail} ${USAGE}` : USAGE);
    process.exit(2);
  };
  const positional = [];
  let marketplace;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--marketplace') {
      marketplace = args[++i];
      if (marketplace === undefined || marketplace.startsWith('--')) usage('--marketplace requires a file.');
    } else if (arg.startsWith('--')) {
      usage(`Unknown option ${arg}.`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 1) usage(positional.length === 0 ? '' : 'Expected one pack directory.');
  try {
    const { findings, warnings } = packValidate(positional[0], { marketplace });
    for (const f of findings) console.log(`${f.rule}: ${f.message}`);
    for (const w of warnings) console.log(`warning: ${w.rule}: ${w.message}`);
    process.exit(findings.length === 0 ? 0 : 1);
  } catch (err) {
    // PackError and the library's plain "Cannot read" errors are unreadable input; anything else is a bug.
    if (err instanceof PackError || (err.constructor === Error && /^Cannot read /.test(err.message))) {
      console.error(err.message);
      process.exit(2);
    }
    throw err;
  }
}
