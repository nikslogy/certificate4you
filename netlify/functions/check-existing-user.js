const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");

const dynamoDb = DynamoDBDocument.from(new DynamoDB({
  region: process.env.MYCERT_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  },
}));

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email } = JSON.parse(event.body);

    const result = await dynamoDb.query({
      TableName: process.env.DYNAMODB_API_KEYS_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email
      }
    });
    
      
    if (result.Items && result.Items.length > 0) {
      const user = result.Items[0];
        return {
          statusCode: 200,
          body: JSON.stringify({
            apiKey: user.apiKey,
            remainingLimit: user.limit - user.usageCount,
          }),
        };
      } else {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: 'User not found' }),
        };
      }
  } catch (error) {
    console.error('Error checking existing user:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to check existing user' }),
    };
  }
};