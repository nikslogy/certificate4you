const { generateCertificate } = require('../../backend/certificateGenerator');
const { v4: uuidv4 } = require('uuid');
const { s3, S3_BUCKET_NAME } = require('./config');
const cors = require('cors')({ origin: true });
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const { parse } = require('csv-parse/sync');
const JSZip = require('jszip');

const dynamoDb = DynamoDBDocument.from(new DynamoDB({
  region: process.env.MYCERT_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  },
}));

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

    if (parsedBody.action === 'bulk') {
      return await handleBulkGeneration(parsedBody);
    } else {
      return await handleSingleGeneration(parsedBody);
    }
  } catch (error) {
    console.error('Error generating certificates:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to generate certificates', details: error.message })
    };
  }
};

async function handleSingleGeneration(parsedBody) {
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
}

async function handleBulkGeneration(parsedBody) {
  const { csvFile, formData, logo, signatures } = parsedBody;
  const csvData = parse(csvFile, { columns: true, skip_empty_lines: true });
  const bulkGenerationId = uuidv4();

  // Start the bulk generation process
  await startBulkGeneration(bulkGenerationId, csvData, formData, logo, signatures);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ generationId: bulkGenerationId })
  };
}

async function startBulkGeneration(generationId, csvData, formData, logo, signatures) {
  // Update generation status to 'in-progress'
  await updateGenerationStatus(generationId, 'in-progress');

  const zip = new JSZip();
  const certificates = [];

  const logoBuffer = logo ? Buffer.from(logo, 'base64') : null;

  for (const row of csvData) {
    const certificateData = { 
      ...formData, 
      name: row.name,
      logo: logoBuffer,
      signatures: signatures
    };
    const result = await generateCertificate(certificateData);
    certificates.push(result);
    zip.file(`${row.name}_certificate.pdf`, result.pdfBuffer);
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

  // Upload zip file to S3
  const s3Key = `bulk-certificates/${generationId}.zip`;
  await s3.upload({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: s3Key,
    Body: zipBuffer,
    ContentType: 'application/zip'
  }).promise();

  // Update generation status to 'completed'
  await updateGenerationStatus(generationId, 'completed', s3Key);
}

async function updateGenerationStatus(generationId, status, s3Key = null) {
  const params = {
    TableName: process.env.DYNAMODB_BULK_GENERATIONS_TABLE,
    Key: { generationId },
    UpdateExpression: 'SET #status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': status }
  };

  if (s3Key) {
    params.UpdateExpression += ', s3Key = :s3Key';
    params.ExpressionAttributeValues[':s3Key'] = s3Key;
  }

  await dynamoDb.update(params);
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