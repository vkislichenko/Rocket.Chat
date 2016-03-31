Template.loginForm.helpers
	userName: ->
		return Meteor.user()?.username

	namePlaceholder: ->
		return if RocketChat.settings.get('Accounts_NameField') is 'optional' then t('Name_optional') else t('Name')

	showFormLogin: ->
		return RocketChat.settings.get 'Accounts_ShowFormLogin'

	showName: ->
		if Template.instance().state.get() isnt 'register' or RocketChat.settings.get('Accounts_NameField') is 'hidden'
			return 'hidden'

	showPassword: ->
		return 'hidden' unless Template.instance().state.get() in ['login', 'register']

	showConfirmPassword: ->
		return 'hidden' unless Template.instance().state.get() is 'register'

	showEmailOrUsername: ->
		return 'hidden' unless Template.instance().state.get() is 'login'

	showEmail: ->
		if Template.instance().state.get() not in ['register', 'forgot-password', 'email-verification'] or RocketChat.settings.get('Accounts_EmailField') is 'hidden'
			return 'hidden'

	showRegisterLink: ->
		return 'hidden' unless Template.instance().state.get() is 'login'

	showForgotPasswordLink: ->
		return 'hidden' unless Template.instance().state.get() is 'login'

	showBackToLoginLink: ->
		return 'hidden' unless Template.instance().state.get() in ['register', 'forgot-password', 'email-verification', 'wait-activation']

	showSandstorm: ->
		return Template.instance().state.get() is 'sandstorm'

	btnLoginSave: ->
		switch Template.instance().state.get()
			when 'register'
				return t('Submit')
			when 'login'
				return t('Login')
			when 'email-verification'
				return t('Send_confirmation_email')
			when 'forgot-password'
				return t('Reset_password')

	waitActivation: ->
		return Template.instance().state.get() is 'wait-activation'

	loginTerms: ->
		return RocketChat.settings.get 'Layout_Login_Terms'

	registrationAllowed: ->
		return RocketChat.settings.get('Accounts_RegistrationForm') is 'Public' or Template.instance().validSecretURL?.get()

	linkReplacementText: ->
		return RocketChat.settings.get('Accounts_RegistrationForm_LinkReplacementText')

	passwordresetAllowed: ->
		return RocketChat.settings.get 'Accounts_PasswordReset'

	emailOrUsernamePlaceholder: ->
		return RocketChat.settings.get('Accounts_EmailOrUsernamePlaceholder') or t("Email_or_username")

	passwordPlaceholder: ->
		return RocketChat.settings.get('Accounts_PasswordPlaceholder') or t("Password")

	emailPlaceholder: ->
		if RocketChat.settings.get('Accounts_EmailField') is 'optional'
			return t('Email_optional')
		else
			return t('Email')

Template.loginForm.events
	'submit #login-card': (event, instance) ->
		event.preventDefault()

		button = $(event.target).find('button.login')
		RocketChat.Button.loading(button)

		formData = instance.validate()
		if formData
			if instance.state.get() is 'email-verification'
				Meteor.call 'sendConfirmationEmail', formData.email, (err, result) ->
					RocketChat.Button.reset(button)
					toastr.success t('We_have_sent_registration_email')
					instance.state.set 'login'
				return

			if instance.state.get() is 'forgot-password'
				Meteor.call 'sendForgotPasswordEmail', formData.email, (err, result) ->
					RocketChat.Button.reset(button)
					toastr.success t('We_have_sent_password_email')
					instance.state.set 'login'
				return

			if instance.state.get() is 'register'
				formData.secretURL = FlowRouter.getParam 'hash'
				Meteor.call 'registerUser', formData, (error, result) ->
					RocketChat.Button.reset(button)

					if error?
						if error.error is 'Email already exists.'
							toastr.error t 'Email_already_exists'
						else
							toastr.error error.reason
						return

					Meteor.loginWithPassword formData.email, formData.pass, (error) ->
						if error?.error is 'no-valid-email'
							toastr.success t('We_have_sent_registration_email')
							instance.state.set 'login'
						else if error?.error is 'inactive-user'
							instance.state.set 'wait-activation'

			else
				loginMethod = 'loginWithPassword'
				if RocketChat.settings.get('LDAP_Enable')
					loginMethod = 'loginWithLDAP'

				Meteor[loginMethod] formData.emailOrUsername, formData.pass, (error) ->
					RocketChat.Button.reset(button)
					if error?
						if error.error is 'no-valid-email'
							instance.state.set 'email-verification'
						else
							toastr.error t 'User_not_found_or_incorrect_password'
						return
					localStorage.setItem('userLanguage', Meteor.user()?.language)
					setLanguage(Meteor.user()?.language)

	'click .register': ->
		Template.instance().state.set 'register'

	'click .back-to-login': ->
		Template.instance().state.set 'login'

	'click .forgot-password': ->
		Template.instance().state.set 'forgot-password'

Template.loginForm.onCreated ->
	instance = @
	if Meteor.settings.public.sandstorm
		@state = new ReactiveVar('sandstorm')
	else if Session.get 'loginDefaultState'
		@state = new ReactiveVar(Session.get 'loginDefaultState')
	else
		@state = new ReactiveVar('login')

	@validSecretURL = new ReactiveVar(false)

	@validate = ->
		formData = $("#login-card").serializeArray()
		formObj = {}
		validationObj = {}

		for field in formData
			formObj[field.name] = field.value

		if instance.state.get() isnt 'login'
			if formObj['email'] and not /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]+\b/i.test(formObj['email'])
				validationObj['email'] = t('Invalid_email')

		if instance.state.get() isnt 'forgot-password'
			unless formObj['pass']
				validationObj['pass'] = t('Invalid_pass')

		if instance.state.get() is 'register'

			if RocketChat.settings.get('Accounts_NameField') is 'mandatory' and _.isEmpty(_.trim(formObj['name']))
				validationObj['name'] = t('Invalid_name')

			if RocketChat.settings.get('Accounts_EmailField') is 'mandatory' and _.isEmpty(_.trim(formObj['email']))
				validationObj['email'] = 1

			if formObj['confirm-pass'] isnt formObj['pass']
				validationObj['confirm-pass'] = t('Invalid_confirm_pass')


		$("#login-card input").removeClass "error"
		unless _.isEmpty validationObj
			button = $('#login-card').find('button.login')
			RocketChat.Button.reset(button)
			$("#login-card h2").addClass "error"
			for key of validationObj
				$("#login-card input[name=#{key}]").addClass "error"
			return false

		$("#login-card h2").removeClass "error"
		$("#login-card input.error").removeClass "error"
		return formObj

	if FlowRouter.getParam('hash')
		Meteor.call 'checkRegistrationSecretURL', FlowRouter.getParam('hash'), (err, success) =>
			@validSecretURL.set true

Template.loginForm.onRendered ->
	Session.set 'loginDefaultState'
	Tracker.autorun =>
		switch this.state.get()
			when 'login', 'forgot-password', 'email-verification'
				Meteor.defer ->
					$('input[name=email]').select().focus()

			when 'register'
				Meteor.defer ->
					$('input[name=name]').select().focus()
