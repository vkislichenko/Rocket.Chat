/* globals Importer*/
import toastr from 'toastr';
Template.adminImportPrepare.helpers({
	isAdmin() {
		return RocketChat.authz.hasRole(Meteor.userId(), 'admin');
	},
	importer() {
		const importerKey = FlowRouter.getParam('importer');
		let importer = undefined;
		_.each(Importer.Importers, function(i, key) {
			i.key = key;
			if (key === importerKey) {
				return importer = i;
			}
		});
		return importer;
	},
	isLoaded() {
		return Template.instance().loaded.get();
	},
	isPreparing() {
		return Template.instance().preparing.get();
	},
	users() {
		return Template.instance().users.get();
	},
	channels() {
		return Template.instance().channels.get();
	}
});

Template.adminImportPrepare.events({
	'change .import-file-input'(event, template) {
		const importer = this;
		if (!importer.key) {
			return;
		}
		const e = event.originalEvent || event;
		let files = e.target.files;
		if (!files || files.length === 0) {
			files =[];
			if (e.dataTransfer && e.dataTransfer.files) {
				files = e.dataTransfer.files;
			}
		}
		const results = [];
		Object.keys(files).forEach((key) => {
			const blob = files[key];
			template.preparing.set(true);
			const reader = new FileReader();
			reader.readAsDataURL(blob);
			results.push(reader.onloadend = function() {
				return Meteor.call('prepareImport', importer.key, reader.result, blob.type, blob.name, function(error, data) {
					if (error) {
						toastr.error(t('Invalid_Import_File_Type'));
						template.preparing.set(false);
						return;
					}
					if (!data) {
						console.warn(`The importer ${ importer.key } is not set up correctly, as it did not return any data.`);
						toastr.error(t('Importer_not_setup'));
						template.preparing.set(false);
						return;
					}
					if (data.step) {
						console.warn('Invalid file, contains `data.step`.', data);
						toastr.error(t('Invalid_Export_File', importer.key));
						template.preparing.set(false);
						return;
					}
					template.users.set(data.users);
					template.channels.set(data.channels);
					template.loaded.set(true);
					return template.preparing.set(false);
				});
			});
		});
		return results;
	},
	'click .button.start'(event, template) {
		const btn = this;
		$(btn).prop('disabled', true);
		const users = template.users.get();

		Object.keys(users).forEach((key) => {
			const user = users[key];
			user.do_import = $(`[name=${ user.user_id }]`).is(':checked');
		});

		const channels = template.channels.get();
		Object.keys(channels).forEach((key) => {
			const channel = channels[key];
			channel.do_import = $(`[name=${ channel.channel_id }]`).is(':checked');
		});

		return Meteor.call('startImport', FlowRouter.getParam('importer'), {
			users: template.users.get(),
			channels: template.channels.get()
		}, function(error) {
			if (error) {
				console.warn('Error on starting the import:', error);
				return handleError(error);
			} else {
				return FlowRouter.go(`/admin/import/progress/${ FlowRouter.getParam('importer') }`);
			}
		});
	},
	'click .button.restart'(event, template) {
		return Meteor.call('restartImport', FlowRouter.getParam('importer'), function(error) {
			if (error) {
				console.warn('Error while restarting the import:', error);
				handleError(error);
				return;
			}
			template.users.set([]);
			template.channels.set([]);
			return template.loaded.set(false);
		});
	},
	'click .button.uncheck-deleted-users'(event, template) {
		const users = template.users.get();
		const results = [];

		Object.keys(users).forEach((key) => {
			const user = users[key];
			if (user.is_deleted) {
				results.push($(`[name=${ user.user_id }]`).attr('checked', false));
			}
		});

		return results;
	},
	'click .button.uncheck-archived-channels'(event, template) {
		const channels = template.channels.get();
		const results = [];

		Object.keys(channels).forEach((key) => {
			const channel = channels[key];
			if (channel.is_archived) {
				results.push($(`[name=${ channel.channel_id }]`).attr('checked', false));
			}
		});

		return results;
	}
});

Template.adminImportPrepare.onCreated(function() {
	const instance = this;
	this.preparing = new ReactiveVar(true);
	this.loaded = new ReactiveVar(false);
	this.users = new ReactiveVar([]);
	this.channels = new ReactiveVar([]);
	const loadSelection = function(progress) {
		if (progress != null ? progress.step : undefined) {
			switch (progress.step) {
				case 'importer_importing_started':
				case 'importer_importing_users':
				case 'importer_importing_channels':
				case 'importer_importing_messages':
				case 'importer_finishing':
					return FlowRouter.go(`/admin/import/progress/${ FlowRouter.getParam('importer') }`);
				case 'importer_user_selection':
					return Meteor.call('getSelectionData', FlowRouter.getParam('importer'), function(error, data) {
						if (error) {
							handleError(error);
						}
						instance.users.set(data.users);
						instance.channels.set(data.channels);
						instance.loaded.set(true);
						return instance.preparing.set(false);
					});
				case 'importer_new':
					return instance.preparing.set(false);
				default:
					return Meteor.call('restartImport', FlowRouter.getParam('importer'), function(error, progress) {
						if (error) {
							handleError(error);
						}
						return loadSelection(progress);
					});
			}
		} else {
			return console.warn('Invalid progress information.', progress);
		}
	};
	if (FlowRouter.getParam('importer')) {
		return Meteor.call('getImportProgress', FlowRouter.getParam('importer'), function(error, progress) {
			if (error) {
				console.warn('Error while getting the import progress:', error);
				handleError(error);
				return;
			}
			if (progress === undefined) {
				return Meteor.call('setupImporter', FlowRouter.getParam('importer'), function(err, data) {
					if (err) {
						handleError(err);
					}
					instance.preparing.set(false);
					return loadSelection(data);
				});
			} else {
				return loadSelection(progress);
			}
		});
	} else {
		return FlowRouter.go('/admin/import');
	}
});

// ---
// generated by coffee-script 1.9.2
