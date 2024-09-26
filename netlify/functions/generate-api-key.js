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

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Missing or invalid Authorization header:', authHeader);
    return { statusCode: 401, body: JSON.stringify({ error: 'Missing or invalid Authorization header' }) };
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('No token found in Authorization header');
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
    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid token', details: error.message }),
      };
    }
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