var Docker = require('dockerode'),
  net = require('net');


var Drone = function(port) {
  this.port = port;
  this.docker = new Docker({socketPath: '/var/run/docker.sock'});
};


Drone.prototype.start = function() {
  var self = this;

  var server = net.createServer(function (stream) {
    console.log('Balancer connected!');
    stream.on('data', function(msg) {
      self.processor(stream, msg);
    });
  });

  server.listen(this.port, function() {
    console.log('Drone started!');
  });
};


Drone.prototype.processor = function(stream, msg) {
  var raw_content = msg.toString('utf-8');
  var content = JSON.parse(raw_content);

  if(content.container) {
    var container = this.docker.getContainer(content.container);
  }

  switch(content.command) {
    case 'run':
      this.run(content.image, content.cmd, function(err, data) {
        stream.end(JSON.stringify({command: 'run', err: err, data: data, payload: content}));
      });
      break;
    case 'start':
      container.start(function (err, data) {
        if(err) {
          stream.end(JSON.stringify({command: 'start', err: err, data: data, payload: content}));
        } else {
          container.inspect(function(err, datai) {
            stream.end(JSON.stringify({command: 'start', err: err, data: datai, payload: content}));
          });
        }
      });
      break;
    case 'stop':
      container.stop(function (err, data) {
        stream.end(JSON.stringify({command: 'stop', err: err, data: data, payload: content}));
      });
      break;
    case 'info':
      container.inspect(function (err, data) {
        stream.end(JSON.stringify({command: 'info', err: err, data: data, payload: content}));
      });
      break;
    case 'logs':
      container.attach({logs: true, stream: true, stdout: true, stderr: true}, function(err, cstream) {
        cstream.pipe(stream);
      });
      break;
    case 'remove':
      container.stop(function(err, data) {
        if(!err) {
          container.remove(function(err, datar) {
            stream.end(JSON.stringify({command: 'remove', err: err, data: data, payload: content}));
          });
        } else {
          stream.end(JSON.stringify({command: 'remove', err: err, data: data, payload: content}));
        }
      });
      break;
  }
};


Drone.prototype.run = function(image, cmd, callback) {
  var self = this;

  function handler(err, container) {
    if(err) {
      console.log(err + ' - ' + container);
    } else {
      container.start(function(err, data) {
        console.log('Container created!');
        container.inspect(function(err, datai) {
          callback(err, {id: container.id, info: datai});
        });
      });
    }
  }

  var optsc = {
    'Hostname': '',
    'User': '',
    'AttachStdin': false,
    'AttachStdout': true,
    'AttachStderr': true,
    'Tty': false,
    'OpenStdin': false,
    'StdinOnce': false,
    'Env': null,
    'Cmd': ['bash', '-c', cmd],
    'Dns': ['8.8.8.8', '8.8.4.4'],
    'Image': image,
    'Volumes': {},
    'VolumesFrom': '',
    'PortSpecs': ['80']
  };

  this.docker.createContainer(optsc, handler);
};


module.exports = Drone;