const { createServer } = require("http");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/cluster-adapter");
const { setupWorker } = require("@socket.io/sticky");

const httpServer = createServer();
httpServer.listen(3000);
const io = new Server(httpServer);

io.adapter(createAdapter());

setupWorker(io);

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