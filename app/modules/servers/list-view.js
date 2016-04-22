window.SessionsList = Backbone.ListView.extend({
    Collection: window.ServersCollection,
    cache: true,
    ItemView: window.ServerItem,
    template: window.JST['servers/list']
});
