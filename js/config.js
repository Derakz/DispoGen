/**************************************
 * CONFIGURACION GENERAL
 **************************************/
export const OPENAI_MODEL = "gpt-4.1-mini";

/**************************************
 * DISPOSICIONES (fallback local)
 **************************************/
export const DISPOSICIONES = {
  fraude: {
    label: "Fraude Informatico",
    disposiciones: [
      {
        id: "apertura_fraude",
        label: "Disposicion de Apertura",
        template: "templates/plantilla_apertura_fraude.docx"
      },
      {
        id: "archivo_monto_minimo",
        label: "Archivo Liminar - Monto Minimo",
        template: "templates/plantilla_archivo_monto_minimo.docx"
      },
      {
        id: "archivo_hurto_fraude",
        label: "Archivo Liminar - Hurto y Fraude Informatico",
        template: "templates/plantilla_archivo_hurtofraude.docx"
      },
      {
        id: "archivo_fraude_desistimiento",
        label: "Archivo Liminar - Por desistimiento",
        template: "templates/plantilla_archivo_desistimiento.docx"
      }
    ]
  },
  suplantacion: {
    label: "Suplantacion de Identidad",
    disposiciones: [
      {
        id: "apertura_suplantacion",
        label: "Disposicion de Apertura",
        template: "templates/plantilla_apertura_suplantacion.docx"
      }
    ]
  },
  estafa: {
    label: "Estafa",
    disposiciones: [
      {
        id: "derivacion_estafa",
        label: "Disposicion de Derivacion - Estafa",
        template: "templates/plantilla_derivacion_estafa.docx"
      }
    ]
  }
};

/**************************************
 * DESPACHOS
 **************************************/
export const DESPACHOS = {
  // PRIMERA FISCALIA (1 a 5 despacho)
  pfcc_1_1: {
    label: "Primera Fiscalia Corporativa Especializada en Ciberdelincuencia - 1 Despacho",
    texto: "Primera Fiscalia Corporativa Especializada en Ciberdelincuencia - 1 Despacho",
    correo: "1despachociberdelincuencialimacentro@mpfn.gob.pe"
  },
  pfcc_1_2: {
    label: "Primera Fiscalia Corporativa Especializada en Ciberdelincuencia - 2 Despacho",
    texto: "Primera Fiscalia Corporativa Especializada en Ciberdelincuencia - 2 Despacho",
    correo: "2despachociberdelincuencialimacentro@mpfn.gob.pe"
  },
  pfcc_1_3: {
    label: "Primera Fiscalia Corporativa Especializada en Ciberdelincuencia - 3 Despacho",
    texto: "Primera Fiscalia Corporativa Especializada en Ciberdelincuencia - 3 Despacho",
    correo: "3despachociberdelincuencialimacentro@mpfn.gob.pe"
  },
  pfcc_1_4: {
    label: "Primera Fiscalia Corporativa Especializada en Ciberdelincuencia - 4 Despacho",
    texto: "Primera Fiscalia Corporativa Especializada en Ciberdelincuencia - 4 Despacho",
    correo: "4despachociberdelincuencialimacentro@mpfn.gob.pe"
  },
  pfcc_1_5: {
    label: "Primera Fiscalia Corporativa Especializada en Ciberdelincuencia - 5 Despacho",
    texto: "Primera Fiscalia Corporativa Especializada en Ciberdelincuencia - 5 Despacho",
    correo: "5despachociberdelincuencialimacentro@mpfn.gob.pe"
  },

  // SEGUNDA FISCALIA (1 a 5 despacho)
  pfcc_2_1: {
    label: "Segunda Fiscalia Corporativa Especializada en Ciberdelincuencia - 1 Despacho",
    texto: "Segunda Fiscalia Corporativa Especializada en Ciberdelincuencia - 1 Despacho",
    correo: "1despacho2ciberdelincuencialimacentro@mpfn.gob.pe"
  },
  pfcc_2_2: {
    label: "Segunda Fiscalia Corporativa Especializada en Ciberdelincuencia - 2 Despacho",
    texto: "Segunda Fiscalia Corporativa Especializada en Ciberdelincuencia - 2 Despacho",
    correo: "2despacho2ciberdelincuencialimacentro@mpfn.gob.pe"
  },
  pfcc_2_3: {
    label: "Segunda Fiscalia Corporativa Especializada en Ciberdelincuencia - 3 Despacho",
    texto: "Segunda Fiscalia Corporativa Especializada en Ciberdelincuencia - 3 Despacho",
    correo: "3despacho2ciberdelincuencialimacentro@mpfn.gob.pe"
  },
  pfcc_2_4: {
    label: "Segunda Fiscalia Corporativa Especializada en Ciberdelincuencia - 4 Despacho",
    texto: "Segunda Fiscalia Corporativa Especializada en Ciberdelincuencia - 4 Despacho",
    correo: "4despacho2ciberdelincuencialimacentro@mpfn.gob.pe"
  },
  pfcc_2_5: {
    label: "Segunda Fiscalia Corporativa Especializada en Ciberdelincuencia - 5 Despacho",
    texto: "Segunda Fiscalia Corporativa Especializada en Ciberdelincuencia - 5 Despacho",
    correo: "5despacho2ciberdelincuencialimacentro@mpfn.gob.pe"
  }
};
