/* globals OnePassword, device, setLanguage */

import toastr from 'toastr';
Template.loginForm.helpers({
	userName() {
		return Meteor.user().username;
	},

	namePlaceholder() {
		return RocketChat.settings.get('Accounts_RequireNameForSignUp') ? t('Name') : t('Name_optional');
	},

	showFormLogin() {
		return RocketChat.settings.get('Accounts_ShowFormLogin');
	},

	state(...args) {
		const state = args.slice(0, args.length - 1);
		return state.indexOf(Template.instance().state.get()) > -1;
	},

	btnLoginSave() {
		switch (Template.instance().state.get()) {
			case 'register':
				return t('Register');
			case 'login':
				return t('Login');
			case 'email-verification':
				return t('Send_confirmation_email');
			case 'forgot-password':
				return t('Reset_password');
		}
	},

	loginTerms() {
		return RocketChat.settings.get('Layout_Login_Terms');
	},

	registrationAllowed() {
		return (RocketChat.settings.get('Accounts_RegistrationForm') === 'Public') || Template.instance().validSecretURL.get();
	},

	linkReplacementText() {
		return RocketChat.settings.get('Accounts_RegistrationForm_LinkReplacementText');
	},

	passwordResetAllowed() {
		return RocketChat.settings.get('Accounts_PasswordReset');
	},

	requirePasswordConfirmation() {
		return RocketChat.settings.get('Accounts_RequirePasswordConfirmation');
	},

	emailOrUsernamePlaceholder() {
		return RocketChat.settings.get('Accounts_EmailOrUsernamePlaceholder') || t('Email_or_username');
	},

	passwordPlaceholder() {
		return RocketChat.settings.get('Accounts_PasswordPlaceholder') || t('Password');
	},

	hasOnePassword() {
		return ((typeof OnePassword !== 'undefined' && OnePassword !== null ? OnePassword.findLoginForUrl : undefined) != null) && (device && device.platform.toLocaleLowerCase() === 'ios');
	}
});

Template.loginForm.events({
	'submit #login-card'(event, instance) {
		event.preventDefault();

		const button = $(event.target).find('button.login');
		button.focus();
		RocketChat.Button.loading(button);

		const formData = instance.validate();
		if (formData) {
			if (instance.state.get() === 'email-verification') {
				Meteor.call('sendConfirmationEmail', s.trim(formData.email), function() {
					RocketChat.Button.reset(button);
					RocketChat.callbacks.run('userConfirmationEmailRequested');
					toastr.success(t('We_have_sent_registration_email'));
					return instance.state.set('login');
				});
				return;
			}

			if (instance.state.get() === 'forgot-password') {
				Meteor.call('sendForgotPasswordEmail', s.trim(formData.email), function(err) {
					if (err) {
						handleError(err);
						return instance.state.set('login');
					} else {
						RocketChat.Button.reset(button);
						RocketChat.callbacks.run('userForgotPasswordEmailRequested');
						toastr.success(t('We_have_sent_password_email'));
						return instance.state.set('login');
					}
				});
				return;
			}

			if (instance.state.get() === 'register') {
				formData.secretURL = FlowRouter.getParam('hash');
				return Meteor.call('registerUser', formData, function(error) {
					RocketChat.Button.reset(button);

					if (error != null) {
						if (error.reason === 'Email already exists.') {
							toastr.error(t('Email_already_exists'));
						} else {
							handleError(error);
						}
						return;
					}

					RocketChat.callbacks.run('userRegistered');

					return Meteor.loginWithPassword(s.trim(formData.email), formData.pass, function(error) {
						if ((error != null ? error.error : undefined) === 'error-invalid-email') {
							toastr.success(t('We_have_sent_registration_email'));
							return instance.state.set('login');
						} else if ((error != null ? error.error : undefined) === 'error-user-is-not-activated') {
							return instance.state.set('wait-activation');
						}
					});
				});

			} else {
				let loginMethod = 'loginWithPassword';
				if (RocketChat.settings.get('LDAP_Enable')) {
					loginMethod = 'loginWithLDAP';
				}
				if (RocketChat.settings.get('CROWD_Enable')) {
					loginMethod = 'loginWithCrowd';
				}
				return Meteor[loginMethod](s.trim(formData.emailOrUsername), formData.pass, function(error) {
					RocketChat.Button.reset(button);
					if (error != null) {
						if (error.error === 'no-valid-email') {
							instance.state.set('email-verification');
						} else {
							toastr.error(t('User_not_found_or_incorrect_password'));
						}
						return;
					}
					if (Meteor.user().language) {
						localStorage.setItem('userLanguage', Meteor.user().language);
						return setLanguage(Meteor.user().language);
					}
				});
			}
		}
	},

	'click .register'() {
		Template.instance().state.set('register');
		return RocketChat.callbacks.run('loginPageStateChange', Template.instance().state.get());
	},

	'click .back-to-login'() {
		Template.instance().state.set('login');
		return RocketChat.callbacks.run('loginPageStateChange', Template.instance().state.get());
	},

	'click .forgot-password'() {
		Template.instance().state.set('forgot-password');
		return RocketChat.callbacks.run('loginPageStateChange', Template.instance().state.get());
	},

	'click .one-passsword'() {
		if (((typeof OnePassword !== 'undefined' && OnePassword !== null ? OnePassword.findLoginForUrl : undefined) == null)) {
			return;
		}

		const succesCallback = function(credentials) {
			$('input[name=emailOrUsername]').val(credentials.username);
			return $('input[name=pass]').val(credentials.password);
		};

		const errorCallback = function() {
			return console.log('OnePassword errorCallback', arguments);
		};

		return OnePassword.findLoginForUrl(succesCallback, errorCallback, Meteor.absoluteUrl());
	}
});


