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
  console.log('DYNAMODB_USERS_TABLE:', process.env.DYNAMODB_USERS_TABLE);
  try {
    const { name, email, password } = JSON.parse(event.body);
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