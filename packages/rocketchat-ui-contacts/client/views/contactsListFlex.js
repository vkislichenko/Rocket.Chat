Template.listContactsFlex.helpers({
	list() {
		return RocketChat.models.Contacts.find({
			_id : {
				$nin: [Meteor.userId()]
			}
		});
	}
});

Template.listContactsFlex.events({
	'click .stuff'(event) {
		event.stopPropagation();
		event.preventDefault();
		// return Contacts.doStuff();
	},
	'click .open-room'() {
		return SideNav.closeFlex();
	}
});


Template.listContactsFlex.onCreated(function() {
	const instance = this;
	console.log('contacts : onCreated');
	instance.autorun(function() {
		// subscribe to the contacts publication
		const subscription = instance.subscribe('contactsCollection', function(list) {
			console.log('contacts : instance.subscribe callback', list);
			//Template.contacts.reload();
		});
		console.log('contacts : subscription init', subscription);
		// if subscription is ready, set limit to newLimit
		if (subscription.ready()) {
			console.log('contacts : subscription ready', subscription);
			console.log('contacts : list', RocketChat.models.Contacts.find().count());
		} else {
			console.log('contacts : subscription is not ready yet');
		}
	});
})


Template.listContactsFlex.onRendered(() => Contacts.init());
