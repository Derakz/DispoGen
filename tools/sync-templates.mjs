// tools/sync-templates.mjs
import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

const ROOT = process.cwd();
const TEMPLATES_DIR = path.join(ROOT, "templates");
const CATALOG_PATH = path.join(TEMPLATES_DIR, "catalog.json");

const OUT_FIELDS_JSON = path.join(TEMPLATES_DIR, "fields.generated.json");
const OUT_FIELDS_JS = path.join(ROOT, "js", "fields.generated.js");

const PLACEHOLDER_RE = /<<\s*([a-zA-Z0-9_]+)\s*>>/g;

const parser = new XMLParser({
  ignoreAttributes: false,
  // evita que fast-xml-parser te cambie demasiado la estructura
  preserveOrder: true,
});

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function uniq(arr) {
  return [...new Set(arr)].sort();
}

function safeReadFile(bufferZip, internalPath) {
  const f = bufferZip.file(internalPath);
  if (!f) return null;
  return f.async("string");
}

// Extrae todo el texto de los nodos w:t (en orden)
// Para capturar placeholders partidos en runs.
function extractTextFromPreserveOrderXml(preserveOrder) {
  let text = "";

  function walk(node) {
    if (Array.isArray(node)) {
      for (const n of node) walk(n);
      return;
    }
    if (node && typeof node === "object") {
      // node formato preserveOrder: [{ "w:t": [ { "#text": "..." } ] }]
      for (const [k, v] of Object.entries(node)) {
        if (k === "w:t") {
          // v suele ser array
          if (Array.isArray(v)) {
            for (const item of v) {
              if (item && typeof item === "object" && "#text" in item) {
                text += String(item["#text"]);
              } else if (typeof item === "string") {
                text += item;
              }
            }
          }
        } else {
          walk(v);
        }
      }
    }
  }

  walk(preserveOrder);
  return text;
}

function extractPlaceholdersFromText(text) {
  const found = [];
  let m;
  while ((m = PLACEHOLDER_RE.exec(text)) !== null) {
    found.push(m[1]);
  }
  return uniq(found);
}

async function extractPlaceholdersFromDocx(docxPath) {
  const buf = fs.readFileSync(docxPath);
  const zip = await JSZip.loadAsync(buf);

  const candidates = [];

  // documento principal
  candidates.push("word/document.xml");

  // headers/footers (pueden existir varios)
  for (const fname of Object.keys(zip.files)) {
    if (/^word\/header\d+\.xml$/.test(fname)) candidates.push(fname);
    if (/^word\/footer\d+\.xml$/.test(fname)) candidates.push(fname);
  }

  const allFields = [];

  for (const internal of candidates) {
    const xmlStr = await safeReadFile(zip, internal);
    if (!xmlStr) continue;

    // parse preserve order
    const parsed = parser.parse(xmlStr);
    const text = extractTextFromPreserveOrderXml(parsed);

    const fields = extractPlaceholdersFromText(text);
    for (const f of fields) allFields.push(f);
  }

  return uniq(allFields);
}

async function main() {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(`No existe ${CATALOG_PATH}`);
  }

  const catalog = readJson(CATALOG_PATH);
  const output = {};

  // catalog: { fraude: { plantillas: [{id,label,file}...] }, ... }
  for (const [grupoKey, grupo] of Object.entries(catalog)) {
    for (const p of (grupo.plantillas || [])) {
      const fileName = p.file?.startsWith("templates/")
        ? p.file.replace(/^templates\//, "")
        : p.file;

      const docxPath = path.join(TEMPLATES_DIR, fileName);

      if (!fs.existsSync(docxPath)) {
        console.warn(`⚠️ Falta DOCX: ${docxPath}`);
        output[p.id] = { file: p.file, fields: [], missing: true };
        continue;
      }

      const fields = await extractPlaceholdersFromDocx(docxPath);
      output[p.id] = { file: p.file, fields, missing: false };
      console.log(`✅ ${p.id}: ${fields.length} fields`);
    }
  }

  fs.writeFileSync(OUT_FIELDS_JSON, JSON.stringify(output, null, 2), "utf-8");

  const js = `// AUTO-GENERATED. NO EDITAR A MANO.
// Generado por tools/sync-templates.mjs
export const TEMPLATE_FIELDS = ${JSON.stringify(output, null, 2)};
`;
  fs.writeFileSync(OUT_FIELDS_JS, js, "utf-8");

  console.log("\n🎉 Generado:");
  console.log(" -", path.relative(ROOT, OUT_FIELDS_JSON));
  console.log(" -", path.relative(ROOT, OUT_FIELDS_JS));
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
