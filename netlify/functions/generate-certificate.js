const { generateCertificate } = require('../../backend/certificateGenerator');
const { v4: uuidv4 } = require('uuid');
const { s3, S3_BUCKET_NAME } = require('./config');
const cors = require('cors')({ origin: true });
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");

const dynamoDb = DynamoDBDocument.from(new DynamoDB({
  region: process.env.MYCERT_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  },
}));

exports.handler = async (event, context) => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: 'Method Not Allowed'
    };
  }

  try {
    const apiKey = event.headers['x-api-key'];
    if (!apiKey) {
      throw new Error('API key is required');
    }

    await validateApiKey(apiKey);

    console.log('Received event:', event);
    let parsedBody = parseBody(event.body);
    console.log('Parsed body:', parsedBody);

    const { name, course, date, certificateType, issuer, additionalInfo, signatures, logo } = parsedBody;
    const logoBuffer = logo ? Buffer.from(logo, 'base64') : null;

    const uniqueId = uuidv4();
    console.log('Generated uniqueId:', uniqueId);
    const result = await generateCertificate(name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures || []);
    console.log('Certificate generation result:', result);

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ id: result.id, url: result.url })
    };
  } catch (error) {
    console.error('Detailed error:', error);
    return { 
      statusCode: error.message === 'Invalid API key' || error.message === 'API key usage limit exceeded' ? 403 : 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message, details: error.stack })
    };
  }
};

async function validateApiKey(apiKey) {
  const result = await dynamoDb.query({
    TableName: process.env.DYNAMODB_API_KEYS_TABLE,
    IndexName: 'apiKey-index',
    KeyConditionExpression: 'apiKey = :apiKey',
    ExpressionAttributeValues: {
      ':apiKey': apiKey,
    },
  });
  
  if (!result.Items || result.Items.length === 0) {
    throw new Error('Invalid API key');
  }
  const user = result.Items[0];

  if (user.usageCount >= user.limit) {
    throw new Error('API key usage limit exceeded');
  }

  await dynamoDb.update({
    TableName: process.env.DYNAMODB_API_KEYS_TABLE,
    Key: { userId: user.userId, apiKey: user.apiKey },
    UpdateExpression: 'SET usageCount = usageCount + :inc',
    ExpressionAttributeValues: { ':inc': 1 },
  });

  return user;
}

function parseBody(body) {
  try {
    return JSON.parse(body);
  } catch (error) {
    console.log('Failed to parse JSON, assuming it\'s already an object:', body);
    return body;
  }
}