window.SessionsItem = Backbone.ItemView.extend({
    className: 'table-action-buttons',
    template: window.JST['server/item'],
    Model: window.ServerModel
});
