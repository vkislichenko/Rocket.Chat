Meteor.publish('livechat:departmentAgents', function(departmentId) {
	if (!this.userId) {
		return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', { publish: 'livechat:departmentAgents' }));
	}

	if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-rooms')) {
		return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', { publish: 'livechat:departmentAgents' }));
	}
	const filter = departmentId ? { departmentId } : {};
	return RocketChat.models.LivechatDepartmentAgents.find(filter);
});
