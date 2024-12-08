const https = require('https');
const groqUsername = "GroqAI";
require('dotenv').config();

var groqApiKey = process.env.GROQAPIKEY;
// To refactor into database to store
var chatHistory = {}

function generateOptions(objectLength) {
    var postheaders = {
        'Content-Type': 'application/json',
        'Content-Length': objectLength,
        'Authorization': 'Bearer ' + groqApiKey
    };
    var options = {
        host: 'api.groq.com',
        port: 443,
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: postheaders
    };
    return options
}

function buildReq(history) {
    const data = {
        model: 'llama3-8b-8192',
        max_tokens: 4000,
        messages: history
    };
    const dataString = JSON.stringify(data);
    return dataString
}

function appendHistory(recipient, role, message) {
    if (!(recipient in chatHistory)) {
        chatHistory[recipient] = [
            {
                role: 'system',
                content: 'You are a friendly chat bot and your purpose is to interact with the user and answer their questions.'
            }
        ]
    }
    chatHistory[recipient].push(
        {
            role: role,
            content: message
        }
    )
    return chatHistory[recipient]
}

module.exports = {
    callChatBot: async function callGroqAPI(recipient, message) {
        return new Promise((resolve, reject) => {
            // To persist requested message and entire history here
            history = appendHistory(recipient, "user", message)
            dataString = buildReq(history);
            options = generateOptions(dataString.length);
            request = https.request(options, resp => {
                var groqResp;
                const respData = [];
                console.log('STATUS: ' + resp.statusCode);
                resp.setEncoding('utf8');
                resp.on('data', function (chunk) {
                    respData.push(chunk);
                });
                resp.on('end', () => {
                    groqResp = JSON.parse(respData.join(''));
                    console.log(groqResp);
                    // To persist response and entire history here
                    appendHistory(recipient, "assistant", groqResp.choices[0].message.content)

                    resolve(groqResp.choices[0].message.content);
                })
            });
            request.on('error', reject);
            request.write(dataString);
            request.end();
        })
    },
    buildChatBotResponse: function buildGroqResp(groqResp) {
        payload = JSON.stringify({
            type: "message",
            message: groqResp,
            userName: groqUsername,
        });
        return payload
    }
};
