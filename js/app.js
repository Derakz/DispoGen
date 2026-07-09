/**************************************
 * IMPORTS
 **************************************/
import { DISPOSICIONES, DESPACHOS } from "./config.js";
import {
  aFormatoTitulo,
  fechaLargaPeru,
  mesNumeroATexto,
  esTextoInstitucional,
  limpiarTextoParaExtractor
} from "./utils.js";
import { ejecutarExtractor } from "./extractor.js";
import { generarWord } from "./word.js";
import { TEMPLATE_FIELDS } from "./fields.generated.js";
import { cargarCatalogoPlantillas } from "./selectors.js";

import "./pdf.js"; // solo efectos (listener PDF)

/**************************************
 * DOM (ESTABLE)
 **************************************/
const caseInput = document.getElementById("caseInput");
const datosApoyoInput = document.getElementById("datosApoyo");
const estado = document.getElementById("estado");

const btnTextoManual = document.getElementById("btnTextoManual");
const btnDatosExtra = document.getElementById("btnDatosExtra");
const btnGenerar = document.getElementById("btnGenerar");

const despachoSelect = document.getElementById("despachoSelect");
const chkRecordarDespacho = document.getElementById("chkRecordarDespacho");

const fiscalInput = document.getElementById("fiscalInput");
const rememberFiscalCheckbox = document.getElementById("rememberFiscal");

const delitoSelect = document.getElementById("delitoSelect");
const disposicionSelect = document.getElementById("disposicionSelect");
const brandLogo = document.getElementById("brandLogo");

/**************************************
 * TEMA (CLARO / OSCURO / SISTEMA)
 **************************************/
const btnSettings = document.getElementById("btnSettings");
const settingsMenu = document.getElementById("settingsMenu");
const themeSelect = document.getElementById("themeSelect");

const LS_THEME = "ui_theme"; // "light" | "dark" | "system"

function logoSrcForTheme(theme) {
  return theme === "dark"
    ? "assets/logo-dispogen-suite-dark.png"
    : "assets/logo-dispogen-suite-ligth.png";
}

function updateBrandLogo(theme) {
  if (!brandLogo) return;
  const targetSrc = logoSrcForTheme(theme);
  const currentSrc = brandLogo.getAttribute("src");
  if (currentSrc !== targetSrc) {
    brandLogo.setAttribute("src", targetSrc);
  }
}

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(mode) {
  const theme = mode === "system" ? getSystemTheme() : mode;
  document.documentElement.setAttribute("data-theme", theme);
  updateBrandLogo(theme);
}

function loadTheme() {
  const saved = localStorage.getItem(LS_THEME) || "system";
  if (themeSelect) themeSelect.value = saved;
  applyTheme(saved);
}

// Abrir/cerrar menu de configuracion
if (btnSettings && settingsMenu) {
  btnSettings.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", () => {
    if (!settingsMenu.classList.contains("hidden")) {
      settingsMenu.classList.add("hidden");
    }
  });

  settingsMenu.addEventListener("click", (e) => e.stopPropagation());
}

// Selector de tema
if (themeSelect) {
  themeSelect.addEventListener("change", () => {
    const mode = themeSelect.value;
    localStorage.setItem(LS_THEME, mode);
    applyTheme(mode);
  });
}

if (brandLogo) {
  brandLogo.addEventListener("load", () => {
    document.documentElement.classList.remove("logo-missing");
  });

  brandLogo.addEventListener("error", () => {
    document.documentElement.classList.add("logo-missing");
  });
}

// Aplicar al cargar
document.addEventListener("DOMContentLoaded", loadTheme);

// Si el usuario esta en "system", y el sistema cambia, actualiza
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  const saved = localStorage.getItem(LS_THEME) || "system";
  if (saved === "system") applyTheme("system");
});

/**************************************
 * ESTADO GLOBAL
 **************************************/
let CATALOGO = {};
let DISPOSICIONES_RUNTIME = DISPOSICIONES;

/**************************************
 * TOGGLES (INDEPENDIENTES)
 **************************************/
btnTextoManual.addEventListener("click", () => {
  caseInput.classList.toggle("hidden");
});

btnDatosExtra.addEventListener("click", () => {
  datosApoyoInput.classList.toggle("hidden");
});

/**************************************
 * POBLAR DESPACHOS
 **************************************/
Object.entries(DESPACHOS).forEach(([key, val]) => {
  const opt = document.createElement("option");
  opt.value = key;
  opt.textContent = val.label;
  despachoSelect.appendChild(opt);
});

