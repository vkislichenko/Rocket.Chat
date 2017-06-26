RocketChat.roomTypes.add('contacts', 400, {
	template: 'contacts',
	icon: 'icon-at',
	route: {
		name: 'direct',
		path: '/direct/:username',
		action(params) {
			return openRoom('d', params.username);
		},
		link(sub) {
			return { username: sub.name };
		}
	},

	findRoom(identifier) {
		const query = {
			t: 'd',
			name: identifier
		};

		const subscription = ChatSubscription.findOne(query);
		if (subscription && subscription.rid) {
			return ChatRoom.findOne(subscription.rid);
		}
	},

	roomName(roomData) {
		const subscription = ChatSubscription.findOne({ rid: roomData._id }, { fields: { name: 1, fname: 1 } });
		if (!subscription) {
			return '';
		}
		if (RocketChat.settings.get('UI_Use_Real_Name') && subscription.fname) {
			return subscription.fname;
		}

		return subscription.name;
	},

	secondaryRoomName(roomData) {
		if (RocketChat.settings.get('UI_Use_Real_Name')) {
			const subscription = ChatSubscription.findOne({ rid: roomData._id }, { fields: { name: 1 } });
			return subscription && subscription.name;
		}
	},

	condition() {
		return RocketChat.authz.hasAtLeastOnePermission(['view-d-room', 'view-joined-room']);
	},

	getUserStatus(roomId) {
		const subscription = RocketChat.models.Subscriptions.findOne({rid: roomId});
		if (subscription == null) { return; }

		return Session.get(`user_${ subscription.name }_status`);
	}
});