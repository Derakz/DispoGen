/**************************************
 * EXTRACTOR IA
 **************************************/
import { OPENAI_MODEL } from "./config.js";

function limpiarJSON(respuesta) {
  return (respuesta || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function safeParseJSON(raw) {
  const cleaned = limpiarJSON(raw);
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // ayuda para depurar cuando la IA responde mal
    console.error("❌ JSON inválido devuelto por IA:", cleaned);
    throw new Error("La IA devolvió un JSON inválido. Revisa consola.");
  }
}

/** Llama a OpenAI Chat Completions y devuelve content */
async function callOpenAI({ apiKey, prompt }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("❌ Error OpenAI:", data);
    throw new Error(
      data?.error?.message || "Error al llamar a OpenAI (ver consola)."
    );
  }

  const content = data?.choices?.[0]?.message?.content || "";
  return content;
}

/**************************************
 * PROMPT BASE (GENERAL)
 **************************************/
function construirPromptExtractor(texto) {
  return `
TAREA:
Analiza el texto proporcionado y EXTRAe únicamente la información solicitada.

FORMATO DE SALIDA (OBLIGATORIO):
Devuelve EXCLUSIVAMENTE un objeto JSON válido con la siguiente estructura:

{
  "caso": "",
  "agraviado": "",
  "remitente": "",
  "oficio": "",
  "mes_hecho": "",
  "anio_hecho": "",
  "monto": "",
  "hechos": "",
  "parrafo_hurto": "",
  "hechos_hurto": "",
  "hechos_fraude": "",
  "referencia_acta": "",
  "motivo_desistimiento": ""
}

REGLAS GENERALES (OBLIGATORIAS):
- NO inventes información.
- Si un dato no aparece de forma clara y expresa, devuelve "".
- Usa lenguaje formal, objetivo e impersonal.
- NO incluyas conclusiones, calificación jurídica ni valoraciones.
- NO completes información faltante con suposiciones.
- NO reformules creativamente el contenido.

REGLAS ABSOLUTAS PARA "REMITENTE" Y "OFICIO":
- NUNCA uses nombres de personas naturales (fiscales, policías, denunciantes).
- SOLO se admiten entidades institucionales (Fiscalías, Comisarías, Unidades PNP).
- El campo "oficio" debe contener un IDENTIFICADOR INSTITUCIONAL
  (ej.: "Oficio N.° 123-2024-MP-FN", "Oficio N.° 456-2024-DIRINCRI").

JERARQUÍA OBLIGATORIA PARA DETERMINAR REMITENTE Y OFICIO:

1) DERIVACIÓN O INHIBICIÓN FISCAL  
Si en el texto aparecen expresiones como:
- "se inhibe"
- "inhibición"
- "derivación"
- "derívese"
- "remítase"
- "por competencia"
- "declara su incompetencia"

ENTONCES:
- "remitente": la FISCALÍA que remite el caso (nombre institucional completo).
- "oficio": el OFICIO DE DERIVACIÓN emitido por dicha fiscalía.
- Ignora cualquier oficio policial si existe derivación fiscal.

2) DENUNCIA POLICIAL DIRECTA (SIN DERIVACIÓN FISCAL)
Si NO existe ninguna derivación o inhibición fiscal:
- "remitente": la COMISARÍA PNP denunciante.
- "oficio": el OFICIO POLICIAL con el que se remite la denuncia.

3) CASOS INCIERTOS
- Si no puedes identificar con certeza el remitente u oficio institucional,
  devuelve "" en dichos campos.

REGLAS ESTRICTAS PARA "HECHOS":
- Redacta los hechos de manera OBJETIVA, CLARA y SECUENCIAL.
- Limítate EXCLUSIVAMENTE a lo narrado en la denuncia o documento.
- NO agregues inferencias, explicaciones ni contexto adicional.
- Mantén el orden cronológico original.
- Usa fechas, montos y actos concretos SOLO si están expresamente indicados.
- Si un hecho no es claro o está incompleto, NO lo desarrolles.

CAMPO: "parrafo_hurto"
OBJETIVO:
Redacta el contenido de "parrafo_hurto" siguiendo MUY DE CERCA la estructura, conectores y tono del modelo.

MODELO (referencial de estructura):
"Ahora bien, de los hechos denunciados se tiene que la sustracción de los bienes habría ocurrido mientras que la denunciante se encontraba en [contexto/lugar referido]. Sin embargo, conforme a su propia narración, no es posible determinar con certeza el momento exacto ni las circunstancias específicas en que se produjo la sustracción, dado que solo tomó conocimiento del hecho al [acto de verificación] cuando [situación posterior]. A ello se suma que no existe ningún elemento de convicción que acredite objetivamente la forma en que ocurrió el hurto, ni que permita establecer la identidad o individualización del presunto autor, si consideramos la fecha del suceso ([fecha])".

REGLAS OBLIGATORIAS:
1) Devuelve un ÚNICO párrafo, en español formal, impersonal y estilo fiscal.
2) NO inventes hechos. Todo debe desprenderse del texto analizado.
3) Si el texto NO permite afirmar un lugar/contexto, usa redacción neutra.
4) Mantén lenguaje hipotético: “habría ocurrido”.
5) Incluye en este orden 4 ideas:
   A. Contexto donde habría ocurrido la sustracción.
   B. Imposibilidad de determinar momento exacto/circunstancias (por la propia narración).
   C. Cómo tomó conocimiento del hecho (según texto).
   D. Ausencia de elementos objetivos y dificultad de individualizar al autor.
6) Sobre la fecha:
   - Si hay fecha clara, inclúyela al final entre paréntesis.
   - Si no hay fecha clara: “si consideramos la fecha del suceso, la cual no ha sido posible precisar”.
7) Prohibido: artículos de ley, tipicidad, calificación jurídica, cosas no mencionadas.
8) Si NO hay sustracción/hurto, devuelve "parrafo_hurto": "".

REGLAS ESPECÍFICAS PARA "hechos_hurto" y "hechos_fraude":
- Resúmenes OBJETIVOS, CLAROS y SECUENCIALES.
- "hechos_hurto": solo sustracción/pérdida/apoderamiento de bienes.
- "hechos_fraude": solo consumos no reconocidos, transferencias, cargos, operaciones financieras, engaño con disposición patrimonial.
- Si no hay hechos claros: devuelve "".
- No repitas todo "hechos"; selecciona solo lo pertinente.

referencia_acta:
- Frase corta tipo: "de fecha 23 de diciembre de 2025 (fs. 05)".
- Si solo fecha: "de fecha 23 de diciembre de 2025".
- Si no aparece acta fiscal de llamada: "".
- No inventar.

motivo_desistimiento:
- Una sola frase (sin comillas) del motivo por el que no continúa.
- Si no aparece motivo claro: "".
- No inventar.

TEXTO A ANALIZAR:
${texto}
`.trim();
}

