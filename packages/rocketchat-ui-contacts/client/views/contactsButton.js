Template.contacts.events({
	'click .more-contacts'() {
		event.stopPropagation();
		event.preventDefault();

		SideNav.setFlex('listContactsFlex');
		return SideNav.openFlex();
	}
});

Template.contacts.onCreated(function() {
	const instance = this;
	console.log('contacts button : onCreated');
});




Template.sideNav.onRendered(function() {
	Blaze.render(Template.contacts, $('ul.rooms-list__list.type-d').get(0));
});
