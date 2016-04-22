/*

Plugin de GRUD para mongoose

Implementa las siguientes rutas

GET     prefix/resource              ->  index
GET     prefix/resource/new          ->  new
POST    prefix/resource              ->  create
GET     prefix/resource/:key       ->  show
GET     prefix/resource/:key/edit  ->  edit
PUT     prefix/resource/:key       ->  update
DELETE  prefix/resource/:key       ->  destroy

options: {
    key: Nombre para el parámetro por defecto = _<resource>
    filter: Cuando index debe ser filtrado lo busca tanto en query como en params de req
    resource: nombre del modelo
    prefix: Prefijo para la ruta
    routes: Array para añadir rutas extras que se añadiran a las rutas base
    mmap: Methods to expose
}

Ejemplo:

filter:'_leaderboard',
resource:'session',
prefix:'/api/leaderboards',
routes: {
    index: ['/api/leaderboards/:_leaderboard/sessions'],
    show: ['/api/leaderboards/:_leaderboard/sessions/:_session'],
    create: ['/api/leaderboards/:_leaderboard/sessions'],
    update: ['/api/leaderboards/:_leaderboard/sessions/:_session'],
    destroy: ['/api/leaderboards/:_leaderboard/sessions/:_session']
},
mmap:

Parametros de REST

pop = populate de mongoose
sel = Lista separada por , de propiedades del modelo, sólo se deloverán estas
limit / offset = Paginación
page / rpp = Paginación,
s = search

*/

var async = require('async');
var debug = require('debug')('crud');

