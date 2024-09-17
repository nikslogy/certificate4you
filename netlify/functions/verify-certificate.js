const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { s3Client, S3_BUCKET_NAME } = require('./config');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const id = event.path.split('/').pop();

  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: `certificates/${id}.json`
    });
    
    const response = await s3Client.send(command);
    const certificateData = JSON.parse(await response.Body.transformToString());
    
    const pdfCommand = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: `certificates/${id}.pdf`
    });
    const pdfUrl = await getSignedUrl(s3Client, pdfCommand, { expiresIn: 3600 });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...certificateData, pdfUrl, isValid: true, issuer: certificateData.issuer })
    };
  } catch (error) {
    console.error('Error verifying certificate:', error);
    if (error.name === 'NoSuchKey') {
      return { 
        statusCode: 404, 
        body: JSON.stringify({ error: 'Certificate not found', isValid: false }) 
      };
    }
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Internal server error', isValid: false }) 
    };
  }
};