/**************************************
 * RECORDAR DESPACHO (BLINDADO)
 **************************************/
const LS_RECORDAR_DESPACHO = "recordarDespacho";
const LS_DESPACHO_FISCAL = "despachoFiscal";

function aplicarDespachoRecordado() {
  const guardado = localStorage.getItem(LS_DESPACHO_FISCAL) || "";

  let recordarRaw = localStorage.getItem(LS_RECORDAR_DESPACHO);
  if (recordarRaw === null && guardado) {
    localStorage.setItem(LS_RECORDAR_DESPACHO, "true");
    recordarRaw = "true";
  }

  const recordar = recordarRaw === "true";
  chkRecordarDespacho.checked = recordar;

  if (recordar && guardado) {
    const existe = [...despachoSelect.options].some((opt) => opt.value === guardado);
    if (existe) {
      despachoSelect.value = guardado;
    } else {
      localStorage.removeItem(LS_RECORDAR_DESPACHO);
      localStorage.removeItem(LS_DESPACHO_FISCAL);
      chkRecordarDespacho.checked = false;
    }
  }
}

despachoSelect.addEventListener("change", () => {
  if (chkRecordarDespacho.checked) {
    if (!despachoSelect.value) return;
    localStorage.setItem(LS_RECORDAR_DESPACHO, "true");
    localStorage.setItem(LS_DESPACHO_FISCAL, despachoSelect.value);
  }
});

chkRecordarDespacho.addEventListener("change", () => {
  if (chkRecordarDespacho.checked) {
    if (!despachoSelect.value) {
      alert("Seleccione un despacho antes de recordarlo.");
      chkRecordarDespacho.checked = false;
      return;
    }
    localStorage.setItem(LS_RECORDAR_DESPACHO, "true");
    localStorage.setItem(LS_DESPACHO_FISCAL, despachoSelect.value);
  } else {
    localStorage.removeItem(LS_RECORDAR_DESPACHO);
    localStorage.removeItem(LS_DESPACHO_FISCAL);
  }
});

/**************************************
 * RECORDAR FISCAL RESPONSABLE (ESTABLE)
 **************************************/
const fiscalGuardado = localStorage.getItem("fiscal_responsable");
const recordarFiscal = localStorage.getItem("recordarFiscal") === "true";

if (recordarFiscal && fiscalGuardado) {
  fiscalInput.value = fiscalGuardado;
  rememberFiscalCheckbox.checked = true;
}

fiscalInput.addEventListener("input", () => {
  if (rememberFiscalCheckbox.checked) {
    localStorage.setItem("fiscal_responsable", fiscalInput.value.trim());
  }
});

rememberFiscalCheckbox.addEventListener("change", () => {
  if (rememberFiscalCheckbox.checked) {
    if (!fiscalInput.value.trim()) {
      alert("Ingrese el fiscal antes de recordarlo.");
      rememberFiscalCheckbox.checked = false;
      return;
    }
    localStorage.setItem("recordarFiscal", "true");
    localStorage.setItem("fiscal_responsable", fiscalInput.value.trim());
  } else {
    localStorage.removeItem("recordarFiscal");
    localStorage.removeItem("fiscal_responsable");
  }
});

/**************************************
 * CATALOGO -> DISPOSICIONES RUNTIME
 **************************************/
function catalogoADisposiciones(catalogo) {
  const out = {};
  for (const [key, grupo] of Object.entries(catalogo)) {
    out[key] = {
      label: grupo.label,
      disposiciones: (grupo.plantillas || []).map((p) => ({
        id: p.id,
        label: p.label,
        template: p.file.startsWith("templates/") ? p.file : `templates/${p.file}`
      }))
    };
  }
  return out;
}

async function existeArchivo(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (res.ok) return true;
    const res2 = await fetch(url, { method: "GET" });
    return res2.ok;
  } catch {
    return false;
  }
}

async function validarPlantillasAsync(disposiciones) {
  const faltantes = [];

  for (const [delitoKey, grupo] of Object.entries(disposiciones)) {
    for (const p of grupo.disposiciones || []) {
      const ok = await existeArchivo(p.template);
      if (!ok) faltantes.push(`${delitoKey} -> ${p.id} (${p.template})`);
    }
  }

  if (faltantes.length) {
    console.warn("Plantillas DOCX faltantes:", faltantes);
    alert(
      "Atencion: faltan plantillas DOCX.\n\n" +
        faltantes.join("\n") +
        "\n\nRevisa la carpeta /templates y el catalog.json."
    );
  }
}

