const https = require('https');
const groqUsername = "GroqAI";
require('dotenv').config();
const dynamoDb = require('../db/logic.js');

var groqApiKey = process.env.GROQAPIKEY;
// in-memory chat history store
var chatHistories = {}

// generate http options to call groqAI API
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

// build request body for groqAI API
function buildReq(history) {
    const data = {
        model: 'llama3-8b-8192',
        max_tokens: 4000,
        messages: history
    };
    const dataString = JSON.stringify(data);
    return dataString
}

// build the chat history for given message, username and role
function appendHistory(username, role, message) {
    // if no history was found, seed a new history with system prompt
    if (chatHistories[username] == null) {
        chatHistories[username] = [
            {
                role: 'system',
                content: 'You are a friendly chat bot and your purpose is to interact with the user and answer their questions.'
            }
        ]
    }
    // append history given in argument with role
    chatHistories[username].push(
        {
            role: role,
            content: message
        }
    )
    return chatHistories[username]
}

// helper function to massage the chat data for FE to consume
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
    // call GroqAI API for given username and message
    callChatBot: async function callGroqAPI(username, message) {
        return new Promise((resolve, reject) => {
            // record message from user in memory
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
                    // record message response from AI in memory
                    appendHistory(username, "assistant", groqResp.choices[0].message.content)

                    resolve(groqResp.choices[0].message.content);
                })
            });
            request.on('error', reject);
            request.write(dataString);
            request.end();
        })
    },
    // build chat message object to return to FE
    buildChatBotResponse: function buildGroqResp(groqResp) {
        payload = JSON.stringify({
            type: "message",
            message: groqResp,
            userName: groqUsername,
        });
        return payload
    },
    // fetch chat history from memory
    fetchChatHistoryFromMem: function fetchChatByUserNameFromMem(username) {
        return chatHistories[username];
    },
    // fetches and stores chat from DB into memory, and return it to caller
    initChatHistory: async function initChatHistoryFromDB(username) {
        const history = await dynamoDb.loadChatHistory(username);
        chatHistories[username] = history;
        if (history == null) {
            return [];
        }
        return massageChatData(username,history);
    }
};
