/**************************************
 * UTILIDADES
 **************************************/
export function aFormatoTitulo(t) {
  return t
    ? t
        .toLowerCase()
        .split(" ")
        .filter((p) => p)
        .map((p) => p[0].toUpperCase() + p.slice(1))
        .join(" ")
    : "";
}

export function mesNumeroATexto(mes) {
  const meses = {
    "1": "enero",
    "2": "febrero",
    "3": "marzo",
    "4": "abril",
    "5": "mayo",
    "6": "junio",
    "7": "julio",
    "8": "agosto",
    "9": "septiembre",
    "10": "octubre",
    "11": "noviembre",
    "12": "diciembre",
  };
  const alias = {
    setiembre: "septiembre",
    sept: "septiembre",
  };

  const raw = String(mes ?? "").trim().toLowerCase();
  if (!raw) return "";

  // Acepta tanto numero ("3", "03") como texto ("marzo").
  const asNum = String(parseInt(raw, 10));
  if (meses[asNum]) return meses[asNum];

  if (alias[raw]) return alias[raw];

  const nombreMeses = new Set(Object.values(meses));
  return nombreMeses.has(raw) ? raw : "";
}

export function fechaLargaPeru(d = new Date()) {
  const m = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${d.getDate()} de ${m[d.getMonth()]} de ${d.getFullYear()}`;
}

export function esTextoInstitucional(val) {
  if (!val) return false;

  const texto = val.toUpperCase();

  // Conjunto ampliado para evitar falsos vacios de campos institucionales.
  const patronesValidos = [
    "OFICIO",
    "FISCALIA",
    "FISCALIA",
    "FISCALIA",
    "COMISARIA",
    "COMISARIA",
    "PNP",
    "DESPACHO",
    "MINISTERIO PUBLICO",
    "MP-FN",
    "DIRINCRI",
    "DIVISION",
    "DIVISION",
    "DEPARTAMENTO",
    "UNIDAD",
    "SECCION",
    "DIVPOL",
    "DEPINCRI",
    "JEFATURA",
    "INFORME",
    "ATESTADO",
    "PARTE",
    "CARPETA FISCAL",
  ];

  return patronesValidos.some((p) => texto.includes(p));
}

function normalizarEspacios(t) {
  return t.replace(/\s+/g, " ").trim();
}

function esLineaRuido(linea) {
  if (!linea) return true;

  const l = linea.trim();
  if (!l) return true;

  if (/^pagina\s+\d+\s+de\s+\d+$/i.test(l)) return true;
  if (/^\d{1,2}$/.test(l)) return true;
  if (/^[-_=~.]{3,}$/.test(l)) return true;

  const charsUtiles = (l.match(/[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ]/g) || []).length;
  const ratioUtil = charsUtiles / l.length;

  // Descarta lineas con muy poco contenido alfanumerico.
  if (l.length >= 12 && ratioUtil < 0.3) return true;

  return false;
}

function claveDedupeLinea(linea) {
  return linea
    .toLowerCase()
    .replace(/\d+/g, "#")
    .replace(/[^\wáéíóúüñ# ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function recortarTextoLargo(texto, maxChars = 36000) {
  if (texto.length <= maxChars) return texto;

  const head = texto.slice(0, Math.floor(maxChars * 0.7));
  const tail = texto.slice(-Math.floor(maxChars * 0.3));

  return `${head}\n\n[... contenido intermedio omitido para reducir ruido ...]\n\n${tail}`;
}

export function limpiarTextoParaExtractor(raw) {
  const entrada = String(raw ?? "");
  if (!entrada.trim()) return "";

  const texto = entrada
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00A0]+/g, " ");

  const lineas = texto.split("\n").map((l) => normalizarEspacios(l));

  const vistas = new Map();
  const salida = [];

  for (const linea of lineas) {
    if (esLineaRuido(linea)) continue;

    const clave = claveDedupeLinea(linea);
    if (!clave) continue;

    const repeticiones = vistas.get(clave) || 0;
    vistas.set(clave, repeticiones + 1);

    // Mantiene la primera aparicion; evita encabezados/pies repetidos.
    if (repeticiones > 0 && linea.length <= 160) continue;

    salida.push(linea);
  }

  const limpio = salida.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return recortarTextoLargo(limpio);
}
