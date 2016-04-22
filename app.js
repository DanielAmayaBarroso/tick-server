var tk = {path: __dirname};
var app = require(__dirname + '/config/express.js')(tk);
var server = require('http').Server(app);
tk.io = require('socket.io')(server);
tk.db = require(__dirname + '/config/db.js')(app, tk);
require(__dirname + '/config/routes.js')(app);

server.listen(5000);
tk.io.on('connection', function(socket) {
    socket.on('tick', function(tickData) {
        console.log('tick comes', tickData);
        sendTick(tickData);
    })
});

var sendTick = function(tickData) {
    tk.io.emit('tick', tickData);
}
