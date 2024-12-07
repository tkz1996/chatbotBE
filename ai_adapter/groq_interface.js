const https = require('https');
require('dotenv').config();
var groqApiKey = process.env.GROQAPIKEY;

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

function buildReq(message) {
    const data = {
        model: 'llama3-8b-8192',
        max_tokens: 4000,
        messages: [
            {
                role: 'system',
                content: 'You are a friendly chat bot and your purpose is to interact with the user and answer their questions.'
            },
            {
                role: 'user',
                content: message
            }
        ]
    };
    const dataString = JSON.stringify(data);
    return dataString
}

module.exports = {
    callChatBot: function callGroqAPI(message) {
        return new Promise((resolve, reject) => {
            dataString = buildReq(message);
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
                    resolve(groqResp.choices[0].message.content);
                })
            });
            request.on('error', reject);
            request.write(dataString);
            request.end();
        })
    }
};
