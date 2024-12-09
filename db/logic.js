require('dotenv').config();
const createHash = require("crypto");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, QueryCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");

var dynamoDBKeyId = process.env.AWS_DYNAMO_DB_ACCESS_KEY_ID
var dynamoDBAccessKey = process.env.AWS_DYNAMO_DB_SECRET_ACCESS_KEY

const client = new DynamoDBClient({
    region: 'ap-southeast-1',
    credentials: {
        accessKeyId: dynamoDBKeyId,
        secretAccessKey: dynamoDBAccessKey
    }
})
const docClient = DynamoDBDocumentClient.from(client);

module.exports = {
    // persist username and password in db 
    saveUser: function saveUserInDB(userName, password) {
        const hash = createHash('sha256');
        const hashedPassword = hash.write(password).digest('base64')
        const saveNewUser = new PutCommand({
            TableName: 'users',
            Item: {
                username: userName,
                password: hashedPassword,
            }
        })
        docClient.send(saveNewUser);
    },
    // query profile with given username
    lookupProfile: function lookupProfileWithUsername(userName) {
        const fetchUserByUserName = new QueryCommand({
            TableName: 'users',
            KeyConditionExpression: "#username = :userName",
            ExpressionAttributeNames: {
                "#username": "username"
            },
            ExpressionAttributeValues: {
                ":userName": userName,
            }
        });
        docClient.send(fetchUserByUserName).then(function (result) {
            console.log(result)
            if (result.Count == 0) {
                console.log('no profile found')
                return null
            }
            console.log(result.Items[0])
            return result.Items[0];
        });
    },
    // store chat in db for given username
    persistChat: function persistChatHistoryToDB(username, history) {
        const saveChatHistory = new PutCommand({
            TableName: 'chat_history',
            Item: {
                username: username,
                history: history,
            }
        })
        docClient.send(saveChatHistory);
    },
    // load chat from db for given username
    loadChatHistory: async function lookupHistoryWithUsername(userName) {
        const fetchHistoryByUserName = new QueryCommand({
            TableName: 'chat_history',
            KeyConditionExpression: "#username = :userName",
            ExpressionAttributeNames: {
                "#username": "username"
            },
            ExpressionAttributeValues: {
                ":userName": userName,
            }
        });
        const result = await docClient.send(fetchHistoryByUserName)
        console.log(result)
        if (result.Items.length == 0) {
            return null
        }
        return result.Items[0].history
    }
}