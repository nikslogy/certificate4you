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

    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });

    const requiredFields = ['course', 'issuer', 'certificateType', 'template'];
    const optionalFields = ['additionalInfo', 'logo', 'signatures'];
    const missingFields = requiredFields.filter(field => !additionalFields[field]);
    const missingOptionalFields = optionalFields.filter(field => !additionalFields[field]);

    if (missingFields.length > 0) {
      const nextField = missingFields[0];
      let prompt = `Based on the following certificate data for multiple people:
      ${JSON.stringify(fileData)}
      
      Additional information provided:
      ${JSON.stringify(additionalFields)}
      
      Please provide guidance for the user to fill in the "${nextField}" field. This will be common for all certificates. Be concise and specific.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        statusCode: 200,
        body: JSON.stringify({
          messages: [text],
          nextField,
          fieldType: nextField === 'template' ? 'dropdown' : 'text',
          options: nextField === 'template' ? templateOptions : [],
          isOptional: false
        })
      };
    } else if (missingOptionalFields.length > 0) {
      const nextField = missingOptionalFields[0];
      return {
        statusCode: 200,
        body: JSON.stringify({
          messages: [`Would you like to add ${nextField}? This is optional.`],
          nextField,
          fieldType: nextField === 'signatures' ? 'signature' : (nextField === 'logo' ? 'file' : 'text'),
          options: [],
          isOptional: true
        })
      };
    }

    // All fields are provided, generate certificates
    console.log('Generating certificates');
    const zip = new JSZip();

    for (const data of fileData) {
      const uniqueId = uuidv4();
      const result = await generateCertificate(
        data['full name'], // Assuming the column name is 'full name'
        additionalFields.course,
        data.date,
        additionalFields.logo,
        additionalFields.certificateType,
        additionalFields.issuer,
        additionalFields.additionalInfo,
        additionalFields.signatures,
        additionalFields.template
      );

      const pdfBuffer = await getObjectFromS3(`certificates/${uniqueId}.pdf`);
      zip.file(`${data['full name']}_certificate.pdf`, pdfBuffer);
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