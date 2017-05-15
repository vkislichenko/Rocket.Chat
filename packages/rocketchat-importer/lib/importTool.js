/*globals Importer */
Importer.Importers = {};

Importer.addImporter = function(name, importer, options) {
	if (Importer.Importers[name] == null) {
		Importer.Importers[name] = {
			name: options.name,
			importer,
			mimeType: options.mimeType,
			warnings: options.warnings
		};
	}
};
