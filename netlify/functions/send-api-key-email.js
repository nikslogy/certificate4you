const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const dynamoDb = DynamoDBDocument.from(new DynamoDB({
  region: process.env.MYCERT_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  },
}));

const sesClient = new SESClient({
  region: process.env.MYCERT_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  },
});

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email } = JSON.parse(event.body);

    // Retrieve the API key from DynamoDB
    const result = await dynamoDb.get({
      TableName: process.env.DYNAMODB_API_KEYS_TABLE,
      Key: { email },
    });

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    const { apiKey, name } = result.Item;

    // Send email using Amazon SES
    const params = {
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Body: {
          Text: {
            Charset: "UTF-8",
            Data: `Hello ${name},\n\nYour API key is: ${apiKey}\n\nPlease keep this key secure and do not share it with others.\n\nBest regards,\nThe Certificate4You Team`,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "Your Certificate4You API Key",
        },
      },
      Source: "hello.certificate4you@gmail.com",
    };

    const command = new SendEmailCommand(params);
    await sesClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'API key sent successfully' }),
    };
  } catch (error) {
    console.error('Error sending API key email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send API key email', details: error.message }),
    };
  }
};