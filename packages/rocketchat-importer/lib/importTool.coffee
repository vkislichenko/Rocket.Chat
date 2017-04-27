import Importer from './_importer'
Importer.Importers = {}
console.log Importer

Importer.addImporter = (name, importer, options) ->
	if not Importer.Importers[name]?
		Importer.Importers[name] =
			name: options.name
			importer: importer
			mimeType: options.mimeType
			warnings: options.warnings
