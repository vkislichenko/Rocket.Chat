Meteor.methods({
	'livechat:loginByToken'(token) {
		const user = RocketChat.models.Visitors.getVisitorByToken(token, { fields: { _id: 1 } });

		if (!user) {
			return;
		}

		// const stampedToken = Accounts._generateStampedLoginToken();
		// const hashStampedToken = Accounts._hashStampedToken(stampedToken);

		// let updateUser = {
		// 	$set: {
		// 		services: {
		// 			resume: {
		// 				loginTokens: [ hashStampedToken ]
		// 			}
		// 		}
		// 	}
		// };

		// RocketChat.models.Visitors.model.update(user._id, updateUser);

		return {
			userId: user._id
		};
	}
});