/**************************************
 * PROMPT ESTafa (solo cuando se necesite)
 **************************************/
function construirPromptEstafa(texto) {
  return `
TAREA:
A partir de los hechos proporcionados, desarrolla elementos del delito de estafa
en estilo fiscal, de manera concreta y vinculada al caso.

DEVUELVE EXCLUSIVAMENTE un JSON válido con esta estructura:
{
  "estafa_engaño": "",
  "estafa_error": "",
  "estafa_dp": "",
  "estafa_pp": "",
  "parrafo_calificacion_estafa": "",
  "aplicacion_factual_estafa": "",
  "fundamento_competencia_territorial": "",
  "lugar_competencia": ""
}

REGLAS OBLIGATORIAS:
- NO inventes hechos ni nombres.
- Si un elemento NO se aprecia con claridad, devuelve "" en ese campo.
- Redacción formal, impersonal y fiscal.
- No cites doctrina ni jurisprudencia.
- No uses viñetas dentro de los campos.
- Cada campo: párrafo corto (2 a 5 líneas), directo y aplicable.

CRITERIOS:
1) estafa_engaño: maniobra engañosa concreta usada.
2) estafa_error: creencia errónea inducida y por qué actúa.
3) estafa_dp: acto de disposición (depósito/transferencia/etc.) solo si está narrado.
4) estafa_pp: perjuicio y provecho ilícito; si hubo devolución bancaria, solo si aparece.

5) parrafo_calificacion_estafa:
Devuelve EXCLUSIVAMENTE un texto en lenguaje jurídico-fiscal, redactado en un solo párrafo, sin numeración ni viñetas.
REGLAS OBLIGATORIAS:
- Usa redacción formal, impersonal y objetiva.
- No inventes hechos ni nombres.
- No cites doctrina ni jurisprudencia.
- Solo menciona artículos del Código Penal si aparecen expresamente en el texto base.
- No afirmes categóricamente delitos si el texto no lo permite.
- Si corresponde descartar tipos penales, explica brevemente el motivo.
- El párrafo debe poder insertarse directamente en una disposición fiscal sin correcciones.
CRITERIO DE ANÁLISIS:
- Determina si el engaño tuvo por finalidad obtener datos, acceder a sistemas o vulnerar información.
- Evalúa si el uso de plataformas virtuales fue instrumental o constitutivo del delito.
- Concluye si los hechos configuran una estafa convencional u otro tipo penal, siempre que ello se desprenda del texto.

6) aplicacion_factual_estafa:
TAREA:
Redacta un breve párrafo de aplicación fáctica que describa cómo, en el caso concreto, la víctima realizó voluntariamente una disposición patrimonial como consecuencia del engaño sufrido.
FORMATO DE SALIDA (OBLIGATORIO):
Devuelve EXCLUSIVAMENTE un texto redactado en uno o dos enunciados, en lenguaje jurídico-fiscal, sin numeración ni viñetas.
REGLAS OBLIGATORIAS:
- Usa redacción formal, impersonal y objetiva.
- No inventes nombres, montos ni medios de pago.
- Si aparecen montos o números, consérvalos fielmente.
- Describe solo la disposición patrimonial voluntaria y la creencia inducida.
- No califiques jurídicamente ni cites artículos.
- Si no se puede identificar la disposición patrimonial, devuelve "".

7) fundamento_competencia_territorial:
TAREA:
Redacta un párrafo de fundamento de competencia territorial conforme al lugar donde se realizó la disposición patrimonial, exclusivamente a partir del texto proporcionado.
FORMATO DE SALIDA (OBLIGATORIO):
Devuelve EXCLUSIVAMENTE un texto redactado en un solo párrafo, en lenguaje jurídico-fiscal, sin numeración ni viñetas.
REGLAS OBLIGATORIAS:
- Usa redacción formal, impersonal y objetiva.
- No inventes direcciones, distritos ni montos.
- Si el texto solo permite identificar el distrito, limita la redacción a ese nivel.
- Describe el lugar donde se realizó la disposición patrimonial (depósito, transferencia, pago).
- Vincula el lugar con la determinación de la competencia territorial.
- No menciones la Mesa Única de Partes ni el acto de remisión.
- Si no se puede determinar el lugar con claridad, devuelve "".

8) lugar_competencia:
- Devuelve SOLO el distrito/provincia/lugar de referencia territorial del acto de disposición patrimonial.
- Si no se puede identificar con claridad, devuelve "".

TEXTO A ANALIZAR:
${texto}
`.trim();
}

