export async function cargarCatalogoPlantillas() {
  const response = await fetch("templates/catalog.json");
  if (!response.ok) {
    throw new Error("No se pudo cargar el catalogo de plantillas");
  }
  return await response.json();
}
