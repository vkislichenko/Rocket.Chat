@visitorId = new ReactiveVar null

Meteor.startup ->
	if not localStorage.getItem('rocketChatLivechat')?
		localStorage.setItem('rocketChatLivechat', Random.id())
	# else
	# 	Tracker.autorun (c) ->
	# 		if not visitor.userId() and visitor.getToken()
	# 			Meteor.call 'livechat:loginByToken', visitor.getToken(), (err, result) ->
	# 				if result?.userId?
	# 					visitor.setUserId(result.userId);
	# 					c.stop()
	# 				# if result?.token
	# 				# 	Meteor.loginWithToken result.token, (err, result) ->
	# 				# 		c.stop()

	visitorId.set localStorage.getItem('rocketChatLivechat')
