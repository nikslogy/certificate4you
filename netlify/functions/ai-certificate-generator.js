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
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        console.log('Received request:', event.body);
        const { apiKey, fileData, ...additionalFields } = JSON.parse(event.body);
    
        console.log('Validating API key');
        const apiKeyData = await validateApiKey(apiKey);
        if (!apiKeyData) {
          return { statusCode: 401, body: JSON.stringify({ error: 'Invalid API key' }) };
        }

        console.log('Generating certificates');
        const zip = new JSZip();

        for (const data of fileData) {
          try {
            const certificateData = {
              name: data.name,
              date: data.date,
              course: additionalFields.course,
              certificateType: additionalFields.certificateType,
              issuer: additionalFields.issuer,
              template: additionalFields.template,
              additionalInfo: additionalFields.additionalInfo || '',
              logo: additionalFields.logo || null,
              signatures: additionalFields.signatures || []
            };

            const uniqueId = uuidv4();
            const result = await generateCertificate(certificateData);

            const pdfBuffer = await getObjectFromS3(`certificates/${uniqueId}.pdf`);
            zip.file(`${data.name}_certificate.pdf`, pdfBuffer);
          } catch (certError) {
            console.error(`Error generating certificate for ${data.name}:`, certError);
            // You might want to add this error to a list of failed certificates
          }
        }

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        const zipKey = `bulk_certificates_${Date.now()}.zip`;
        await uploadToS3(zipBuffer, zipKey, 'application/zip');

        const downloadUrl = await generatePresignedUrl(zipKey);

        return {
          statusCode: 200,
          body: JSON.stringify({ url: downloadUrl })
        };

    } catch (error) {
      console.error('Detailed error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to process certificates',
          details: error.message,
          stack: error.stack
        })
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