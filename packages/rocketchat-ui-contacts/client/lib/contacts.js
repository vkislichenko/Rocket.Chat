this.Contacts = (function() {
	const self = {};

	function init() {
		console.log('contacts : lib/contacts.js : init');
		self.box = $('.contacts');

		return self;
	}

	return {
		init
	};
}());
