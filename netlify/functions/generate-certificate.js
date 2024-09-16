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
      parsedBody = JSON.parse(decodedBody);
    } else {
      parsedBody = JSON.parse(event.body);
    }
    
    const { name, course, date, certificateType, issuer, additionalInfo, signatures } = parsedBody;
    console.log('Parsed data:', { name, course, date, certificateType, issuer, additionalInfo, signatures });

    const logoBuffer = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : null;

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