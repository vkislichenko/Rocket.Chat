// @TODO implementar 'clicar na notificacao' abre a janela do chat
const KonchatNotification = {
	notificationStatus: new ReactiveVar,

	// notificacoes HTML5
	getDesktopPermission() {
		if (window.Notification && (Notification.permission !== 'granted') && !Meteor.settings.public.sandstorm) {
			return Notification.requestPermission(function(status) {
				KonchatNotification.notificationStatus.set(status);
				if (Notification.permission !== status) {
					return Notification.permission = status;
				}
			});
		}
	},

	notify(notification) {
		if (window.Notification && Notification.permission === 'granted') {
			const message = { rid: (notification.payload != null ? notification.payload.rid : undefined), msg: notification.text, notification: true };
			return RocketChat.promises.run('onClientMessageReceived', message).then(function(message) {
				const n = new Notification(notification.title, {
					icon: notification.icon || getAvatarUrlFromUsername(notification.payload.sender.username),
					body: _.stripTags(message.msg),
					tag: notification.payload._id,
					silent: true,
					canReply: true
				});

				const user = Meteor.user();

				const notificationDuration = notification.duration - 0 || user && user.settings && user.settings.preferences && user.settings.preferences.desktopNotificationDuration - 0 || RocketChat.settings.get('Desktop_Notifications_Duration');
				if (notificationDuration > 0) {
					setTimeout((() => n.close()), notificationDuration * 1000);
				}

				if (notification.payload && notification.payload.rid) {
					if (n.addEventListener) {
						n.addEventListener('reply', ({response}) =>
							Meteor.call('sendMessage', {
								_id: Random.id(),
								rid: notification.payload.rid,
								msg: response
							})
						);
					}

					n.onclick = function() {
						this.close();
						window.focus();
						switch (notification.payload.type) {
							case 'd':
								return FlowRouter.go('direct', { username: notification.payload.sender.username }, FlowRouter.current().queryParams);
							case 'c':
								return FlowRouter.go('channel', { name: notification.payload.name }, FlowRouter.current().queryParams);
							case 'p':
								return FlowRouter.go('group', { name: notification.payload.name }, FlowRouter.current().queryParams);
						}
					};
				}
			});
		}
	},

	showDesktop(notification) {
		if ((notification.payload.rid === Session.get('openedRoom')) && (typeof window.document.hasFocus === 'function' ? window.document.hasFocus() : undefined)) {
			return;
		}

		if ((Meteor.user().status === 'busy') || (Meteor.settings.public.sandstorm != null)) {
			return;
		}
		/* globals getAvatarAsPng*/
		return getAvatarAsPng(notification.payload.sender.username, function(avatarAsPng) {
			notification.icon = avatarAsPng;
			return KonchatNotification.notify(notification);
		});
	},

	newMessage(rid) {
		if (!Session.equals(`user_${ Meteor.userId() }_status`, 'busy')) {
			const user = Meteor.user();
			const newMessageNotification = user && user.settings && user.settings.preferences && user.settings.preferences.newMessageNotification || 'chime';
			const sub = ChatSubscription.findOne({ rid }, { fields: { audioNotification: 1 } });
			if (sub && sub.audioNotification !== 'none') {
				if (sub && sub.audioNotification) {
					const [audio] = $(`audio#${ sub.audioNotification }`);
					return audio && audio.play && audio.play();
				} else if (newMessageNotification !== 'none') {
					const [audio] = $(`audio#${ newMessageNotification }`);
					return audio && audio.play && audio.play();
				}
			}
		}
	},

	newRoom(rid/*, withSound = true*/) {
		Tracker.nonreactive(function() {
			let newRoomSound = Session.get('newRoomSound');
			if (newRoomSound != null) {
				newRoomSound = _.union(newRoomSound, rid);
			} else {
				newRoomSound = [rid];
			}

			return Session.set('newRoomSound', newRoomSound);
		});
	},

	// $('.link-room-' + rid).addClass('new-room-highlight')

	removeRoomNotification(rid) {
		Tracker.nonreactive(() => Session.set('newRoomSound', []));

		return $(`.link-room-${ rid }`).removeClass('new-room-highlight');
	}
};

Tracker.autorun(function() {
	let audio;
	if ((Session.get('newRoomSound') || []).length > 0) {
		Tracker.nonreactive(function() {
			const user = RocketChat.models.Users.findOne({ _id: Meteor.userId() }, { fields: { 'settings.preferences.newRoomNotification': 1 } });
			const newRoomNotification = user && user.settings && user.settings.preferences && user.settings.preferences.newRoomNotification || 'door';
			if (!Session.equals(`user_${ Meteor.userId() }_status`, 'busy') && newRoomNotification !== 'none') {
				[audio] = $(`audio#${ newRoomNotification }`);
				return audio && audio.play && audio.play();
			}
		});
	} else {
		if (!audio) {
			return;
		}
		if (audio.pause) {
			audio.pause();
			audio.currentTime = 0;
			audio = null;
		}
	}
});
export { KonchatNotification };
this.KonchatNotification = KonchatNotification;
