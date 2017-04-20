Template.privateGroups.helpers({
	isActive() {
		if (ChatSubscription.findOne({ t: { $in: ['p']}, f: { $ne: true }, open: true, rid: Session.get('openedRoom') }, { fields: { _id: 1 } })) {
			return 'active';
		}
	},

	rooms() {
		const query = { t: { $in: ['p']}, f: { $ne: true }, open: true };

		if (Meteor.user() && Meteor.user().settings && Meteor.user().settings.preferences && Meteor.user().settings.preferences.unreadRoomsMode) {
			query.$or = [
				{ alert: { $ne: true } },
				{ hideUnreadStatus: true }
			];
		}

		return ChatSubscription.find(query, { sort: { 't': 1, 'name': 1 }});
	},

	total() {
		return ChatSubscription.find({ t: { $in: ['p']}, f: { $ne: true } }).count();
	},

	totalOpen() {
		return ChatSubscription.find({ t: { $in: ['p']}, f: { $ne: true }, open: true }).count();
	}
});

Template.privateGroups.events({
	'click .more-groups'() {
		SideNav.setFlex('listPrivateGroupsFlex');
		return SideNav.openFlex();
	}
});
