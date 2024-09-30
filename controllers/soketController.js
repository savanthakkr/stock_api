const WebSocket = require('ws');

let wss;

const socketFunction = (server) => {
  wss = new WebSocket.Server({ server });

  wss.on('connection', ws => {
    console.log('Client connected');

    ws.on('message', async message => {
      const parsedMessage = JSON.parse(message);
      console.log(`Received message: ${message}`);

      // Save message to the database
      const newMessage = await message.create({
        content: parsedMessage.content,
        senderId: parsedMessage.senderId,
        reciverId: parsedMessage.reciverId,
        type: parsedMessage.type,
        createdAt: new Date()
      });

      // Broadcast the new message to all clients
      broadcastMessage(newMessage);
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });
};

const broadcastMessage = (message) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
};

module.exports = { socketFunction, broadcastMessage };
