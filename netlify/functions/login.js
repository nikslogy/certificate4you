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

  try {
    const { email, password } = JSON.parse(event.body);

    const result = await dynamoDb.get({
      TableName: process.env.DYNAMODB_USERS_TABLE,
      Key: { email },
    });

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    const user = result.Item;
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' }),
      };
    }

    const token = jwt.sign({ userId: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    return {
      statusCode: 200,
      body: JSON.stringify({ token }),
    };
  } catch (error) {
    console.error('Error logging in user:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to log in user' }),
    };
  }
};