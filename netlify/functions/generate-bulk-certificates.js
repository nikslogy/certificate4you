const { parse } = require('csv-parse/sync');
const { generateCertificate } = require('../../backend/certificateGenerator');
const { v4: uuidv4 } = require('uuid');
const { s3, dynamoDb } = require('./config');
const JSZip = require('jszip');
const { Buffer } = require('buffer');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const busboy = require('busboy');
const { QueryCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


exports.handler = async (event, context) => {
    try {
      const { body, headers } = event;
      const contentType = headers['content-type'] || headers['Content-Type'];
  
      if (!contentType || !contentType.includes('multipart/form-data')) {
        throw new Error('Invalid content type. Expected multipart/form-data.');
      }
  
      const formData = await parseMultipartForm(body, contentType);
      const { csvFile, formData: formDataJson, logo, signatures, numberOfNames, apiKey } = formData;
  
      // Validate API key
      await validateApiKey(apiKey);
  
      let names;
      if (csvFile) {
        const csvData = parse(csvFile.toString(), { columns: true, skip_empty_lines: true });
        names = csvData.map(row => row.name);
      } else {
        names = await generateNamesWithGemini(parseInt(numberOfNames));
      }
  
      const bulkGenerationId = uuidv4();
  
      // Start the bulk generation process
      await startBulkGeneration(bulkGenerationId, names, JSON.parse(formDataJson), logo, signatures);
  
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generationId: bulkGenerationId })
      };
    } catch (error) {
      console.error('Error starting bulk generation:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to start bulk generation', details: error.message })
      };
    }
  };

function parseMultipartForm(body, contentType) {
  return new Promise((resolve, reject) => {
    const formData = {};
    const bb = busboy({ headers: { 'content-type': contentType } });

    bb.on('file', (name, file, info) => {
      const chunks = [];
      file.on('data', (data) => chunks.push(data));
      file.on('end', () => {
        formData[name] = Buffer.concat(chunks);
      });
    });

    bb.on('field', (name, val) => {
      formData[name] = val;
    });

    bb.on('finish', () => resolve(formData));
    bb.on('error', reject);

    bb.write(Buffer.from(body, 'base64'));
    bb.end();
  });
}

async function startBulkGeneration(generationId, names, formData, logo, signatures) {
  // Update generation status to 'in-progress'
  await updateGenerationStatus(generationId, 'in-progress');

  const zip = new JSZip();
  const certificates = [];

  const logoBuffer = logo ? Buffer.from(logo) : null;

  for (const name of names) {
    const certificateData = { 
      ...formData, 
      name,
      logo: logoBuffer,
      signatures: JSON.parse(signatures)
    };
    const result = await generateCertificate(certificateData);
    certificates.push(result);
    zip.file(`${name}_certificate.pdf`, result.pdfBuffer);
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
  
    await dynamoDb.send(new UpdateCommand(params));
  }

async function generateNamesWithGemini(count) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Generate a list of ${count} random full names, one per line.`;

  try {
    const result = await model.generateContent(prompt);
    const names = result.response.text().split('\n').map(name => name.trim());
    return names;
  } catch (error) {
    console.error('Error generating names with Gemini:', error);
    // Fallback to generating random names
    return Array.from({ length: count }, () => `Person ${Math.floor(Math.random() * 1000)}`);
  }
}

async function validateApiKey(apiKey) {
    if (!apiKey) {
      throw new Error('API key is missing');
    }
  
    try {
      const result = await dynamoDb.send(new QueryCommand({
        TableName: process.env.DYNAMODB_API_KEYS_TABLE,
        IndexName: 'apiKey-index',
        KeyConditionExpression: 'apiKey = :apiKey',
        ExpressionAttributeValues: {
          ':apiKey': apiKey,
        },
      }));
      
      if (!result.Items || result.Items.length === 0) {
        throw new Error('Invalid API key');
      }
      const user = result.Items[0];
    
      if (user.usageCount >= user.limit) {
        throw new Error('API key usage limit exceeded');
      }
    
      await dynamoDb.send(new UpdateCommand({
        TableName: process.env.DYNAMODB_API_KEYS_TABLE,
        Key: { userId: user.userId, apiKey: user.apiKey },
        UpdateExpression: 'SET usageCount = if_not_exists(usageCount, :zero) + :inc',
        ExpressionAttributeValues: { 
          ':inc': 1,
          ':zero': 0
        },
      }));
    
      return user;
    } catch (error) {
      console.error('Error validating or updating API key:', error);
      if (error.name === 'ValidationException') {
        console.error('Validation error. Table name:', process.env.DYNAMODB_API_KEYS_TABLE);
        console.error('API Key:', apiKey);
      }
      throw new Error(`Failed to validate or update API key: ${error.message}`);
    }
  }