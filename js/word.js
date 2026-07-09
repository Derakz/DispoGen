
/**************************************
 * GENERADOR WORD
 **************************************/
export async function generarWord(datos, template, nombreArchivo) {
  const response = await fetch(template);
  const content = await response.arrayBuffer();

  const zip = new PizZip(content);
  const doc = new docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "<<", end: ">>" },
    nullGetter() {
    return ""; // <- BLINDAJE TOTAL: cualquier <<campo>> faltante = ""
  }
  });

  doc.setData(datos);
  doc.render();

  const blob = doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });

  saveAs(blob, nombreArchivo);
}
