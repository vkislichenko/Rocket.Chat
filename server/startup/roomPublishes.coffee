Meteor.startup ->
	RocketChat.roomTypes.setPublish 'c', (identifier) ->
		options =
			fields:
				name: 1
				t: 1
				cl: 1
				u: 1
				usernames: 1
				topic: 1
				muted: 1
				archived: 1
				ro: 1
				reactWhenReadOnly: 1
				jitsiTimeout: 1
				description: 1
				sysMes: 1
				joinCodeRequired: 1

		if RocketChat.authz.hasPermission(this.userId, 'view-join-code')
			options.fields.joinCode = 1

		if RocketChat.authz.hasPermission(this.userId, 'view-c-room')
			# CACHE: can we stop using publications here?
			return RocketChat.models.Rooms.findByTypeAndName 'c', identifier, options
		else if RocketChat.authz.hasPermission(this.userId, 'view-joined-room')
			roomId = RocketChat.models.Subscriptions.findByTypeNameAndUserId('c', identifier, this.userId).fetch()
			if roomId.length > 0
				# CACHE: can we stop using publications here?
				return RocketChat.models.Rooms.findById(roomId[0]?.rid, options)

		return this.ready()

	RocketChat.roomTypes.setPublish 'p', (identifier) ->
		options =
			fields:
				name: 1
				t: 1
				cl: 1
				u: 1
				usernames: 1
				topic: 1
				muted: 1
				archived: 1
				ro: 1
				reactWhenReadOnly: 1
				jitsiTimeout: 1
				description: 1
				sysMes: 1

		user = RocketChat.models.Users.findOneById this.userId, fields: username: 1
		# CACHE: can we stop using publications here?
		return RocketChat.models.Rooms.findByTypeAndNameContainingUsername 'p', identifier, user.username, options

	RocketChat.roomTypes.setPublish 'd', (identifier) ->
		options =
			fields:
				name: 1
				t: 1
				cl: 1
				u: 1
				usernames: 1
				topic: 1
				jitsiTimeout: 1

		user = RocketChat.models.Users.findOneById this.userId, fields: username: 1
		if RocketChat.authz.hasAtLeastOnePermission(this.userId, ['view-d-room', 'view-joined-room'])
			# CACHE: can we stop using publications here?
			return RocketChat.models.Rooms.findByTypeContainigUsernames 'd', [user.username, identifier], options
		return this.ready()
