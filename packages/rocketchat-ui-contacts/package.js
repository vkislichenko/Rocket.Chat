Package.describe({
	name: 'rocketchat:ui-contacts',
	version: '0.0.1',
	// Brief, one-line summary of the package.
	summary: '',
	// URL to the Git repository containing the source code for this package.
	git: '',
	// By default, Meteor will default to using README.md for documentation.
	// To avoid submitting documentation, set this field to null.
	documentation: 'README.md'
});

Package.onUse(function(api) {
	api.versionsFrom('1.4.4.2');
	api.use([
		'mongo',
		'ecmascript',
		'templating',
		'underscore',
		'rocketchat:lib',
		'rocketchat:ui'
	]);

	//i18n : preload
	api.use('tap:i18n@1.8.2');
	api.addFiles('package-tap.i18n', ['client', 'server']);


	//STARTUP
	api.addFiles('startup/collections.js', ['server', 'client']);
	api.addFiles('startup/roomTypes.js', 'client');


	//LIB FILES
	api.addFiles('client/lib/contacts.js', 'client');

	// TEMPLATE FILES
	api.addFiles('client/views/contacts.html', 'client');
	api.addFiles('client/views/listContactsFlex.html', 'client');

	api.addFiles('client/views/contacts.js', 'client');
	api.addFiles('client/views/listContactsFlex.js', 'client');

	//SERVER
	api.addFiles('server/publications/contacts.js', 'server');

	//i18n : postload
	const fs = Npm.require('fs');
	const workingDir = process.env.PWD || '.';
	fs.readdirSync(`${ workingDir }/packages/rocketchat-ui-contacts/i18n`).forEach(function(filename) {
		if (filename.indexOf('.json') > -1 && fs.statSync(`${ workingDir }/packages/rocketchat-ui-contacts/i18n/${ filename }`).size > 16) {
			api.addFiles(`i18n/${ filename }`, ['client', 'server']);
		}
	});
});
