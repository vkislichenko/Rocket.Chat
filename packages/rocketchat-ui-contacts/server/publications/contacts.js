Meteor.publish('contactsCollection', function() {
	console.log('contacts : publish contactsCollection : init');
	const publication = this;
	if (!publication.userId) {
		return publication.ready();
	}

	const query = {
		type: {
			$in: ['user']
		},
		active : true
	};
	const options = {
		sort: {
			status: 1,
			name: 1
		}
	};


	function getContactFromUser(user) {
		if (!RocketChat.authz.hasRole(user._id, 'user')) { return null; }

		console.log('contacts : getContactFromUser : count', user._id, user.username);
		console.log('contacts : getContactFromUser', RocketChat.models.Contacts.find().count());

		return {
			_id: user._id,
			rid: user.username,
			active: true,
			unread: false,
			alert: false,
			route: `/direct/${ user.username }`,
			name: user.name,
			roomIcon: 'icon-at',
			userStatus: user.status,
			archived: false
		};
	}

	// Observe Users collections
	const observer = RocketChat.models.Users.find(query, options).observe({
		added(user) {
			const contact = getContactFromUser (user);
			if (!contact) { return; }
			publication.added('contactsCollection', contact._id, contact);
		},
		changed(newUser, oldUser) {
			const contact = getContactFromUser (newUser);
			if (!contact) { return; }
			publication.changed('contactsCollection', oldUser._id, contact);
		},
		removed(user) {
			publication.removed('contactsCollection', user._id);
		}
	});
	// Stop observing the cursor when the client unsubscribes. Stopping a
	// subscription automatically takes care of sending the client any `removed`
	// messages.
	publication.onStop(() => observer.stop());

	// Mark the publication as ready (so that the clients know when all data is available)
	//return publication.ready();
	publication.ready();
});
