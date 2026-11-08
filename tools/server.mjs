import http from "node:http";
import { readFile } from "node:fs/promises";

const origin = "http://127.0.0.1:5500";
const types = { html: "text/html; charset=utf-8", css: "text/css", js: "text/javascript", png: "image/png", json: "application/json", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };

function fail(res, status, message) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: { message } }));
}

async function extract(req, res) {
  if (req.method !== "POST" || req.headers.origin !== origin) return fail(res, 403, "Origen o método no permitido.");
  if (!req.headers.authorization?.startsWith("Bearer ")) return fail(res, 401, "Falta la clave de OpenAI.");
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 8 * 1024 * 1024) return fail(res, 413, "El texto supera los 8 MB.");
    chunks.push(chunk);
  }
  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: req.headers.authorization, "Content-Type": "application/json" },
      redirect: "error",
      body: Buffer.concat(chunks),
      signal: AbortSignal.timeout(180000),
    });
    const data = await upstream.json();
    res.writeHead(upstream.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  } catch {
    fail(res, 502, "El servidor local no pudo obtener una respuesta de OpenAI. Compruebe la conexión y vuelva a intentar.");
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.headers.host !== "127.0.0.1:5500") return fail(res, 403, "Host no autorizado.");
    const pathname = new URL(req.url, origin).pathname;
    if (pathname === "/api/extract") return await extract(req, res);
    const file = pathname === "/" ? "/index.html" : pathname;
    if (req.method !== "GET" || !/^\/(?:index\.html|style\.css|(?:js|libs|templates|assets)\/[\w.-]+\.(?:js|png|json|docx))$/.test(file)) return fail(res, 404, "Recurso no encontrado.");
    const data = await readFile(new URL(".." + file, import.meta.url));
    res.writeHead(200, { "Content-Type": types[file.split(".").pop()] });
    res.end(data);
  } catch (err) {
    fail(res, err.code === "ENOENT" ? 404 : 500, "No se pudo atender la solicitud local.");
  }
});
server.on("error", err => {
  console.error(err.code === "EADDRINUSE" ? "El puerto 5500 está ocupado. Cierre Live Server antes de iniciar DispoGen." : err.message);
  process.exitCode = 1;
});
server.listen(5500, "127.0.0.1", () => console.log("DispoGen disponible en " + origin));
