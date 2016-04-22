window.serversCollection = Backbone.Collection.extend({
    model: serverModel,
    url: '/api/servers'
});