/**************************************
 * Decide si se requiere bloque estafa
 **************************************/
function necesitaBloqueEstafa(requiredFields = []) {
  const keys = new Set(requiredFields || []);
  const estafaKeys = [
    "estafa_engaño",
    "estafa_error",
    "estafa_dp",
    "estafa_pp",
    "parrafo_calificacion_estafa",
    "aplicacion_factual_estafa",
    "fundamento_competencia_territorial",
    "lugar_competencia",
  ];
  return estafaKeys.some((k) => keys.has(k));
}

function mergePreferirNoVacio(base = {}, extra = {}, keys = []) {
  const out = { ...base };
  for (const k of keys) {
    const valExtra = (extra?.[k] ?? "").toString().trim();
    if (valExtra) out[k] = extra[k];
    else if (!(k in out)) out[k] = "";
  }
  return out;
}

/**************************************
 * EXPORT PRINCIPAL
 * ejecutarExtractor(texto, requiredFields)
 **************************************/
export async function ejecutarExtractor(texto, requiredFields = []) {
  let apiKey = localStorage.getItem("openai_api_key");
  if (!apiKey) {
    apiKey = prompt("Ingrese su API Key de OpenAI");
    if (!apiKey) throw new Error("API Key requerida");
    localStorage.setItem("openai_api_key", apiKey.trim());
  }
  apiKey = apiKey.trim();

  // 1) Base extraction
  const contentBase = await callOpenAI({
    apiKey,
    prompt: construirPromptExtractor(texto),
  });
  const datosBase = safeParseJSON(contentBase);

  // asegura que existan llaves mínimas (por si la IA omite)
  const baseDefaults = {
    caso: "",
    agraviado: "",
    remitente: "",
    oficio: "",
    mes_hecho: "",
    anio_hecho: "",
    monto: "",
    hechos: "",
    parrafo_hurto: "",
    hechos_hurto: "",
    hechos_fraude: "",
    referencia_acta: "",
    motivo_desistimiento: "",
  };

  let resultado = { ...baseDefaults, ...(datosBase || {}) };

  // 2) Estafa block (solo si la plantilla lo pide)
  if (necesitaBloqueEstafa(requiredFields)) {
    const contentEstafa = await callOpenAI({
      apiKey,
      prompt: construirPromptEstafa(texto),
    });
    const datosEstafa = safeParseJSON(contentEstafa);

    const estafaKeys = [
      "estafa_engaño",
      "estafa_error",
      "estafa_dp",
      "estafa_pp",
      "parrafo_calificacion_estafa",
      "aplicacion_factual_estafa",
      "fundamento_competencia_territorial",
      "lugar_competencia",
    ];

    resultado = mergePreferirNoVacio(resultado, datosEstafa, estafaKeys);

    // por si no vinieron nunca
    for (const k of estafaKeys) {
      if (!(k in resultado)) resultado[k] = "";
    }
  }

  return resultado;
}
