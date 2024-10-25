const { parse } = require('csv-parse/sync');
const { generateCertificate } = require('../../backend/certificateGenerator');
const { v4: uuidv4 } = require('uuid');
const { s3, dynamoDb } = require('./config');
const JSZip = require('jszip');
const multipart = require('parse-multipart');
const { Buffer } = require('buffer');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handler = async (event, context) => {
  try {
    const { body, headers } = event;
    const contentType = headers['content-type'] || headers['Content-Type'];

    if (!contentType || !contentType.includes('multipart/form-data')) {
      throw new Error('Invalid content type. Expected multipart/form-data.');
    }

    const boundary = multipart.getBoundary(contentType);
    const parts = multipart.Parse(Buffer.from(body, 'base64'), boundary);

    let csvFile, formData, logo, signatures = [], numberOfNames;

    parts.forEach(part => {
      if (part.filename) {
        if (part.filename.endsWith('.csv')) {
          csvFile = part.data.toString('utf8');
        } else if (part.filename.startsWith('logo')) {
          logo = part.data;
        }
      } else if (part.name === 'formData') {
        formData = JSON.parse(part.data.toString('utf8'));
      } else if (part.name.startsWith('signature_')) {
        signatures.push(JSON.parse(part.data.toString('utf8')));
      } else if (part.name === 'numberOfNames') {
        numberOfNames = parseInt(part.data.toString('utf8'));
      }
    });

    let names;
    if (csvFile) {
      const csvData = parse(csvFile, { columns: true, skip_empty_lines: true });
      names = csvData.map(row => row.name);
    } else {
      names = await generateNamesWithGemini(numberOfNames);
    }

    const bulkGenerationId = uuidv4();

    // Start the bulk generation process
    await startBulkGeneration(bulkGenerationId, names, formData, logo, signatures);

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
      signatures
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

  await dynamoDb.update(params).promise();
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