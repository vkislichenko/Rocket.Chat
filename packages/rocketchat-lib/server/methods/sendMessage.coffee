import moment from 'moment'

Meteor.methods
	sendMessage: (message) ->

		check message, Object

		if not Meteor.userId()
			throw new Meteor.Error('error-invalid-user', "Invalid user", { method: 'sendMessage' })

		if message.ts
			tsDiff = Math.abs(moment(message.ts).diff())
			if tsDiff > 60000
				throw new Meteor.Error('error-message-ts-out-of-sync', 'Message timestamp is out of sync', { method: 'sendMessage', message_ts: message.ts, server_ts: new Date().getTime() })
			else if tsDiff > 10000
				message.ts = new Date()
		else
			message.ts = new Date()

		if message.msg?.length > RocketChat.settings.get('Message_MaxAllowedSize')
			throw new Meteor.Error('error-message-size-exceeded', 'Message size exceeds Message_MaxAllowedSize', { method: 'sendMessage' })

		user = RocketChat.models.Users.findOneById Meteor.userId(), fields: username: 1, name: 1

		room = Meteor.call 'canAccessRoom', message.rid, user._id

		if not room
			return false

		if user.username in (room.muted or [])
			RocketChat.Notifications.notifyUser Meteor.userId(), 'message', {
				_id: Random.id()
				rid: room._id
				ts: new Date
				msg: TAPi18n.__('You_have_been_muted', {}, user.language)
			}
			return false

		message.alias = user.name if not message.alias? and RocketChat.settings.get 'Message_SetNameToAliasEnabled'
		if Meteor.settings.public.sandstorm
			message.sandstormSessionId = this.connection.sandstormSessionId()

		RocketChat.sendMessage user, message, room

# Limit a user, who does not have the "bot" role, to sending 5 msgs/second
DDPRateLimiter.addRule
	type: 'method'
	name: 'sendMessage'
	userId: (userId) ->
		user = RocketChat.models.Users.findOneById(userId)
		return true if not user?.roles
		return 'bot' not in user.roles
, 5, 1000
