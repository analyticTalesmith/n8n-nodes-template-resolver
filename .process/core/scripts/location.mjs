import { resolveProjectRoots } from '../lib/project-roots.mjs';

export function location(projectDir) {
  const roots = resolveProjectRoots(projectDir);
  return `mode: ${roots.mode}\ncheckout: ${roots.checkoutRoot}\ndocs: ${roots.docsRoot}`;
}

if (process.argv[1]?.endsWith('location.mjs')) {
  if (process.argv.length !== 3) {
    console.error('Usage: node .process/core/scripts/location.mjs <projectDir>');
    process.exitCode = 2;
  } else {
    try {
      console.log(location(process.argv[2]));
    } catch (error) {
      console.error(`${error.rule ?? 'location-error'}: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
