const { parse } = require('csv-parse/sync');
const { generateCertificate } = require('../../backend/certificateGenerator');
const { v4: uuidv4 } = require('uuid');
const { s3, dynamoDb } = require('./config');
const JSZip = require('jszip');

exports.handler = async (event, context) => {
  try {
    const { csvFile, formData } = JSON.parse(event.body);
    const csvData = parse(csvFile, { columns: true, skip_empty_lines: true });
    const bulkGenerationId = uuidv4();

    // Start the bulk generation process
    await startBulkGeneration(bulkGenerationId, csvData, formData);

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

async function startBulkGeneration(generationId, csvData, formData) {
  // Update generation status to 'in-progress'
  await updateGenerationStatus(generationId, 'in-progress');

  const zip = new JSZip();
  const certificates = [];

  for (const row of csvData) {
    const certificateData = { ...formData, name: row.name };
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

  await dynamoDb.update(params).promise();
}