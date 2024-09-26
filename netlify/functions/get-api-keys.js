const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const jwt = require('jsonwebtoken');

const dynamoDb = DynamoDBDocument.from(new DynamoDB({
  region: process.env.MYCERT_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  },
}));

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const token = event.headers.Authorization?.split(' ')[1];
  if (!token) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await dynamoDb.query({
      TableName: process.env.DYNAMODB_API_KEYS_TABLE,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': decoded.userId,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ apiKeys: result.Items }),
    };
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch API keys' }),
    };
  }
};