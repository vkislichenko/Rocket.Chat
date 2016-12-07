/* global msgStream, Commands */
msgStream = new Meteor.Streamer('room-messages');

class Visitor {
	constructor() {
		this.token = new ReactiveVar(null);
		this._id = new ReactiveVar(null);
		this.room = new ReactiveVar(null);
		this.roomToSubscribe = new ReactiveVar(null);
		this.roomSubscribed = null;
	}

	register() {
		if (!localStorage.getItem('visitorToken')) {
			localStorage.setItem('visitorToken', Random.id());
		}

		this.token.set(localStorage.getItem('visitorToken'));
	}

	getToken() {
		return this.token.get();
	}

	setRoom(rid) {
		this.room.set(rid);
	}

	userId() {
		return this._id.get();
	}

	setUserId(id) {
		return this._id.set(id);
	}

	getRoom(createOnEmpty = false) {
		let roomId = this.room.get();
		if (!roomId && createOnEmpty) {
			roomId = Random.id();
			this.room.set(roomId);
		}

		return roomId;
	}

	isSubscribed(roomId) {
		return this.roomSubscribed === roomId;
	}

	subscribeToRoom(roomId) {
		if (this.roomSubscribed) {
			if (this.roomSubscribed === roomId) {
				return;
			}
		}

		this.roomSubscribed = roomId;

		msgStream.on(roomId, (msg) => {
			if (msg.t === 'command') {
				Commands[msg.msg] && Commands[msg.msg]();
			} else if (msg.t !== 'livechat_video_call') {
				ChatMessage.upsert({ _id: msg._id }, msg);

				// notification sound
				if (Session.equals('sound', true)) {
					if (msg.u._id !== this._id.get()) {
						$('#chatAudioNotification')[0].play();
					}
				}
			}
		});
	}

	getUsername() {
		return 'tbd';
	}
}

this.visitor = new Visitor();
console.log('new Visitor');
