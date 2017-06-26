Template.contacts.events({
	'click .more-contacts'() {
		event.stopPropagation();
		event.preventDefault();

		SideNav.setFlex('listContactsFlex');
		return SideNav.openFlex();
	}
});

