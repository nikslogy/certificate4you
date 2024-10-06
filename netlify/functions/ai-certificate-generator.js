const { GoogleGenerativeAI } = require("@google/generative-ai");
const { generateCertificate } = require('../../backend/certificateGenerator');
const { v4: uuidv4 } = require('uuid');
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const JSZip = require('jszip');

const s3Client = new S3Client({
  region: process.env.MYCERT_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  },
});

const dynamoDb = DynamoDBDocument.from(new DynamoDB({
  region: process.env.MYCERT_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  },
}));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const templateOptions = [
  'Modern Minimalist',
  'Vibrant Achievement',
  'Classic Elegance',
  'Professional Development',
  'Academic Excellence'
];

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
      return { 
        statusCode: 405, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }
  
    try {
      console.log('Received request:', event.body);
      const { apiKey, fileData, action, ...additionalFields } = JSON.parse(event.body);
  
      console.log('Validating API key');
      const apiKeyData = await validateApiKey(apiKey);
      if (!apiKeyData) {
        return { 
          statusCode: 401, 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid API key' }) 
        };
      }
  
      if (action === 'initialize') {
        // Handle initial AI interaction
        const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
        const prompt = `
          I have a CSV file with the following data: ${JSON.stringify(fileData[0])}.
          Based on this data, please suggest additional fields we should collect to generate certificates.
          For each field, specify:
          1. Field name
          2. Field type (text, dropdown, file, or signature)
          3. Whether it's optional or required
          4. If it's a dropdown, suggest possible options

          Format your response as a JSON object like this:
          {
            "fields": [
              {
                "name": "fieldName",
                "type": "fieldType",
                "optional": true/false,
                "options": ["option1", "option2"] // Only for dropdown fields
              },
              // ... more fields
            ]
          }
        `;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        let parsedFields;
        try {
          parsedFields = JSON.parse(text);
        } catch (error) {
          console.error('Failed to parse AI response:', error);
          parsedFields = { fields: [] };
        }

        const firstField = parsedFields.fields[0] || null;

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [`Based on your data, I suggest collecting the following additional information:`],
            nextField: firstField ? firstField.name : null,
            fieldType: firstField ? firstField.type : null,
            isOptional: firstField ? firstField.optional : false,
            fieldOptions: firstField && firstField.type === 'dropdown' ? firstField.options : [],
            remainingFields: parsedFields.fields.slice(1)
          })
        };
      }
  
      // Rest of the certificate generation logic...
    } catch (error) {
        console.error('Detailed error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Failed to process request',
            details: error.message,
            stack: error.stack
          })
        };
      }
    };

function parseAIResponse(text) {
  // This is a simple parser. You might need to adjust it based on the actual AI output format.
  const lines = text.split('\n');
  return lines.map(line => {
    const [name, type] = line.split(':').map(s => s.trim());
    return { name, type: type.toLowerCase() };
  }).filter(field => field.name && field.type);
}

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
    return null;
  }
  return result.Items[0];
}

async function uploadToS3(buffer, key, contentType) {
  const command = new PutObjectCommand({
    Bucket: process.env.MYCERT_S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType
  });
  return s3Client.send(command);
}

async function getObjectFromS3(key) {
  const command = new GetObjectCommand({
    Bucket: process.env.MYCERT_S3_BUCKET_NAME,
    Key: key
  });
  const response = await s3Client.send(command);
  return streamToBuffer(response.Body);
}

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function generatePresignedUrl(key) {
  const command = new GetObjectCommand({
    Bucket: process.env.MYCERT_S3_BUCKET_NAME,
    Key: key
  });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}