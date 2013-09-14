var Drone = require('./lib/drone');

var port = 6001;
var d = new Drone(port);
d.start();