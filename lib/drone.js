var net = require('net'),
  Processor = require('./processor');


var Drone = function(port) {
  this.port = port;
  this.processor = new Processor();
};


Drone.prototype.start = function() {
  var self = this;

  var server = net.createServer(function (clientStream) {
    console.log('Balancer connected!');

    clientStream.on('data', function(msg) {
      self.processor.process(clientStream, msg);
    });
  });

  server.listen(this.port, function() {
    console.log('Drone started!');
  });
};



module.exports = Drone;