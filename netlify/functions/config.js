const AWS = require('aws-sdk');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

// Validate required environment variables
const requiredEnvVars = [
  'MYCERT_AWS_ACCESS_KEY_ID',
  'MYCERT_AWS_SECRET_ACCESS_KEY',
  'MYCERT_AWS_REGION',
  'MYCERT_S3_BUCKET_NAME'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Initialize AWS S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  region: process.env.MYCERT_AWS_REGION
});

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.MYCERT_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  },
});

const dynamoDb = DynamoDBDocumentClient.from(client);

// Export configuration
module.exports = {
  s3,
  dynamoDb,
  S3_BUCKET_NAME: process.env.MYCERT_S3_BUCKET_NAME
};