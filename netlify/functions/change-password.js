const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

  const token = event.headers.authorization.split(' ')[1];
  const { newPassword } = JSON.parse(event.body);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.userId;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await dynamoDb.update({
      TableName: process.env.DYNAMODB_USERS_TABLE,
      Key: { email },
      UpdateExpression: 'SET password = :password',
      ExpressionAttributeValues: {
        ':password': hashedPassword,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Password changed successfully' }),
    };
  } catch (error) {
    console.error('Error changing password:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to change password' }),
    };
  }
};