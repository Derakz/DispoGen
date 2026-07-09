/**************************************
 * PDF -> TEXTO
 **************************************/
const pdfInput = document.getElementById("pdfInput");
const caseInput = document.getElementById("caseInput");
const estado = document.getElementById("estado");

function pageItemsToLines(items) {
  const toleranceY = 2;

  const parts = items
    .map((it) => ({
      text: String(it.str || "").trim(),
      x: Number(it.transform?.[4] || 0),
      y: Number(it.transform?.[5] || 0),
    }))
    .filter((p) => p.text);

  // Orden visual aproximado: arriba->abajo y dentro de cada linea izquierda->derecha.
  parts.sort((a, b) => {
    if (Math.abs(a.y - b.y) > toleranceY) return b.y - a.y;
    return a.x - b.x;
  });

  const lines = [];
  for (const p of parts) {
    const last = lines[lines.length - 1];
    if (!last || Math.abs(last.y - p.y) > toleranceY) {
      lines.push({ y: p.y, parts: [p] });
    } else {
      last.parts.push(p);
    }
  }

  return lines
    .map((line) => line.parts.sort((a, b) => a.x - b.x).map((p) => p.text).join(" "))
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

pdfInput.addEventListener("change", async () => {
  const file = pdfInput.files[0];
  if (!file) return;

  estado.textContent = "📄 Procesando PDF...";
  const reader = new FileReader();

  reader.onload = async () => {
    const pdf = await pdfjsLib.getDocument(new Uint8Array(reader.result)).promise;
    const pages = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(pageItemsToLines(content.items));
    }

    caseInput.value = pages.join("\n\n");
    estado.textContent = "✅ PDF cargado correctamente.";
  };

  reader.readAsArrayBuffer(file);
});
