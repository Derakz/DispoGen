import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import JSZip from "jszip";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const TEMPLATES_DIR = path.join(ROOT, "templates");

const PLACEHOLDER_RE = /<<\s*([a-zA-Z0-9_]+)\s*>>/g;

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function getRenderableXmlParts(zipBuffer) {
  const zip = await JSZip.loadAsync(zipBuffer);
  const names = Object.keys(zip.files).filter((name) =>
    /^word\/(document|header\d+|footer\d+)\.xml$/.test(name)
  );

  const parts = [];
  for (const name of names) {
    const text = await zip.file(name).async("string");
    parts.push({ name, text });
  }
  return parts;
}

function extractUnresolvedPlaceholders(text) {
  const unresolved = [];
  let match;
  while ((match = PLACEHOLDER_RE.exec(text)) !== null) {
    unresolved.push(match[1]);
  }
  return [...new Set(unresolved)].sort();
}

function buildPayload(fields = []) {
  const out = {};
  for (const field of fields) {
    out[field] = `VAL_${field}`;
  }
  return out;
}

async function main() {
  // Browser shims needed by libs/pizzip.min.js and libs/docxtemplater.js
  globalThis.window = globalThis.window || {};
  globalThis.window.navigator = globalThis.window.navigator || { userAgent: "node" };
  if (!("navigator" in globalThis)) {
    Object.defineProperty(globalThis, "navigator", {
      value: globalThis.window.navigator,
      configurable: true,
    });
  }

  const require = createRequire(import.meta.url);
  const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");
  globalThis.window.DOMParser = DOMParser;
  globalThis.window.XMLSerializer = XMLSerializer;

  require(path.join(ROOT, "libs", "pizzip.min.js"));
  require(path.join(ROOT, "libs", "docxtemplater.js"));

  const PizZip = globalThis.window.PizZip;
  const Docxtemplater = globalThis.window.docxtemplater;

  if (!PizZip || !Docxtemplater) {
    throw new Error("No se pudieron cargar PizZip/docxtemplater desde /libs");
  }

  const catalog = loadJson(path.join(TEMPLATES_DIR, "catalog.json"));
  const fieldsByTemplateId = loadJson(path.join(TEMPLATES_DIR, "fields.generated.json"));

  const failures = [];
  let total = 0;

  for (const group of Object.values(catalog)) {
    for (const tpl of group.plantillas || []) {
      total += 1;
      const fieldsInfo = fieldsByTemplateId[tpl.id];
      if (!fieldsInfo) {
        failures.push(`[${tpl.id}] no existe en fields.generated.json`);
        continue;
      }

      const fileName = tpl.file.startsWith("templates/")
        ? tpl.file.replace(/^templates\//, "")
        : tpl.file;
      const docxPath = path.join(TEMPLATES_DIR, fileName);

      if (!fs.existsSync(docxPath)) {
        failures.push(`[${tpl.id}] falta DOCX: ${docxPath}`);
        continue;
      }

      const templateBuffer = fs.readFileSync(docxPath);
      const zip = new PizZip(templateBuffer);

      const payload = buildPayload(fieldsInfo.fields || []);

      let renderedBuffer;
      try {
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          delimiters: { start: "<<", end: ">>" },
          nullGetter() {
            return "";
          },
        });
        doc.setData(payload);
        doc.render();
        renderedBuffer = doc.getZip().generate({ type: "nodebuffer" });
      } catch (err) {
        failures.push(`[${tpl.id}] error renderizando: ${err.message}`);
        continue;
      }

      const xmlParts = await getRenderableXmlParts(renderedBuffer);
      const unresolved = new Set();
      for (const part of xmlParts) {
        for (const token of extractUnresolvedPlaceholders(part.text)) {
          unresolved.add(token);
        }
      }

      if (unresolved.size > 0) {
        failures.push(
          `[${tpl.id}] placeholders sin resolver: ${[...unresolved].join(", ")}`
        );
      }
    }
  }

  if (failures.length) {
    console.error(`FAIL: ${failures.length} problemas en ${total} plantillas`);
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }

  console.log(`OK: ${total} plantillas renderizadas y sin placeholders pendientes`);
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
