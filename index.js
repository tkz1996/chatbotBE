const express = require('express');
const aiAdapter = require('./ai_adapter/groq_interface.js');
const crypto = require("crypto");
const app = express();
const defaultPort = 80;
const WebSocket = require('websocket');
require('dotenv').config();
var port = process.env.PORT || defaultPort;

// parse request body as json using express library
app.use(express.json())

// define apis to handle
app.get('/test', (req, resp) => {
    console.log("/test API hit");
    resp.status(200).send('success');
});

server = app.listen(port, function (req, resp) {
    console.log(`App online on port:%d`, port);
})

// init websockets
var webSocketServer = new WebSocket.server({
    httpServer: server,
});

webSocketServer.on('request', (request) => {
    const connection = request.accept(null, request.origin);
    
    // get user identifier
    const userID = crypto.randomBytes(16).toString("hex");

    connection.on('message', function (message) {
        // Handle incoming WebSocket messages here
        connection.sendUTF(message.utf8Data)
        messageData = JSON.parse(message.utf8Data);
        console.log(messageData);
        aiAdapter.callChatBot(userID, messageData.message).then(function (groqResp) {
            connection.sendUTF(aiAdapter.buildChatBotResponse(groqResp));
        });
    });

    connection.on('close', (reasonCode, description) => {
        // Handle WebSocket connection closure here
        console.log('websocket closure message');
    });
});
