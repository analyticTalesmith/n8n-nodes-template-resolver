import * as http from "http";

export interface ServerOptions {
  limits?: Partial<{ maxIterations: number; maxOutputChars: number; maxDepth: number }>;
  tokenEstimator?: (text: string) => number;
  maxBodyBytes?: number;
}

/** Signature-only stub: answers every request 501 with an empty body. */
export function createServer(_options?: ServerOptions): http.Server {
  return http.createServer((_req, res) => {
    res.statusCode = 501;
    res.end();
  });
}

export function listen(
  server: http.Server,
  port = 0,
  host = "127.0.0.1"
): Promise<{ port: number; host: string }> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const addr = server.address() as { port: number };
      resolve({ port: addr.port, host });
    });
  });
}