Template.loginForm.onCreated(function() {
	const instance = this;
	this.customFields = new ReactiveVar;

	Tracker.autorun(() => {
		const Accounts_CustomFields = RocketChat.settings.get('Accounts_CustomFields');
		if ((typeof Accounts_CustomFields === 'string') && (Accounts_CustomFields.trim() !== '')) {
			try {
				return this.customFields.set(JSON.parse(RocketChat.settings.get('Accounts_CustomFields')));
			} catch (e) {
				return console.error('Invalid JSON for Accounts_CustomFields');
			}
		} else {
			return this.customFields.set(undefined);
		}
	}
	);

	if (Meteor.settings.public.sandstorm) {
		this.state = new ReactiveVar('sandstorm');
	} else if (Session.get('loginDefaultState')) {
		this.state = new ReactiveVar(Session.get('loginDefaultState'));
	} else {
		this.state = new ReactiveVar('login');
	}

	this.validSecretURL = new ReactiveVar(false);

	const validateCustomFields = function(formObj, validationObj) {
		const customFields = instance.customFields.get();
		if (!customFields) {
			return;
		}

		for (const field in formObj) {
			if (formObj[field]) {
				const value = formObj[field];
				if (customFields[field] != null) {
					const customField = customFields[field];

					if ((customField.required === true) && !value) {
						return validationObj[field] = t('Field_required');
					}

					if ((customField.maxLength != null) && (value.length > customField.maxLength)) {
						return validationObj[field] = t('Max_length_is', customField.maxLength);
					}

					if ((customField.minLength != null) && (value.length < customField.minLength)) {
						return validationObj[field] = t('Min_length_is', customField.minLength);
					}
				}
			}
		}
	};


	this.validate = function() {
		const formData = $('#login-card').serializeArray();
		const formObj = {};
		const validationObj = {};

		for (const field of Array.from(formData)) {
			formObj[field.name] = field.value;
		}

		if (instance.state.get() !== 'login') {
			if (!formObj['email'] || !/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]+\b/i.test(formObj['email'])) {
				validationObj['email'] = t('Invalid_email');
			}
		}

		if (instance.state.get() === 'login') {
			if (!formObj['emailOrUsername']) {
				validationObj['emailOrUsername'] = t('Invalid_email');
			}
		}

		if (instance.state.get() !== 'forgot-password') {
			if (!formObj['pass']) {
				validationObj['pass'] = t('Invalid_pass');
			}
		}

		if (instance.state.get() === 'register') {
			if (RocketChat.settings.get('Accounts_RequireNameForSignUp') && !formObj['name']) {
				validationObj['name'] = t('Invalid_name');
			}

			if (RocketChat.settings.get('Accounts_RequirePasswordConfirmation') && (formObj['confirm-pass'] !== formObj['pass'])) {
				validationObj['confirm-pass'] = t('Invalid_confirm_pass');
			}

			validateCustomFields(formObj, validationObj);
		}

		$('#login-card h2').removeClass('error');
		$('#login-card input.error, #login-card select.error').removeClass('error');
		$('#login-card .input-error').text('');

		if (!_.isEmpty(validationObj)) {
			const button = $('#login-card').find('button.login');
			RocketChat.Button.reset(button);
			$('#login-card h2').addClass('error');
			for (const key in validationObj) {
				if (validationObj[key]) {
					const value = validationObj[key];
					$(`#login-card input[name=${key}], #login-card select[name=${key}]`).addClass('error');
					$(`#login-card input[name=${key}]~.input-error, #login-card select[name=${key}]~.input-error`).text(value);
				}
			}
			return false;
		}

		return formObj;
	};

	if (FlowRouter.getParam('hash')) {
		return Meteor.call('checkRegistrationSecretURL', FlowRouter.getParam('hash'), () => {
			return this.validSecretURL.set(true);
		}
		);
	}
});

Template.loginForm.onRendered(function() {
	Session.set('loginDefaultState');
	return Tracker.autorun(() => {
		RocketChat.callbacks.run('loginPageStateChange', this.state.get());
		switch (this.state.get()) {
			case 'login': case 'forgot-password': case 'email-verification':
				return Meteor.defer(() => $('input[name=email]').select().focus());

			case 'register':
				return Meteor.defer(() => $('input[name=name]').select().focus());
		}
	}
	);
});