function inicializarSelectoresDesdeCatalogo(catalogo) {
  DISPOSICIONES_RUNTIME = catalogoADisposiciones(catalogo);
  validarPlantillasAsync(DISPOSICIONES_RUNTIME).catch(console.error);

  delitoSelect.innerHTML = '<option value="">Seleccione delito</option>';
  Object.entries(DISPOSICIONES_RUNTIME).forEach(([key, val]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = val.label;
    delitoSelect.appendChild(opt);
  });

  disposicionSelect.innerHTML = '<option value="">Seleccione disposicion</option>';
  disposicionSelect.disabled = true;

  delitoSelect.onchange = () => {
    disposicionSelect.innerHTML = '<option value="">Seleccione disposicion</option>';
    disposicionSelect.disabled = true;

    const delito = DISPOSICIONES_RUNTIME[delitoSelect.value];
    if (!delito) return;

    delito.disposiciones.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.label;
      disposicionSelect.appendChild(opt);
    });

    disposicionSelect.disabled = false;
  };
}

function obtenerDisposicionSeleccionada() {
  const delito = DISPOSICIONES_RUNTIME[delitoSelect.value];
  if (!delito) return null;
  return delito.disposiciones.find((d) => d.id === disposicionSelect.value) || null;
}

/**************************************
 * INIT (UN SOLO DOMContentLoaded)
 **************************************/
document.addEventListener("DOMContentLoaded", async () => {
  try {
    loadTheme();
    aplicarDespachoRecordado();

    CATALOGO = await cargarCatalogoPlantillas();
    inicializarSelectoresDesdeCatalogo(CATALOGO);
  } catch (err) {
    alert("Error cargando plantillas: " + err.message);
    console.error(err);
  }
});

/**************************************
 * BOTON PRINCIPAL
 **************************************/
btnGenerar.addEventListener("click", async () => {
  try {
    estado.textContent = "⏳ Generando documento...";

    const despacho = DESPACHOS[despachoSelect.value];
    if (!despacho) throw new Error("Seleccione despacho fiscal.");

    const fiscal = fiscalInput.value.trim();
    if (!fiscal) throw new Error("Ingrese fiscal responsable.");

    const seleccion = obtenerDisposicionSeleccionada();
    if (!seleccion) throw new Error("Seleccione delito y disposicion.");

    const textoFuente = limpiarTextoParaExtractor(caseInput.value || "");
    const textoApoyo = limpiarTextoParaExtractor(datosApoyoInput.value || "");

    const texto = [
      "[DOCUMENTO FUENTE]",
      textoFuente,
      "",
      "[DATOS ADICIONALES]",
      textoApoyo
    ].join("\n");

    if (textoFuente.trim().length < 50) {
      throw new Error("Texto insuficiente para generar disposicion.");
    }

    // 1) leer placeholders de la plantilla seleccionada
    const infoTpl = TEMPLATE_FIELDS?.[seleccion.id] || { fields: [] };
    const required = infoTpl.fields || [];

    // 2) pasar required al extractor (esto evita que estafa salga en blanco)
    const datos = await ejecutarExtractor(texto, required);

    // Normalizaciones
    if (datos?.mes_hecho) datos.mes_hecho = mesNumeroATexto(datos.mes_hecho);

    // Blindaje institucional
    if (datos && !esTextoInstitucional(datos.remitente)) datos.remitente = "";
    if (datos && !esTextoInstitucional(datos.oficio)) datos.oficio = "";

    // 3) Defaults segun placeholders detectados en el DOCX
    const defaults = {};
    for (const k of required) defaults[k] = "";

    // 4) Payload final (orden importa: defaults -> datos -> institucional)
    const payloadFinal = {
      ...defaults,
      ...datos,

      // institucional
      despacho: despacho.texto,
      correo_despacho: despacho.correo || "",
      telefono_despacho: despacho.telefono || "",
      direccion_despacho: despacho.direccion || "",

      fiscal_responsable: aFormatoTitulo(fiscal),
      fecha_actual: fechaLargaPeru()
    };

    await generarWord(payloadFinal, seleccion.template, `disposicion_${seleccion.id}.docx`);
    estado.textContent = "✅ Documento generado correctamente.";
  } catch (e) {
    estado.textContent = "❌ Error: " + (e?.message || "Error inesperado");
    console.error(e);
  }
});
