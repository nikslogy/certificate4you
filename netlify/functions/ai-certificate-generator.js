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
      const { apiKey, fileData, ...additionalFields } = JSON.parse(event.body);
  
      console.log('Validating API key');
      const apiKeyData = await validateApiKey(apiKey);
      if (!apiKeyData) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Invalid API key' }) };
      }
  
      console.log('Processing certificate data');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  
      const requiredFields = ['course', 'issuer', 'certificateType'];
      const missingFields = requiredFields.filter(field => !additionalFields[field]);
  
      if (missingFields.length > 0) {
        const nextField = missingFields[0];
        let prompt = `Based on the following certificate data for multiple people:
        ${JSON.stringify(fileData)}
        
        Additional information provided:
        ${JSON.stringify(additionalFields)}
        
        Please provide guidance for the user to fill in the "${nextField}" field. This will be common for all certificates. Be concise and specific.`;
  
        if (nextField === 'certificateType') {
          prompt += `\nProvide 3-5 options for certificate types as a comma-separated list.`;
        }
  
        const result = await model.generateContent(prompt);
        const aiResponse = result.response.text();
  
        let fieldType = 'text';
        let options = [];
  
        if (nextField === 'certificateType') {
          fieldType = 'dropdown';
          options = aiResponse.split(',').map(option => option.trim());
        }
  
        return {
          statusCode: 200,
          body: JSON.stringify({
            messages: [aiResponse],
            nextField,
            fieldType,
            options,
            isOptional: false
          })
        };
      } else if (additionalFields.additionalInfo === undefined) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            messages: ["Would you like to add any additional information to the certificates? This is optional and will be the same for all certificates."],
            nextField: 'additionalInfo',
            fieldType: 'text',
            isOptional: true
          })
        };
      } else if (additionalFields.signatures === undefined) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            messages: ["Would you like to add any signatures to the certificates? You can add up to 3 signatures. These will be the same for all certificates."],
            nextField: 'signatures',
            fieldType: 'signature',
            isOptional: true
          })
        };
    } else {
      // All required fields are present, generate certificates
      const certificateCount = fileData.length;
      const zip = new JSZip();
      for (const data of fileData) {
        const result = await generateCertificate(
          data.name,
          additionalFields.course,
          data.date,
          additionalFields.certificateType, // Make sure this is passed correctly
          additionalFields.issuer,
          additionalFields.additionalInfo || '',
          additionalFields.logo,
          additionalFields.signatures || [],
          additionalFields.template || 'classic-elegance'
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
          messages: [`Great! All required information has been provided. ${certificateCount} certificates have been generated.`],
          certificateCount,
          template: additionalFields.template || 'modern-minimalist',
          zipUrl,
          remainingUsage: apiKeyData.limit - (apiKeyData.usageCount + certificateCount)
        })
      };
    }
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