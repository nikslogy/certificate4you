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
    const { email, otp, newPassword } = JSON.parse(event.body);

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

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await dynamoDb.update({
      TableName: process.env.DYNAMODB_USERS_TABLE,
      Key: { email },
      UpdateExpression: 'SET password = :password',
      ExpressionAttributeValues: {
        ':password': hashedPassword,
      },
    });

    // Delete the OTP entry
    await dynamoDb.delete({
      TableName: process.env.DYNAMODB_OTP_TABLE,
      Key: { email },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Password reset successfully' }),
    };
  } catch (error) {
    console.error('Error resetting password:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to reset password' }),
    };
  }
};