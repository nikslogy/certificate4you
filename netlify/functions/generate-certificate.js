const { generateCertificate } = require('../../backend/certificateGenerator');
const { v4: uuidv4 } = require('uuid');
const { s3, S3_BUCKET_NAME } = require('./config');
const cors = require('cors')({ origin: true });

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
    console.log('Received event:', event);
    let parsedBody = parseBody(event.body);
    console.log('Parsed body:', parsedBody);

    const { name, course, date, certificateType, issuer, additionalInfo, signatures, logo } = parsedBody;
    const logoBuffer = logo ? Buffer.from(logo, 'base64') : null;

    const uniqueId = uuidv4();
    console.log('Generated uniqueId:', uniqueId);
    const result = await generateCertificate(name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures || []);
    console.log('Certificate generation result:', result);

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ id: result.id, url: result.url })
    };
  } catch (error) {
    console.error('Detailed error:', error);
    return { 
      statusCode: 500, 
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to generate certificate', details: error.message, stack: error.stack }) 
    };
  }
};

function parseBody(body) {
  try {
    return JSON.parse(body);
  } catch (error) {
    console.log('Failed to parse JSON, assuming it\'s already an object:', body);
    return body;
  }
}