module.exports = exports = function crudMiddleware (schema, options) {

    options.prefix = (options.prefix) ? options.prefix : "";
    options.resource = (options.resource) ? options.resource : schema.options.collection.toLowerCase();
    options.key = (options.key) ? options.key : "_" + options.resource;
    options.forceFilter = (options.forceFilter===false) ? false : true;

    if(!options.routes) options.routes = {};

    (["index","new","create","show","edit","update","destroy"]).forEach(function(key){
        if(!options.routes[key]) options.routes[key] = [];
    });

    options.routes.index.unshift(options.prefix+'/'+options.resource+'s');
    options.routes['new'].unshift(options.prefix+'/'+options.resource+'s/new');
    options.routes.create.unshift(options.prefix+'/'+options.resource+'s');
    options.routes.show.unshift(options.prefix+'/'+options.resource+'s/:_'+options.resource);
    options.routes.edit.unshift(options.prefix+'/'+options.resource+'s/:_'+options.resource + '/edit');
    options.routes.update.unshift(options.prefix+'/'+options.resource+'s/:_'+options.resource);
    options.routes.destroy.unshift(options.prefix+'/'+options.resource+'s/:_'+options.resource);

    // Index
    schema.static({

        /* Options model */
        /* Usarlo con OJO */
        /* Aplica el método options.method a cada uno de los elemntos que encuentra */
        applyEach: function(options,callback) {

            if(!options.method || !options.filter) return callback(new Error('bad-request'));

            this.find(options.filter)
                .exec(function(err,docs){

                    if(err) return callback(err);
                    if(!docs.length) return callback(new Error('not-found'));

                    async.eachSeries(
                        docs,
                        function(doc,callback) {
                            // console.log(doc);
                            // console.log(typeof doc[options.method]);
                            doc[options.method].call(doc,options,function(err) {
                                callback(err);
                            });
                        },
                        function(err) {
                            callback(err);
                        }
                    );
                }
            );
        },

        parseQuery: function(req,query) { // Only for find

            var debug = require('debug')('parseQuery');
            var filter, select, fields, limit, offset, page, rpp;

            if(req.query.pop) {  // Populate
                var pop = req.query.pop.split(';');
                pop.forEach(function(populate) {
                    select = populate.split('|');
                    fields = "";
                    if(select.length==2) fields = select[1].replace(/,/g,' ').trim();
                    query.populate(select[0],fields);
                });
            }

            if(req.query.sel) { // Selected fields
                fields = req.query.sel.replace(/,/g,' ').trim();
                query.select(fields);
            }

            if(req.query.sort) {
                var sort = req.query.sort.replace(/\s/g,'').split(',');
                debug("SORT", sort);
                if (sort.length === 2) {
                    var sortObject = {};
                    sortObject[sort[0]] = sort[1];
                    query.sort(sortObject);
                } else {
                    console.log('sort error');
                }
            }

            if(req.query.page) {
                page = parseInt(req.query.page,10);
                rpp = parseInt(req.query.rpp,10);

                if(isNaN(page) || isNaN(rpp)) return null;
                query.skip(page > 0 ? ((page-1)*rpp) : 0).limit(rpp);
            }
            else if(req.query.limit) {
                offset = parseInt(req.query.offset,10);
                limit = parseInt(req.query.limit,10);

                if(isNaN(offset) || isNaN(limit)) return null;
                query.skip(offset).limit(limit);
            }

            return query;
        },

        routes: function(app,auth,config) {

            var self = this;

            // options.filter
            // options.forcefiler true
            // options.routes.index
            // options.map // Methods to map
            // index
            // app.get('/api/leaderboards/:_leaderboard/sessions',

            //GET O POST

            var staticsRoute = function(req,res,next) {

                var method = "";
                var debug = require('debug')('staticsRoute');
                var method = req.url.split('/').pop();
                var parts = req.url.split('?');
                if(parts.length==2) method = parts[0].split('/').pop();

                debug("Ejecutando [%s]",method);

                var options = {};
                var attrname;
                // Copiar, params, query y body en options

                for (attrname in req.params) { options[attrname] = req.params[attrname]; }
                for (attrname in req.query) { options[attrname] = req.query[attrname]; }
                for (attrname in req.body) { options[attrname] = req.body[attrname]; }

                if(config) options.conf = config;

                if(!self[method]) return next(new Error('no-method'));

                // Ejecutar

                self[method](options,function(err,results) {
                    if(err) {
                        debug("ERR[] %s",err.message);
                        return next(err);
                    }
                    if(results) res.json(200,results);
                    else res.send(200);
                });
            };

            var methodsRoute = function(req,res,next) {

                var debug = require('debug')('methodsRoute');
                var method = req.url.split('/').pop();

                debug("Ejecutando [%s]",method);
                if(!req.params[options.key]) return next(new Error('bad-request'));

                self
                    .findById(req.params[options.key])
                    .exec(function(err,model) {

                        if(err) return next(err);
                        if(!model) return next(new Error('not-found'));
                        if(!model[method]) return next(new Error('no-method'));

                        var options = {};
                        var attrname;
                        // Copiar, params, query y body en options

                        for (attrname in req.params) { options[attrname] = req.params[attrname]; }
                        for (attrname in req.query) { options[attrname] = req.query[attrname]; }
                        for (attrname in req.body) { options[attrname] = req.body[attrname]; }

                        if(config) options.conf = config;

                        // Ejecutar

                        model[method](options,function(err,results) {
                            if(err) {
                                debug("ERR[] %s",err.message);
                                //console.log(typeof err);
                                //console.log(err);
                                return next(err);
                            }
                            if(results) res.json(200,results);
                            else res.send(200);
                        });
                    }
                );
            };

            if(options.mmap) {
                /*
                options.mmap.forEach(function(method){
                    options.routes.show.forEach(function(route){
                        app.get(route+"/"+method,[auth,methodsRoute]);
                    });
                });
                */
                options.mmap.forEach(function(method){

                    options.routes.show.forEach(function(route){

                        var methodURL = (typeof route !== 'string') ? route.path : route;
                        var functions = [auth,methodsRoute];

                        if(typeof method !== 'string') {

                            methodURL += "/" + method.name;
                            if(!method.auth) functions.shift();
                        }
                        else {
                            methodURL += "/" + method;
                        }

                        app.get(methodURL,functions);

                    });
                });
            }

            var routeIndex = function(req,res,next){

                var queryObject = {};
                var err = null;
                var filterKeys = [];

                if(options.filter) {

                    if(typeof options.filter == 'string') filterKeys.push(options.filter);
                    else if(typeof options.filter == 'object') {
                        for(var i in options.filter) {
                            filterKeys.push(options.filter[i]);
                        }
                    }
                }

                if(req.query.s) {
                    var search = req.query.s.split(';');

                    search.forEach(function(part) {
                        var filter = part.split(':');
                        if(filter.length==2) {
                            var key = filter[0].replace(/,/g,' ').trim();
                            filterValue = filter[1].trim();

                            var filterValue;
                            if (filter[1].indexOf(',') >= 0) {
                                var parts = filter[1].trim().split(',');
                                filterValue = {$in: parts};
                                filterValue = [];
                                parts.forEach(function(part) {
                                    var $or = {};
                                    $or[key] = part;
                                    filterValue.push($or);
                                });
                                key = '$or';
                            }

                            queryObject[key] = filterValue;
                        }

                        filter = part.split(':');
                    });
                }


                filterKeys.forEach(function(key){
                    if(!req.params[key] && !req.query[key]) err = new Error('bad-request');
                    else queryObject[key] = (req.params[key]) ? req.params[key] : req.query[key];
                });

                if(err) return next(err);

                var query = self.parseQuery(req,self.find(queryObject));
                if(!query) return next(new Error('bad-request'));

                query.exec(function (err, docs) {
                    if(err) return next(err);
                    if(!docs) return next(new Error('not-found'));
                    res.json(docs);
                });
            };

            options.routes.index.forEach(function(route){

                var routePath = route;
                var functions = [auth,routeIndex];

                if(typeof route !== 'string') {
                    routePath = route.path;
                    if(!route.auth) functions.shift();
                }

                app.get(routePath,functions);
            });

            if(options.smap) {

                options.smap.forEach(function(method){

                    options.routes.index.forEach(function(route){

                        var methodURL = route;
                        var functions = [auth,staticsRoute];

                        if(typeof method !== 'string') {

                            methodURL += "/" + method.name;
                            if(!method.auth) functions.shift();
                        }
                        else {
                            methodURL += "/" + method;
                        }

                        app.get(methodURL,functions);

                    });
                });
            }

            // show
            var routeShow = function(req,res,next){

                if(!req.params[options.key]) return next(new Error('bad-request'));
                var query = self.parseQuery(req,self.findById(req.params[options.key]));

                query.exec(function (err, doc) {
                    if(err) return next(err);
                    if(!doc) return next(new Error('not-found'));
                    console.log('OOOOK');
                    res.json(doc);
                });
            };

            options.routes.show.forEach(function(route){

                var routePath = route;
                var functions = [auth,routeShow];

                if(typeof route !== 'string') {
                    routePath = route.path;
                    if(!route.auth) functions.shift();
                }

                app.get(routePath,functions);
                // app.get(route,[auth,routeShow]);
            });

            // create
            var routeCreate = function(req,res,next){

                self.create(req.body,function (err, doc) {
                    if(err) return next(err);
                    res.json(200,doc);
                });
            };

            options.routes.create.forEach(function(route){

                var routePath = route;
                var functions = [auth,routeCreate];

                if(typeof route !== 'string') {

                    routePath = route.path;
                    if(route.mmap) {
                        // Tiene que ser una ruta static del modelo
                        if(typeof self[route.mmap] === 'function') {
                            functions.pop();
                            functions.push(function(req,res,next){
                                if(config) req.conf = config;
                                self[route.mmap](req,res,next);
                            });
                        }
                    }
                    if(!route.auth) functions.shift();
                }

                app.post(routePath,functions);

            });

            // update
            var routeUpdate = function(req,res,next){

                if(!req.params[options.key]) return next(new Error('bad-request'));
                self.findById(req.params[options.key],function (err, doc) {

                    if(err) return next(err);
                    if(!doc) return next(new Error('not-found'));

                    // ---------------------------------------------------------------
                    // Poder ejecutar métodos sencillos, debe devolver el mismo objeto
                    if(req.body['method']) {

                        var method = req.body['method'];
                        if(!doc[method]) return next(new Error('no-method'));

                        var options = {};
                        var attrname;

                        // Copiar, params, query y body en options
                        /*
                        for (attrname in req.params) { options[attrname] = req.params[attrname]; }
                        for (attrname in req.query) { options[attrname] = req.query[attrname]; }
                        for (attrname in req.body) { options[attrname] = req.body[attrname]; }
                        */

                        // Ejecutar
                        doc[method](options,function(err,results) {
                            if(err) {
                                debug("ERR[] %s",err.message);
                                return next(err);
                            }
                            res.json(200,doc);
                        });

                        return;
                    }

                    // Update
                    for (var key in req.body) {
                        if (key === '_id') continue;
                        doc.set(key,req.body[key]);
                    }

                    doc.save(function (err, doc) {
                        if (err) return next(err);
                        res.json(doc);
                    });
                });
            };

            options.routes.update.forEach(function(route){
                app.put(route,[auth,routeUpdate]);
            });

            // destroy
            var routeDestroy = function(req,res,next){
                if(!req.params[options.key]) return next(new Error('bad-request'));

                self.findByIdAndRemove(req.params[options.key],function(err){
                    if (err) return next(err);
                    res.json(200);
                });
            };

            options.routes.destroy.forEach(function(route){
                app.del(route,[auth,routeDestroy]);
            });
        }
    });
};
