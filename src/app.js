const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
sio_redis = require('socket.io-redis'),

dotenv.config();

const app = express();

module.exports.clusterApp = () => {
  // parse json request body
  app.use(express.json());

  // enable cors
  app.use(cors());
  app.options('*', cors());

  // Enabled Access-Control-Allow-Origin", "*" in the header so as to by-pass the CORS error.
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "*");
    res.header("Access-Control-Allow-Credentials", true);
    res.header(
      "Access-Control-Allow-Headers",
      "Origin,Authorization, X-Requested-With, Content-Type, Accept"
    );
    next();
  
    // console.log('now', res);
  });

  // Body Parser
  app.use(express.urlencoded({ extended: false }));

  // Index route
  app.get('/', (req, res) => res.send('Hello World!'));

  // slow Api
  app.get('/api/slow', function (req, res) {
    console.time('slowApi');
    const baseNumber = 7;
    let result = 0;   
    for (let i = Math.pow(baseNumber, 7); i >= 0; i--) {      
      result += Math.atan(i) * Math.tan(i);
    };
    console.timeEnd('slowApi');
  
    console.log(`Result number is ${result} - on process ${process.pid}`);
    res.send(`Result number is ${result}`);
  });

  const PORT = process.env.PORT || 3000;

  const server = app.listen(PORT, console.log(`Server started on port ${PORT}`));
  const io = require('./socket').init(server);
  // const io = require('socket.io')(server);
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    console.log('=================== New Connection ======================')
    console.log('token', token);
    next();
  });
  io.on('connection', (socket) => {
    console.log('a user connected');
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