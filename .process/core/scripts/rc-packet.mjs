import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardError } from '../lib/board.mjs';
import { RcPacketError, composeRcPacket, writeRcPacket } from '../lib/rc-packet.mjs';

export { RcPacketError, composeRcPacket, writeRcPacket };

const isMain = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const USAGE = 'Usage: node rc-packet.mjs <projectDir> <cycle> [--force]  (writes verification/rc-packet.md in the cycle)';
  const usage = (message) => {
    console.error(`${message} ${USAGE}`);
    process.exit(2);
  };
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const positional = args.filter((arg) => arg !== '--force');
  if (positional.some((arg) => arg.startsWith('--'))) usage('Unknown option.');
  if (positional.length !== 2) usage('Expected a project directory and a cycle name.');
  try {
    const result = writeRcPacket(resolve(positional[0]), positional[1], { force });
    console.log(`Wrote ${result.path}. A person reads it with the close review.`);
  } catch (err) {
    if (err instanceof RcPacketError || err instanceof BoardError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}
