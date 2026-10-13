import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkPrText } from '../lib/checks/no-ids.mjs';

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE = 'Usage: node pr-text.mjs <file> (a UTF-8 file: the title on line 1, then the body)';
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error(`Expected one file. ${USAGE}`);
    process.exit(2);
  }
  let text;
  try {
    text = readFileSync(args[0], 'utf8');
  } catch (cause) {
    console.error(`Cannot read ${args[0]} (${cause.message}). ${USAGE}`);
    process.exit(2);
  }
  const findings = checkPrText(text);
  if (findings.length === 0) {
    console.log('PR text has no ids');
  } else {
    for (const { rule, message } of findings) console.error(`${rule}: ${message}`);
    process.exit(1);
  }
}
