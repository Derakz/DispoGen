PASOS PARA AGREGAR PLANTILLA:
1. Crear DOCX con placeholders snake_case
2. Guardar en /templates
3. Agregar entry en templates/catalog.json
4. (Opcional) agregar campos al extractor
5. Ejecutar node tools/sync-templates.mjs
6. Verificar fields.generated