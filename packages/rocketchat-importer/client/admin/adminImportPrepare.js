/* globals Importer */
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
				importer = i;
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
			files = e.dataTransfer && e.dataTransfer.files || [];
		}
		Object.keys(files).forEach(key => {
			const blob = files[key];
			template.preparing.set(true);
			const reader = new FileReader();
			reader.readAsDataURL(blob);
			reader.onloadend = function() {
				Meteor.call('prepareImport', importer.key, reader.result, blob.type, blob.name, function(error, data) {
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
					template.preparing.set(false);
				});
			};
		});
	},
	'click .button.start'(event, template) {
		const btn = this;
		$(btn).prop('disabled', true);
		const users = template.users.get();
		Object.keys(users).forEach(key => {
			const user = users[key];
			user.do_import = $(`[name=${ user.user_id }]`).is(':checked');
		});

		const channels = template.channels.get();
		Object.keys(channels).forEach(key => {
			const channel = channels[key];
			channel.do_import = $(`[name=${ channel.channel_id }]`).is(':checked');
		});
		Meteor.call('startImport', FlowRouter.getParam('importer'), {
			users: template.users.get(),
			channels: template.channels.get()
		}, function(error) {
			if (error) {
				console.warn('Error on starting the import:', error);
				return handleError(error);
			} else {
				FlowRouter.go(`/admin/import/progress/${ FlowRouter.getParam('importer') }`);
			}
		});
	},
	'click .button.restart'(event, template) {
		Meteor.call('restartImport', FlowRouter.getParam('importer'), function(error) {
			if (error) {
				console.warn('Error while restarting the import:', error);
				handleError(error);
				return;
			}
			template.users.set([]);
			template.channels.set([]);
			template.loaded.set(false);
		});
	},
	'click .button.uncheck-deleted-users'(event, template) {
		const users = template.users.get();
		return Object.keys(users).map(key => {
			const user = users[key];
			if (user.is_deleted) {
				return $(`[name=${ user.user_id }]`).attr('checked', false);
			}
		});
	},
	'click .button.uncheck-archived-channels'(event, template) {
		const channels = template.channels.get();
		return Object.keys(channels).map(key => {
			const channel = channels[key];
			if (channel.is_archived) {
				return $(`[name=${ channel.channel_id }]`).attr('checked', false);
			}
		});
	}
});

Template.adminImportPrepare.onCreated(function() {
	const instance = this;
	this.preparing = new ReactiveVar(true);
	this.loaded = new ReactiveVar(false);
	this.users = new ReactiveVar([]);
	this.channels = new ReactiveVar([]);
	const loadSelection = function(progress) {
		if (progress && progress.step) {
			switch (progress.step) {
				case 'importer_importing_started':
				case 'importer_importing_users':
				case 'importer_importing_channels':
				case 'importer_importing_messages':
				case 'importer_finishing':
					FlowRouter.go(`/admin/import/progress/${ FlowRouter.getParam('importer') }`);
					break;
				case 'importer_user_selection':
					Meteor.call('getSelectionData', FlowRouter.getParam('importer'), function(error, data) {
						if (error) {
							handleError(error);
						}
						instance.users.set(data.users);
						instance.channels.set(data.channels);
						instance.loaded.set(true);
						instance.preparing.set(false);
					});
					break;
				case 'importer_new':
					instance.preparing.set(false);
					break;
				default:
					Meteor.call('restartImport', FlowRouter.getParam('importer'), function(error, progress) {
						if (error) {
							handleError(error);
						}
						loadSelection(progress);
					});
			}
		} else {
			console.warn('Invalid progress information.', progress);
		}
	};
	if (FlowRouter.getParam('importer')) {
		Meteor.call('getImportProgress', FlowRouter.getParam('importer'), function(error, progress) {
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
