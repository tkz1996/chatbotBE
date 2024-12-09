const express = require('express');
const cors = require('cors');
const aiAdapter = require('./ai_adapter/groq_interface.js');
const crypto = require("crypto");
const app = express();
const WebSocket = require('websocket');
const dynamoDb = require('./db/logic.js');
require('dotenv').config();

const defaultPort = 80;
// const defaultIP = 'localhost';
const defaultIP = '172.31.20.19';

var port = process.env.PORT || defaultPort;
var connectionUsernameMap = {};

// parse request body as json using express library
app.use(express.json());
app.use(cors());

// define apis to handle
app.get('/test', (req, resp) => {
    console.log("/test API hit");
    resp.status(200).send('success');
});

app.post('/chat/history', (req, resp) => {
    console.log(req.body);
    aiAdapter.initChatHistory(req.body['username']).then(function (history) {
        // fix CORS error from browser
        resp.header("Access-Control-Allow-Origin", "*");
        resp.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        resp.status(200).send(history);
    });
});

server = app.listen(port, defaultIP, function (req, resp) {
    console.log(`App online on port:%d`, port);
})

// init websockets
var webSocketServer = new WebSocket.server({
    httpServer: server,
});

webSocketServer.on('request', (request) => {
    const connection = request.accept(null, request.origin);

    // get connector identifier
    const connectionID = crypto.randomBytes(16).toString("hex");

    connection.on('message', function (message) {
        // Handle incoming WebSocket messages here
        connection.sendUTF(message.utf8Data)
        messageData = JSON.parse(message.utf8Data);
        if (!(connectionID in connectionUsernameMap)) {
            connectionUsernameMap[connectionID] = messageData.userName
        }
        aiAdapter.callChatBot(messageData.userName, messageData.message).then(function (groqResp) {
            connection.sendUTF(aiAdapter.buildChatBotResponse(groqResp));
        });
    });

    connection.on('close', (reasonCode, description) => {
        // Handle WebSocket connection closure here
        username = connectionUsernameMap[connectionID]
        if (!(username == undefined)) {
            chatHistory = aiAdapter.fetchChatHistoryFromMem(username)
            dynamoDb.persistChat(username, chatHistory)
        }
        console.log('websocket closed and chat saved for username: %s', username);
    });
});
