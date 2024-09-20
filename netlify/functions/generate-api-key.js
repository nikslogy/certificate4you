const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require('uuid');

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

  try {
    const { name, email, reason } = JSON.parse(event.body);
    const apiKey = uuidv4();
    const timestamp = new Date().toISOString();

    await dynamoDb.put({
      TableName: process.env.DYNAMODB_API_KEYS_TABLE,
      Item: {
        apiKey,
        name,
        email,
        reason,
        createdAt: timestamp,
        usageCount: 0,
        limit: 200,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ apiKey }),
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