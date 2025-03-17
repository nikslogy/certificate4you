const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Create S3 client with the correct environment variables
// The error shows we need to use MYCERT_ prefixed variables
const s3Client = new S3Client({
  region: process.env.MYCERT_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY
  }
});

// Use the correct environment variable
const S3_BUCKET_NAME = process.env.MYCERT_S3_BUCKET_NAME;

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const id = event.path.split('/').pop();
  console.log(`Verifying certificate with ID: ${id}`);
  console.log(`Using S3 bucket: ${S3_BUCKET_NAME}`);
  
  // Log environment variables (without revealing secrets)
  console.log(`AWS Region: ${process.env.MYCERT_AWS_REGION}`);
  console.log(`Access Key ID exists: ${!!process.env.MYCERT_AWS_ACCESS_KEY_ID}`);
  console.log(`Secret Access Key exists: ${!!process.env.MYCERT_AWS_SECRET_ACCESS_KEY}`);
  console.log(`S3 Bucket Name: ${S3_BUCKET_NAME}`);

  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: `certificates/${id}.json`
    });
    
    console.log(`Attempting to fetch certificate JSON from S3: certificates/${id}.json`);
    const response = await s3Client.send(command);
    const certificateData = JSON.parse(await response.Body.transformToString());
    console.log(`Certificate data retrieved successfully for ID: ${id}`);
    
    const pdfCommand = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: `certificates/${id}.pdf`
    });
    console.log(`Generating signed URL for PDF: certificates/${id}.pdf`);
    const pdfUrl = await getSignedUrl(s3Client, pdfCommand, { expiresIn: 3600 });
    
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ ...certificateData, pdfUrl, isValid: true, issuer: certificateData.issuer })
    };
  } catch (error) {
    console.error(`Error verifying certificate ${id}:`, error);
    console.error(`Error name: ${error.name}, message: ${error.message}`);
    
    if (error.name === 'NoSuchKey') {
      return { 
        statusCode: 404, 
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Certificate not found', isValid: false }) 
      };
    }
    return { 
      statusCode: 500, 
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error', details: error.message, isValid: false }) 
    };
  }
};