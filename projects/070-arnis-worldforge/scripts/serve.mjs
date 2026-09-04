import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..", "demo");
const port = Number(process.env.PORT || 4173);
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"]
]);

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const candidate = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (!candidate.startsWith(`${root}${path.sep}`)) throw new Error("outside root");
    const info = await stat(candidate);
    if (!info.isFile()) throw new Error("not a file");
    response.writeHead(200, { "Content-Type": types.get(path.extname(candidate)) || "application/octet-stream" });
    createReadStream(candidate).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Arnis World Forge: http://127.0.0.1:${port}`);
});
