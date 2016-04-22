module.exports = function(tk) {
    var app = require('express')();

    var express = require('express');
    var path = require('path');

    var favicon = require('serve-favicon');
    var logger = require('morgan');
    var methodOverride = require('method-override');
    var session = require('express-session');
    var bodyParser = require('body-parser');
    var multer = require('multer');
    var errorHandler = require('errorhandler');

    var app = express();

    // all environments
    app.set('port', process.env.PORT || 3000);
    app.set('views', path.join(tk.path, 'views'));
    app.set('view engine', 'pug');
    app.use(logger('dev'));
    app.use(methodOverride());
    app.use(session({ resave: true,
                      saveUninitialized: true,
                      secret: 'uwotm8' }));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(multer());
    app.use(express.static(path.join(tk.path, 'public')));


    var enableCORS = function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
        if ('OPTIONS' == req.method) {
            res.send(200);
        } else {
            next();
        }
    };

    app.use(enableCORS);


    return app;
};
