const https = require('https');
const groqUsername = "GroqAI";
require('dotenv').config();
const dynamoDb = require('../db/logic.js');

var groqApiKey = process.env.GROQAPIKEY;
// To refactor into database to store
var chatHistories = {}

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

function appendHistory(username, role, message) {
    if (!(username in chatHistories)) {
        chatHistories[username] = [
            {
                role: 'system',
                content: 'You are a friendly chat bot and your purpose is to interact with the user and answer their questions.'
            }
        ]
    }
    var chatHistory = chatHistories[username]
    chatHistory.push(
        {
            role: role,
            content: message
        }
    )
    return chatHistory
}

function massageChatData(username, history) {
    messages = []
    for (const chat of history) {
        if (chat.role == "user") {
            msg = {
                message: chat.content,
                userName: username
            };
        } else if (chat.role == "assistant") {
            
            msg = {
                message: chat.content,
                userName: groqUsername
            };
        } else {
            continue;
        }
        messages.push(msg)
    }
    return messages
}

module.exports = {
    callChatBot: async function callGroqAPI(username, message) {
        return new Promise((resolve, reject) => {
            history = appendHistory(username, "user", message);

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
                    appendHistory(username, "assistant", groqResp.choices[0].message.content)

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
    },
    fetchChatHistoryFromMem: function fetchChatByUserNameFromMem(username) {
        return chatHistories[username];
    },
    initChatHistory: async function initChatHistoryFromDB(username) {
        const history = await dynamoDb.loadChatHistory(username);
        chatHistories[username] = history;
        if (history.length < 1) {
            return [];
        }
        return massageChatData(username,history);
    }
};
