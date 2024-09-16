const { generateCertificate } = require('../../backend/certificateGenerator');
const { v4: uuidv4 } = require('uuid');
const { s3 } = require('./config');

const s3 = new AWS.S3({
  accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  region: process.env.MYCERT_AWS_REGION
});

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { name, course, date, certificateType, issuer, additionalInfo, signatures } = JSON.parse(event.body);
    const logoBuffer = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : null;

    const uniqueId = uuidv4();
    const result = await generateCertificate(name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: result.id, url: result.url })
    };
  } catch (error) {
    console.error('Error generating certificate:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to generate certificate' }) };
  }
};