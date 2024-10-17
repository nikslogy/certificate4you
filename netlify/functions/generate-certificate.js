const { generateCertificate } = require('../../backend/certificateGenerator');
const { v4: uuidv4 } = require('uuid');
const { s3, S3_BUCKET_NAME } = require('./config');
const cors = require('cors')({ origin: true });
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const dynamoDb = DynamoDBDocument.from(new DynamoDB({
  region: process.env.MYCERT_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  },
}));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handler = async (event, context) => {
  try {
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

    const apiKey = event.headers['x-api-key'];
    if (!apiKey) {
      throw new Error('API key is required');
    }

    await validateApiKey(apiKey);

    console.log('Received event:', event);
    let parsedBody = parseBody(event.body);
    console.log('Parsed body:', parsedBody);

    if (parsedBody.action === 'initialize') {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent("You are an AI assistant helping to generate certificates. Start by asking for the certificate type.");
      const response = await result.response;
      const text = response.text();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, nextField: 'certificateType' })
      };
    }

    if (parsedBody.action === 'chat') {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const chat = model.startChat({
        history: chatHistory.map(msg => ({ role: msg.type, parts: msg.content }))
      });
      const result = await chat.sendMessage(parsedBody.message);
      const response = await result.response;
      const text = response.text();
      
      // Process the AI response to update formData and determine the next field
      // This part depends on how you want to structure your certificate generation process
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, formData: updatedFormData, nextField: nextField })
      };
    }

    const { name, course, date, certificateType, issuer, additionalInfo, signatures, logo, template } = parsedBody;
    const logoBuffer = logo ? Buffer.from(logo, 'base64') : null;

    const uniqueId = uuidv4();
    console.log('Generated uniqueId:', uniqueId);
    const result = await generateCertificate(name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures || [], template);
    console.log('Certificate generation result:', result);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: result.id, url: result.url })
    };
  } catch (error) {
    console.error('Error generating certificates:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to generate certificates', details: error.message })
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
