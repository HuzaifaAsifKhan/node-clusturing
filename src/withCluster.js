// Old Code According to Application


// const os = require('os');
// const numOfCpus = os.cpus().length;
// const cluster = require('cluster');
// const { clusterApp } = require('./app');
// const io = require('./socket').getIO();

// if (cluster.isMaster) {
//   console.log('Primary process ' + process.pid + ' spinning up');
//   for (var i = 0; i < 2; i++) {
//     cluster.fork();
//   }

//   cluster.on('exit', (worker, code, signal) => {
//     console.log(`worker (${i}) ${worker.process.pid} died`);
//   });
// } else if(cluster.isWorker){
//   clusterApp();
//   console.log('worker')
// } else {
//   // clusterApp();
//   // console.log('Worker process ' + process.pid + ' spinning up');
// }







// Link Code working perfect with node cluster


var express = require('express'),
    cluster = require('cluster'),
    net = require('net'),
    sio = require('socket.io'),
    sio_redis = require('socket.io-redis'),
    farmhash = require('farmhash');

var port = 3000,
    num_processes = require('os').cpus().length;


    console.log('Total instances :'+ num_processes)
if (cluster.isMaster) {
	// This stores our workers. We need to keep them to be able to reference
	// them based on source IP address. It's also useful for auto-restart,
	// for example.
	var workers = [];

	// Helper function for spawning worker at index 'i'.
	var spawn = function(i) {
		workers[i] = cluster.fork();

		// Optional: Restart worker on exit
		workers[i].on('exit', function(code, signal) {
			// console.log('respawning worker', i);
			spawn(i);
		});
    };

    // Spawn workers.
	for (var i = 0; i < num_processes; i++) {
		spawn(i);
	}

	// Helper function for getting a worker index based on IP address.
	// This is a hot path so it should be really fast. The way it works
	// is by converting the IP address to a number by removing non numeric
  // characters, then compressing it to the number of slots we have.
	//
	// Compared against "real" hashing (from the sticky-session code) and
	// "real" IP number conversion, this function is on par in terms of
	// worker index distribution only much faster.
	var worker_index = function(ip, len) {
		return farmhash.fingerprint32(ip) % len; // Farmhash is the fastest and works with IPv6, too
	};

	// Create the outside facing server listening on our port.
	var server = net.createServer({ pauseOnConnect: true }, function(connection) {
		// We received a connection and need to pass it to the appropriate
		// worker. Get the worker for this connection's source IP and pass
		// it the connection.
		var worker = workers[worker_index(connection.remoteAddress, num_processes)];
		worker.send('sticky-session:connection', connection);
	}).listen(port);
} else {
    // Note we don't use a port here because the master listens on it for us.
	var app = new express();
  app.get('/', (req, res) => res.send('Hello World!'));
	// Here you might use middleware, attach routes, etc.

	// Don't expose our internal server to the outside.
	var server = app.listen(0, 'localhost'),
	    io = sio(server, {
        cors: {
          origins: [
            "http://localhost:3001",
            "http://localhost:4200",
            "http://localhost:4201",
            "http://localhost:8080",
          ],
        },
      });

	// Tell Socket.IO to use the redis adapter. By default, the redis
	// server is assumed to be on localhost:6379. You don't have to
	// specify them explicitly unless you want to change them.
	io.adapter(sio_redis({ host: 'localhost', port: 6379 }));

	// Here you might use Socket.IO middleware for authorization etc.

	// Listen to messages sent from the master. Ignore everything else.
	process.on('message', function(message, connection) {
		if (message !== 'sticky-session:connection') {
			return;
		}

		// Emulate a connection event on the server by emitting the
		// event with the connection the master sent us.
		server.emit('connection', connection);

		connection.resume();
	});

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    console.log('=================== New Connection ======================')
    console.log('token', token);
    next();
  });
  io.on('connection', (socket) => {
    console.log('a user connected ' + process.pid);
    io.emit('my broadcast', `New User Connected`);
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
    socket.on('my message', (msg) => {
      console.log('message: ' + msg);
      io.emit('my broadcast', `Message Form Server To All: ${msg}`);
    });
  });
}