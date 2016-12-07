class LivechatVisitors extends RocketChat.models._Base {
	constructor() {
		super('livechat_visitors');

		// @TODO add index profile.token
	}

	findById(userId) {
		const query = {
			_id: userId
		};

		return this.find(query);
	}

	/**
	 * Gets visitor by token
	 * @param {string} token - Visitor token
	 */
	getVisitorByToken(token, options) {
		const query = {
			'profile.guest': true,
			'profile.token': token
		};

		return this.findOne(query, options);
	}

	/**
	 * Gets visitor by token
	 * @param {string} token - Visitor token
	 */
	findVisitorByToken(token) {
		const query = {
			'profile.guest': true,
			'profile.token': token
		};

		return this.find(query);
	}

	updateLivechatDataByToken(token, key, value) {
		const query = {
			'profile.token': token
		};

		const update = {
			$set: {
				[`livechatData.${key}`]: value
			}
		};

		return this.update(query, update);
	}

	/**
	 * Find a visitor by their phone number
	 * @return {object} User from db
	 */
	findOneVisitorByPhone(phone) {
		const query = {
			'phone.phoneNumber': phone
		};

		return this.findOne(query);
	}

	/**
	 * Get the next visitor name
	 * @return {string} The next visitor name
	 */
	getNextVisitorUsername() {
		const settingsRaw = RocketChat.models.Settings.model.rawCollection();
		const findAndModify = Meteor.wrapAsync(settingsRaw.findAndModify, settingsRaw);

		const query = {
			_id: 'Livechat_guest_count'
		};

		const update = {
			$inc: {
				value: 1
			}
		};

		const livechatCount = findAndModify(query, null, update);

		return 'guest-' + (livechatCount.value.value + 1);
	}

	saveInfoById(_id, data) {
		const setData = {};
		const unsetData = {};

		if (data.name) {
			if (!_.isEmpty(s.trim(data.name))) {
				setData.name = s.trim(data.name);
			} else {
				unsetData.name = 1;
			}
		}

		if (data.email) {
			if (!_.isEmpty(s.trim(data.email))) {
				setData.emails = [{
					address: s.trim(data.email)
				}];
			} else {
				unsetData.name = 1;
			}
		}

		if (data.phone) {
			if (!_.isEmpty(s.trim(data.phone))) {
				setData.phone = [{
					phoneNumber: s.trim(data.phone)
				}];
			} else {
				unsetData.phone = 1;
			}
		}

		const update = {};

		if (!_.isEmpty(setData)) {
			update.$set = setData;
		}

		if (!_.isEmpty(unsetData)) {
			update.$unset = unsetData;
		}

		if (_.isEmpty(update)) {
			return true;
		}

		return this.update({ _id: _id }, update);
	}

	findOneByEmailAddress(emailAddress, options) {
		const query = {
			'emails.address': new RegExp('^' + s.escapeRegExp(emailAddress) + '$', 'i')
		};

		return this.findOne(query, options);
	}
}

RocketChat.models.Visitors = new LivechatVisitors();
