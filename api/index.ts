import * as http from "http";

export { createServer } from "./server";
export type { ServerOptions } from "./server";
export { routes } from "./routes";

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
