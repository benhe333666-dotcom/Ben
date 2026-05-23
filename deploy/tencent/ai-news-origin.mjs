import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.env.APP_DIR || "/opt/ai-news-site", "dist");
const port = Number.parseInt(process.env.ORIGIN_PORT || "8787", 10);
const host = process.env.ORIGIN_HOST || "127.0.0.1";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

const resolveFile = (pathname) => {
  const decoded = decodeURIComponent(pathname.split("?")[0] || "/");
  const safePath = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const requested = resolve(join(root, safePath));
  if (!requested.startsWith(root)) return join(root, "index.html");
  if (existsSync(requested) && statSync(requested).isFile()) return requested;
  return join(root, "index.html");
};

createServer((request, response) => {
  const file = resolveFile(request.url || "/");
  const extension = extname(file);
  const headers = {
    "Content-Type": mimeTypes[extension] || "application/octet-stream"
  };

  response.writeHead(200, headers);
  createReadStream(file).pipe(response);
}).listen(port, host, () => {
  console.log(`AI news origin listening on http://${host}:${port}`);
});
