/*globals Importer */
Meteor.methods({
	getImportProgress(name) {
		const userId = Meteor.userId();
		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'getImportProgress'
			});
		}
		if (!RocketChat.authz.hasPermission(userId, 'run-import')) {
			throw new Meteor.Error('error-action-not-allowed', 'Importing is not allowed', {
				method: 'setupImporter'
			});
		}
		if (Importer.Importers[name] != null) {
			return (ref = Importer.Importers[name].importerInstance) != null ? ref.getProgress() : void 0;
		} else {
			throw new Meteor.Error('error-importer-not-defined', 'The importer was not defined correctly, it is missing the Import class.', {
				method: 'getImportProgress'
			});
		}
	}
});
