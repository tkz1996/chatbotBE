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
// track which connection belongs to which user
var connectionUsernameMap = {};

// parse request body as json using express library
app.use(express.json());
// enable CORS
app.use(cors());

// ##### Define apis to handle #####
// -------------------------------------
// test API to check health of application
app.get('/test', (req, resp) => {
    console.log("/test API hit");
    resp.status(200).send('success');
});

// fetch chat history for given username
app.post('/chat/history', (req, resp) => {
    console.log(req.body);
    aiAdapter.initChatHistory(req.body['username']).then(function (history) {
        // fix CORS error from browser
        resp.header("Access-Control-Allow-Origin", "*");
        resp.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        resp.status(200).send(history);
    });
});

// fetch chat history for given username
app.post('/profile/create', (req, resp) => {
    dynamoDb.lookupProfile(req.body['username']).then(function (profile) {
        // fix CORS error from browser
        resp.header("Access-Control-Allow-Origin", "*");
        resp.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        // if profile already exists, return 400
        if (!(profile == null)) {
            resp.status(400).send({ errorMessage: "profile already exists" });
            return;
        }
        // save if profile does not exist
        dynamoDb.saveUser(req.body['username'], req.body['password']);
        resp.status(200).send({});
    })
});

// fetch chat history for given username
app.post('/profile/login', (req, resp) => {
    dynamoDb.lookupProfile(req.body['username']).then(function (profile) {
        // fix CORS error from browser
        resp.header("Access-Control-Allow-Origin", "*");
        resp.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

        // if profile does not exist, return 400
        if (profile == null) {
            resp.status(400).send({ errorMessage: "profile does not exist" });
            return;
        }

        // generate and compare password hash, return response accordingly
        const hash = crypto.createHash('sha256');
        const hashedPassword = hash.update(req.body['password']).digest('base64');
        if (!(profile.password == hashedPassword)) {
            resp.status(400).send({ errorMessage: "invalid password" });
            return
        }
        resp.status(200).send({});
    })
});

// start server
server = app.listen(port, defaultIP, function (req, resp) {
    console.log(`App online on port:%d`, port);
})

// init websockets
var webSocketServer = new WebSocket.server({
    httpServer: server,
});

// websocket handshake request handling
webSocketServer.on('request', (request) => {
    // currently acceepting connection from all request origins
    const connection = request.accept(null, request.origin);

    // get connector identifier
    const connectionID = crypto.randomBytes(16).toString("hex");

    // handling when message is received on websocket from client
    connection.on('message', function (message) {
        // send message back to the user for display
        connection.sendUTF(message.utf8Data)
        messageData = JSON.parse(message.utf8Data);

        // if the connection is new, save the username associated to the connection
        if (!(connectionID in connectionUsernameMap)) {
            connectionUsernameMap[connectionID] = messageData.userName
        }
        // trigger chatbot call
        aiAdapter.callChatBot(messageData.userName, messageData.message).then(function (groqResp) {
            connection.sendUTF(aiAdapter.buildChatBotResponse(groqResp));
        });
    });

    // handling when client closes connection
    connection.on('close', (reasonCode, description) => {
        // fetch username from connectionID
        username = connectionUsernameMap[connectionID]
        if (!(username == undefined)) {
            // if a valid username has interacted with the page, save the chat in db
            chatHistory = aiAdapter.fetchChatHistoryFromMem(username)
            dynamoDb.persistChat(username, chatHistory)
        }
        console.log('websocket closed and chat saved for username: %s', username);
    });
});
