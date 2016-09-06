Meteor.methods({
	'livechat:changeLivechatStatus'() {
		if (!Meteor.userId()) {
			return false;
		}

		const user = Meteor.user();

		let newStatus = user.statusLivechat === 'available' ? 'not-available' : 'available';

		Meteor.users.update(user._id, { $set: { statusLivechat: newStatus }});
	}
});
