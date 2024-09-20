const AWS = require('aws-sdk');
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");

const dynamoDb = DynamoDBDocument.from(new DynamoDB({
  region: process.env.MYCERT_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  },
}));

async function migrateData() {
  const oldItems = await dynamoDb.scan({ TableName: 'ApiKeys' });
  
  for (const item of oldItems.Items) {
    await dynamoDb.put({
      TableName: 'ApiKeys_New',
      Item: {
        email: item.email,
        apiKey: item.apiKey,
        name: item.name,
        reason: item.reason,
        createdAt: item.createdAt,
        usageCount: item.usageCount,
        limit: item.limit
      }
    });
  }
  console.log('Migration completed successfully');
}

migrateData().catch(error => console.error('Migration failed:', error));