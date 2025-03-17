// netlify/functions/save-template.js
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");

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

exports.handler = async (event, context) => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
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
    const template = JSON.parse(event.body);
    const templateId = template.id;
    const now = new Date().toISOString();
    
    // Add metadata
    template.createdAt = now;
    template.updatedAt = now;
    
    // Store template in S3
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.MYCERT_S3_BUCKET_NAME,
      Key: `templates/${templateId}.json`,
      Body: JSON.stringify(template),
      ContentType: 'application/json'
    }));
    
    // Store template metadata in DynamoDB for easier listing
    await dynamoDb.put({
      TableName: process.env.DYNAMODB_TEMPLATES_TABLE,
      Item: {
        templateId: templateId,
        name: template.name,
        createdAt: now,
        updatedAt: now,
        background: template.background,
        orientation: template.orientation,
        size: template.size
      }
    });
    
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: true, 
        templateId: templateId 
      })
    };
  } catch (error) {
    console.error('Error saving template:', error);
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to save template', 
        details: error.message 
      })
    };
  }
};