let io;

module.exports = {
  init: httpServer => {
    io = require('socket.io')(httpServer, {
        cors: {
          origins: [
            "http://localhost:3001",
            "http://localhost:3000",
            "http://localhost:4200",
            "http://localhost:4201",
            "http://localhost:8080",
          ],
        },
      });
    return io;
  },
  getIO: () => {
    if (!io) {
    console.log('socket not connected');
    return false;
    }
    return io;
  }
};