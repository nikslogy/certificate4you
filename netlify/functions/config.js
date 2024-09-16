const AWS = require('aws-sdk');
const { S3Client } = require("@aws-sdk/client-s3");

const s3 = new AWS.S3({
  accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  region: process.env.MYCERT_AWS_REGION
});

const s3Client = new S3Client({
  region: process.env.MYCERT_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY
  }
});

module.exports = {
  s3,
  s3Client,
  S3_BUCKET_NAME: process.env.MYCERT_S3_BUCKET_NAME
};