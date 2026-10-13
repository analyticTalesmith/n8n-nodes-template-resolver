'use strict';

const esc = (s) => String(s).replace(/[\\#]/g, '\\$&');
const quote = (s) => `'${String(s).replace(/'/g, "''")}'`;

function isAssertion(t) {
  const details = t.failureDetails || [];
  const first = (t.failureMessages && t.failureMessages[0]) || '';
  return (
    details.some((d) => d && (d.matcherResult || d.name === 'JestAssertionError' || d.code === 'ERR_ASSERTION')) ||
    /^(JestAssertionError|AssertionError)/.test(first) ||
    /^\s*(Error: )?expect\(/.test(first)
  );
}

class JestTapReporter {
  constructor() {
    this.n = 0;
    this.pass = 0;
    this.fail = 0;
  }

  onRunStart() {
    process.stdout.write('TAP version 13\n');
  }

  onTestResult(_test, result) {
    const out = [];
    for (const t of result.testResults) {
      const name = esc(t.ancestorTitles.concat(t.title).join(' '));
      this.n += 1;
      if (t.status === 'passed') {
        this.pass += 1;
        out.push(`ok ${this.n} - ${name}`);
      } else if (t.status === 'failed') {
        this.fail += 1;
        const first = ((t.failureMessages && t.failureMessages[0]) || 'failed')
          .replace(/\u001b\[[0-9;]*m/g, '')
          .split('\n')[0];
        out.push(`not ok ${this.n} - ${name}`, '  ---', `  error: ${quote(first)}`);
        out.push(isAssertion(t) ? '  code: ERR_ASSERTION' : "  failureType: 'testCodeFailure'", '  ...');
      } else {
        out.push(`ok ${this.n} - ${name} # SKIP`);
      }
    }
    if (out.length) process.stdout.write(out.join('\n') + '\n');
  }

  onRunComplete() {
    process.stdout.write(`1..${this.n}\n# pass ${this.pass}\n# fail ${this.fail}\n`);
  }
}

module.exports = JestTapReporter;
