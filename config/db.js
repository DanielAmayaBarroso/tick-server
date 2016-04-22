module.exports = function(app, tk) {
    tk.mongoose = require('mongoose');
    tk.conn  = tk.mongoose.createConnection('mongodb://localhost/tick');
    var fs = require('fs');

    var modelsFiles = fs.readdirSync(tk.path + '/models');
    modelsFiles.forEach(function(model) {
        require(tk.path + '/models/' + model)(app, tk);
    });


    var auth = function(req, res, next) {
        return next();
    }

    tk.conn.model('Server').routes(app, auth);

    return tk.mongoose;
};
