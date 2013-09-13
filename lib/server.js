var Docker = require('dockerode'),
  net = require('net');


var Server = function(port) {
  this.port = port;
  this.docker = new Docker({socketPath: '/var/run/docker.sock'});
};


Server.prototype.start = function() {
  var self = this;

  var server = net.createServer(function (stream) {
    console.log('Balancer connected!');
    stream.on('data', function(msg) {
      self.processor(stream, msg);
    });
  });

  server.listen(this.port, function() {
    console.log('Node started!');
  });
};


Server.prototype.processor = function(stream, msg) {
  var raw_content = msg.toString('utf-8');
  var content = JSON.parse(raw_content);

  if(content.container) {
    var container = this.docker.getContainer(content.container);
  }

  switch(content.command) {
    case 'run':
      console.log('Payload received: ' + content.language + ' - ' + content.repository);
      var image = this.getImage(content.language);
      var cmd = this.getCmd(content.language, content.repository);

      this.run(image, cmd, function(err, data) {
        stream.write(JSON.stringify({command: 'running', err: err, data: data, payload: content}));
      });
      break;
    case 'start':
      container.start(function (err, data) {
        stream.end(JSON.stringify(data));
      });
      break;
    case 'stop':
      container.stop(function (err, data) {
        stream.end(JSON.stringify(data));
      });
      break;
    case 'status':
      container.inspect(function (err, data) {
        stream.end(JSON.stringify(data));
      });
      break;
    case 'logs':
      container.attach({logs: true, stream: true, stdout: true, stderr: true}, function(err, cstream) {
        cstream.pipe(stream);
      });
      break;
  }
};


Server.prototype.run = function(image, cmd, callback) {
  var self = this;

  function handler(err, container) {
    if(err) {
      console.log(err + ' - ' + container);
    } else {
      container.start(function(err, data) {
        console.log('Container created!');
        callback(err, {id: container.id});
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


Server.prototype.getImage = function(language) {
  switch(language) {
    case 'php':
    case 'html':
      return 'apocas/lamp';
    case 'nodejs':
      return 'apocas/node';
  }
};


Server.prototype.getCmd = function(language, repo) {
  switch(language) {
    case 'php':
    case 'html':
      return 'git clone ' + repo + ' /var/www/html; /sbin/service httpd start; tail -f /var/log/httpd/error_log';
    case 'nodejs':
      return 'git clone ' + repo + ' module; cd module; npm start';
  }
};


module.exports = Server;