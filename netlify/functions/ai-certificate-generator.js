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

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    console.log('Received request:', event.body);
    const { apiKey, fileData, additionalInfo, logo, signatures, template } = JSON.parse(event.body);

    console.log('Validating API key');
    const apiKeyData = await validateApiKey(apiKey);
    if (!apiKeyData) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid API key' }) };
    }

    console.log('Generating AI content');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `Analyze the following certificate data and provide insights:
    ${JSON.stringify(fileData)}
    
    Additional information provided:
    ${JSON.stringify(additionalInfo)}
    
    1. How many certificates need to be generated?
    2. List all the fields present in the data.
    3. Confirm that all required fields are present (name, course, date, certificateType, issuer).
    4. Acknowledge the additional information and optional fields provided (additionalInfo, logo, signatures).
    5. Confirm the selected certificate template: ${template}.
    6. Are there any patterns or interesting insights in the data?
    
    Respond in a conversational manner, as if you're talking to the user.`;

    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();

    const certificateCount = fileData.length;
    const messages = aiResponse.split('\n').filter(msg => msg.trim() !== '');

    // Generate certificates
    const zip = new JSZip();
    for (const data of fileData) {
      const result = await generateCertificate(
        data.name,
        additionalInfo.course,
        data.date,
        'completion', // You might want to make this configurable
        additionalInfo.issuer,
        additionalInfo.additionalInfo || '',
        logo,
        signatures,
        template
      );

      const pdfBuffer = await getObjectFromS3(`certificates/${result.id}.pdf`);
      zip.file(`${data.name}_certificate.pdf`, pdfBuffer);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipKey = `bulk_certificates/${uuidv4()}.zip`;
    await uploadToS3(zipBuffer, zipKey, 'application/zip');
    const zipUrl = await generatePresignedUrl(zipKey);

    // Update API key usage
    await dynamoDb.update({
      TableName: process.env.DYNAMODB_API_KEYS_TABLE,
      Key: { userId: apiKeyData.userId, apiKey: apiKey },
      UpdateExpression: 'SET usageCount = usageCount + :inc',
      ExpressionAttributeValues: { ':inc': certificateCount },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        messages,
        certificateCount,
        template,
        zipUrl,
        remainingUsage: apiKeyData.limit - (apiKeyData.usageCount + certificateCount)
      })
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