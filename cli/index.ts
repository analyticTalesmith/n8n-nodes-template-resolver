#!/usr/bin/env node
import { main } from "./main";

const shutdown = new AbortController();
const stop = () => shutdown.abort();
process.once("SIGINT", stop);
process.once("SIGTERM", stop);

void main(process.argv.slice(2), {
  readStdin: async () => {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString("utf8");
  },
  stdout: (text) => void process.stdout.write(text),
  stderr: (text) => void process.stderr.write(text),
  signal: shutdown.signal,
}).then((code) => {
  process.off("SIGINT", stop);
  process.off("SIGTERM", stop);
  process.exitCode = code;
});
