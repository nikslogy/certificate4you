const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const dynamoDb = DynamoDBDocument.from(new DynamoDB({
  region: process.env.MYCERT_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  },
}));

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const token = event.headers.Authorization?.split(' ')[1];
  if (!token) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
const { name, reason } = JSON.parse(event.body);
const apiKey = uuidv4();
const timestamp = new Date().toISOString();

await dynamoDb.put({
  TableName: process.env.DYNAMODB_API_KEYS_TABLE,
  Item: {
    userId: decoded.userId,
    apiKey,
    name,
    reason,
    createdAt: timestamp,
    usageCount: 0,
    limit: 200,
    email: decoded.userId, // Assuming userId is the email
  },
});
    return {
      statusCode: 200,
      body: JSON.stringify({ apiKey, limit: 200 }),
    };
  } catch (error) {
    console.error('Detailed error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to generate API key',
        details: error.message,
        stack: error.stack
      }),
    };
  }
};