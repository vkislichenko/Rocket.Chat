const options = {
	fields: Object.keys({
		_id: 1,
		name: 1,
		t: 1,
		cl: 1,
		u: 1,
		// usernames: 1,
		topic: 1,
		muted: 1,
		archived: 1,
		jitsiTimeout: 1,
		description: 1,
		default: 1,

		// @TODO create an API to register this fields based on room type
		livechatData: 1,
		tags: 1,
		sms: 1,
		code: 1,
		open: 1,
		v: 1,
		label: 1,
		ro: 1
	})
};


const roomMap = (record) => {
	if (record._room) {
		return _.pick(record._room, ...options.fields);
	}
	console.log('Empty Room for Subscription', record);
	return {};
};


Meteor.methods({
	'rooms/get'(updatedAt) {
		if (!Meteor.userId()) {
			return [];
		}

		this.unblock();

		const data = RocketChat.models.Subscriptions.findByUserId(Meteor.userId()).fetch();

		if (updatedAt instanceof Date) {
			return {
				update: data
					.filter(record => { return record._room && record._room._updatedAt > updatedAt; })
					.map(roomMap),
				remove: RocketChat.models.Subscriptions.trashFindDeletedAfter(updatedAt, {'u._id': Meteor.userId()}, {fields: {_id: 1, _deletedAt: 1}}).fetch()
			};
		}

		return data.map(roomMap);
	},

	getRoomByTypeAndName(type, name) {
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'getRoomByTypeAndName' });
		}

		const roomFind = RocketChat.roomTypes.getRoomFind(type);

		let room;

		if (roomFind) {
			room = roomFind.call(this, name);
		} else {
			room = RocketChat.models.Rooms.findByTypeAndName(type, name).fetch();
		}

		if (!room) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'getRoomByTypeAndName' });
		}

		if (!Meteor.call('canAccessRoom', room._id, Meteor.userId())) {
			throw new Meteor.Error('error-no-permission', 'No permission', { method: 'getRoomByTypeAndName' });
		}

		return roomMap({_room: room});
	}
});

RocketChat.models.Rooms.cache.on('sync', (type, room/*, diff*/) => {
	const records = RocketChat.models.Subscriptions.findByRoomId(room._id).fetch();
	for (const record of records) {
		RocketChat.Notifications.notifyUserInThisInstance(record.u._id, 'rooms-changed', type, roomMap({_room: room}));
	}
});

RocketChat.models.Subscriptions.on('changed', (type, subscription/*, diff*/) => {
	if (type === 'inserted') {
		const room = RocketChat.models.Rooms.findOneById(subscription.rid);
		if (room) {
			RocketChat.Notifications.notifyUserInThisInstance(subscription.u._id, 'rooms-changed', type, roomMap({_room: room}));
		}
	}
});
