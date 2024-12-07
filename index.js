const express = require('express');
const aiAdapter = require('./ai_adapter/groq_interface.js')
const app = express();
const defaultPort = 80;

require('dotenv').config(); 

var port = process.env.PORT || defaultPort;

// parse request body as json using express library
app.use(express.json())

app.get('/test', (req, resp) => {
    console.log("/test API hit"); 
    resp.status(200).send('success');
});

app.post('/chat', (req, resp) => {
    var chatResp;
    console.log("message: %s", req.body);
    aiAdapter.callChatBot(req.body['message']).then(function(message) {
        chatResp = message;
        resp.status(200).send(chatResp);
    });
});

app.get('/', (req, resp) => {
    console.log("homepage hit");
    resp.status(200).send('welcome');
});

app.listen(port, function(req, resp){
    console.log(`App online on port:%d`, port);
});
