module.exports = function(app, tk) {

    var async = require('async');
    var crud = require(tk.path + '/libs/crud.js');

    ServerSchema = new tk.mongoose.Schema({
        name: {
            type: String,
            default: ""
        },
        key: {
            type: String,
            default: ""
        }
    });

    ServerSchema.plugin(crud,{
        resource:'server',
        prefix:'/api'
    });

    tk.mongoose.model('Server', ServerSchema);
};
