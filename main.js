var Server = require('./lib/server');

var port = 6001;
var server = new Server(port);
server.start();