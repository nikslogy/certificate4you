const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const bcrypt = require('bcryptjs');

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
    const { name, email, password, otp } = JSON.parse(event.body);

    // Verify OTP
    const otpResult = await dynamoDb.get({
      TableName: process.env.DYNAMODB_OTP_TABLE,
      Key: { email },
    });

    if (!otpResult.Item || otpResult.Item.otp !== otp || Date.now() > otpResult.Item.expirationTime) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid or expired OTP' }),
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await dynamoDb.put({
      TableName: process.env.DYNAMODB_USERS_TABLE,
      Item: {
        email,
        name,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
      },
      ConditionExpression: 'attribute_not_exists(email)',
    });

    // Delete the OTP entry
    await dynamoDb.delete({
      TableName: process.env.DYNAMODB_OTP_TABLE,
      Key: { email },
    });

    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'User created successfully' }),
    };
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User already exists' }),
      };
    }
    console.error('Error creating user:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create user' }),
    };
  }
};