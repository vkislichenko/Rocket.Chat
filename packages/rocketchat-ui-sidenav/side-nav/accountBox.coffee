Template.accountBox.helpers
	myUserInfo: ->
		if Meteor.userId()
			visualStatus = "online"
			username = Meteor.user()?.username
			switch Session.get('user_' + username + '_status')
				when "away"
					visualStatus = t("away")
				when "busy"
					visualStatus = t("busy")
				when "offline"
					visualStatus = t("invisible")
			return {
				name: Session.get('user_' + username + '_name')
				status: Session.get('user_' + username + '_status')
				visualStatus: visualStatus
				_id: Meteor.userId()
				username: username
			}
		else
			return {
				name: t("Anonymous_user")
				status: "online"
				visualStatus: "online"
				username: t("Anonymous_user")
			}

	showAdminOption: ->
		return RocketChat.authz.hasAtLeastOnePermission( ['view-statistics', 'view-room-administration', 'view-user-administration', 'view-privileged-setting'])

	registeredMenus: ->
		return AccountBox.getItems()

Template.accountBox.events
	'click .options .status': (event) ->
		event.preventDefault()
		AccountBox.setStatus(event.currentTarget.dataset.status)

	'click .account-box': (event) ->
		AccountBox.toggle()

	'click #logout': (event) ->
		event.preventDefault()
		user = Meteor.user()
		Meteor.logout ->
			FlowRouter.go 'home'
			Meteor.call('logoutCleanUp', user)

	'click #avatar': (event) ->
		FlowRouter.go 'changeAvatar'

	'click #account': (event) ->
		SideNav.setFlex "accountFlex"
		SideNav.openFlex()
		FlowRouter.go 'account'

	'click #admin': ->
		SideNav.setFlex "adminFlex"
		SideNav.openFlex()
		FlowRouter.go 'admin-info'

	'click .account-link': ->
		menu.close()

	'click .account-box-item': ->
		if @sideNav?
			SideNav.setFlex @sideNav
			SideNav.openFlex()

Template.accountBox.onRendered ->
	AccountBox.init()
