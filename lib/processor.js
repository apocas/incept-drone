var Docker = require('dockerode');

var Processor = function() {
  this.docker = new Docker({socketPath: '/var/run/docker.sock'});
};


Processor.prototype.process = function(clientStream, msg) {
  var raw_content = msg.toString('utf-8');
  var content = JSON.parse(raw_content);

  if(content.container) {
    var container = this.docker.getContainer(content.container);
  }

  switch(content.command) {
    case 'run':
      this.run(content.image, content.cmd, function(err, data) {
        clientStream.end(JSON.stringify({command: 'run', err: err, data: data, payload: content}));
      });
      break;
    case 'start':
      container.start(function (err, data) {
        if(err) {
          clientStream.end(JSON.stringify({command: 'start', err: err, data: data, payload: content}));
        } else {
          container.inspect(function(err, datai) {
            clientStream.end(JSON.stringify({command: 'start', err: err, data: datai, payload: content}));
          });
        }
      });
      break;
    case 'stop':
      container.stop(function (err, data) {
        clientStream.end(JSON.stringify({command: 'stop', err: err, data: data, payload: content}));
      });
      break;
    case 'info':
      container.inspect(function (err, data) {
        clientStream.end(JSON.stringify({command: 'info', err: err, data: data, payload: content}));
      });
      break;
    case 'logs':
      container.attach({logs: true, stream: true, stdout: true, stderr: true}, function(err, cstream) {
        cstream.pipe(clientStream);
      });
      break;
    case 'remove':
      container.stop(function(err, data) {
        if(!err) {
          container.remove(function(err, datar) {
            clientStream.end(JSON.stringify({command: 'remove', err: err, data: datar, payload: content}));
          });
        } else {
          clientStream.end(JSON.stringify({command: 'remove', err: err, data: data, payload: content}));
        }
      });
      break;
  }
};


Processor.prototype.run = function(image, cmd, callback) {

  function handler(err, container) {
    if(err) {
      callback(err, {});
    } else {
      container.start(function(err, data) {
        if(err) {
          callback(err, {id: container.id, info: data});
        } else {
          container.inspect(function(err, datai) {
            callback(err, {id: container.id, info: datai});
          });
        }
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