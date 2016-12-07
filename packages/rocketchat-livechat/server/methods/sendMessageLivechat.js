Meteor.methods({
	sendMessageLivechat: function(token, message) {
		check(message, {
			_id: String,
			rid: String,
			msg: String
		});

		const guest = RocketChat.models.Visitors.getVisitorByToken(token, {
			fields: {
				name: 1,
				username: 1,
				department: 1,
				profile: 1
			}
		});

		return RocketChat.Livechat.sendMessage({ guest: guest, message: message });
	}
});
