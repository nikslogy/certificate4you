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
    const { keyId } = JSON.parse(event.body);
    const newApiKey = uuidv4();

    const result = await dynamoDb.update({
        TableName: process.env.DYNAMODB_API_KEYS_TABLE,
        Key: { userId: decoded.userId, apiKey: keyId },
        UpdateExpression: 'set apiKey = :newApiKey',
        ExpressionAttributeValues: {
          ':newApiKey': newApiKey,
        },
        ReturnValues: 'ALL_NEW',
      });

    return {
      statusCode: 200,
      body: JSON.stringify({ apiKey: result.Attributes }),
    };
  } catch (error) {
    console.error('Error regenerating API key:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to regenerate API key' }),
    };
  }
};