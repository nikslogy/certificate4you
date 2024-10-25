const AWS = require('aws-sdk');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const s3 = new AWS.S3({
  accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  region: process.env.MYCERT_AWS_REGION
});

const client = new DynamoDBClient({
  region: process.env.MYCERT_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  },
});

const dynamoDb = DynamoDBDocumentClient.from(client);

module.exports = {
  s3,
  dynamoDb,
  S3_BUCKET_NAME: process.env.MYCERT_S3_BUCKET_NAME
};
