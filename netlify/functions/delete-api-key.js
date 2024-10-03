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
  console.log('Event:', JSON.stringify(event, null, 2));

  if (event.httpMethod !== 'DELETE') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { 
      statusCode: 401, 
      body: JSON.stringify({ error: 'Missing or invalid Authorization header' })
    };
  }
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', JSON.stringify(decoded, null, 2));

    const { keyId } = JSON.parse(event.body);
    console.log('KeyId to delete:', keyId);

    const deleteParams = {
      TableName: process.env.DYNAMODB_API_KEYS_TABLE,
      Key: { userId: decoded.userId, apiKey: keyId },
    };
    console.log('Delete params:', JSON.stringify(deleteParams, null, 2));

    const deleteResult = await dynamoDb.delete(deleteParams);
    console.log('Delete result:', JSON.stringify(deleteResult, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'API key deleted successfully' }),
    };
  } catch (error) {
    console.error('Error deleting API key:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid or expired token' })
      };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete API key', details: error.message }),
    };
  }
};