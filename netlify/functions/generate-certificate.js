const { generateCertificate } = require('../../backend/certificateGenerator');
const { v4: uuidv4 } = require('uuid');
const { s3, S3_BUCKET_NAME } = require('./config');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    console.log('Received event:', event);
    let parsedBody;

    if (event.isBase64Encoded) {
      const decodedBody = Buffer.from(event.body, 'base64').toString('utf-8');
      parsedBody = parseBody(decodedBody);
    } else {
      parsedBody = parseBody(event.body);
    }

    console.log('Parsed body:', parsedBody);

    const { name, course, date, certificateType, issuer, additionalInfo, signatures } = parsedBody;
    const logoBuffer = parsedBody.logo ? Buffer.from(parsedBody.logo, 'base64') : null;

    const uniqueId = uuidv4();
    console.log('Generated uniqueId:', uniqueId);
    const result = await generateCertificate(name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures);
    console.log('Certificate generation result:', result);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: result.id, url: result.url })
    };
  } catch (error) {
    console.error('Detailed error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to generate certificate', details: error.message, stack: error.stack }) };
  }
};

function parseBody(body) {
  try {
    return JSON.parse(body);
  } catch (error) {
    // If JSON parsing fails, assume it's form data
    const formData = {};
    body.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      formData[decodeURIComponent(key)] = decodeURIComponent(value);
    });
    return formData;
  }
}