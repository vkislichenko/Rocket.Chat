Meteor.startup(function() {
	Tracker.autorun(function() {
		if (RocketChat.settings.get('Message_AllowSnippeting')) {
			RocketChat.TabBar.addButton({
				groups: ['channel', 'group', 'direct'],
				id: 'snippeted-messages',
				i18nTitle: 'Snippeted_Messages',
				icon: 'code',
				template: 'snippetedMessages',
				order: 20
			});
		} else {
			RocketChat.TabBar.removeButton('snippeted-messages');
		}
	});
});
