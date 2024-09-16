import React from 'react';
import './ApiGuide.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { solarizedlight } from 'react-syntax-highlighter/dist/esm/styles/prism';

function ApiGuide() {
  const curlExample = `curl -X POST \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "John Doe",
    "course": "Advanced Web Development",
    "date": "2023-04-15",
    "certificateType": "completion",
    "issuer": "Tech Academy",
    "additionalInfo": "Completed with distinction",
    "logo": "base64EncodedLogoString",
    "signatures": [
      {
        "name": "John Smith",
        "image": "base64EncodedSignatureString"
      },
      {
        "name": "Jane Doe",
        "image": "base64EncodedSignatureString"
      }
    ]
  }' \\
  https://certificate4you.netlify.app/.netlify/functions/generate-certificate`;

  const javascriptExample = `const certificateData = {
  name: 'John Doe',
  course: 'Advanced Web Development',
  date: '2023-04-15',
  certificateType: 'completion',
  issuer: 'Tech Academy',
  additionalInfo: 'Completed with distinction',
  logo: 'base64EncodedLogoString',
  signatures: [
    {
      name: 'John Smith',
      image: 'base64EncodedSignatureString'
    },
    {
      name: 'Jane Doe',
      image: 'base64EncodedSignatureString'
    }
  ]
};

fetch('https://certificate4you.netlify.app/.netlify/functions/generate-certificate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(certificateData)
})
.then(response => response.json())
.then(data => {
  if (data.url) {
    window.open(data.url, '_blank');
  } else {
    console.error('No URL returned from server');
  }
})
.catch(error => console.error('Error:', error));`;

  const pythonExample = `import requests
import json

url = 'https://certificate4you.netlify.app/.netlify/functions/generate-certificate'
data = {
    'name': 'John Doe',
    'course': 'Advanced Web Development',
    'date': '2023-04-15',
    'certificateType': 'completion',
    'issuer': 'Tech Academy',
    'additionalInfo': 'Completed with distinction',
    'logo': 'base64EncodedLogoString',
    'signatures': [
        {
            'name': 'John Smith',
            'image': 'base64EncodedSignatureString'
        },
        {
            'name': 'Jane Doe',
            'image': 'base64EncodedSignatureString'
        }
    ]
}

response = requests.post(url, json=data)

if response.status_code == 200:
    result = response.json()
    if 'url' in result:
        print(f"Certificate URL: {result['url']}")
    else:
        print("No URL returned from server")
else:
    print(f"Error: {response.status_code}")
    print(response.text)`;

  return (
    <div className="api-guide">
      <h1>Certificate Generation API Guide</h1>
      
      <section className="overview">
        <h2>Overview</h2>
        <p>This API allows you to generate custom certificates programmatically. You can specify recipient details, course information, include a custom logo, and add up to three signatures.</p>
      </section>

      <section className="endpoint">
        <h2>Endpoint</h2>
        <div className="code-block">
          <SyntaxHighlighter language="http" style={solarizedlight}>
            POST https://certificate4you.netlify.app/.netlify/functions/generate-certificate
          </SyntaxHighlighter>
        </div>
      </section>

      <section className="request-headers">
        <h2>Request Headers</h2>
        <div className="code-block">
          <SyntaxHighlighter language="http" style={solarizedlight}>
            Content-Type: application/json
          </SyntaxHighlighter>
        </div>
      </section>

      <section className="request-body">
        <h2>Request Body</h2>
        <p>The request body should be sent as JSON with the following fields:</p>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Type</th>
                <th>Required</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>name</td>
                <td>string</td>
                <td>Yes</td>
                <td>Recipient's full name</td>
              </tr>
              <tr>
                <td>course</td>
                <td>string</td>
                <td>Yes</td>
                <td>Name of the course or event</td>
              </tr>
              <tr>
                <td>date</td>
                <td>string</td>
                <td>Yes</td>
                <td>Date of completion (YYYY-MM-DD format)</td>
              </tr>
              <tr>
                <td>certificateType</td>
                <td>string</td>
                <td>Yes</td>
                <td>Type of certificate (e.g., 'completion', 'achievement', 'participation')</td>
              </tr>
              <tr>
                <td>issuer</td>
                <td>string</td>
                <td>Yes</td>
                <td>Name of the issuing organization or individual</td>
              </tr>
              <tr>
                <td>additionalInfo</td>
                <td>string</td>
                <td>No</td>
                <td>Any additional information to include on the certificate</td>
              </tr>
              <tr>
                <td>logo</td>
                <td>string</td>
                <td>No</td>
                <td>Base64 encoded string of the logo image</td>
              </tr>
              <tr>
                <td>signatures</td>
                <td>array</td>
                <td>No</td>
                <td>Array of signature objects (up to 3)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>Each signature object in the signatures array should have the following structure:</p>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>name</td>
                <td>string</td>
                <td>Name of the signer</td>
              </tr>
              <tr>
                <td>image</td>
                <td>string</td>
                <td>Base64 encoded string of the signature image</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="response">
        <h2>Response</h2>
        <p>The API responds with a JSON object containing the URL of the generated certificate.</p>
        <ul>
          <li><strong>Content-Type:</strong> application/json</li>
          <li><strong>Status Code:</strong> 200 OK on success</li>
        </ul>
        <div className="code-block">
          <SyntaxHighlighter language="json" style={solarizedlight}>
            {`{
  "url": "https://example.com/path/to/generated/certificate.pdf",
  "id": "unique-certificate-id"
}`}
          </SyntaxHighlighter>
        </div>
      </section>

      <section className="error-responses">
        <h2>Error Responses</h2>
        <p>In case of an error, the API will respond with an appropriate HTTP status code and a JSON object containing an error message.</p>
        <div className="code-block">
          <SyntaxHighlighter language="json" style={solarizedlight}>
            {`{
  "error": "Error message describing the issue"
}`}
          </SyntaxHighlighter>
        </div>
        <p>Possible error status codes:</p>
        <ul>
          <li>400 Bad Request - Invalid input data</li>
          <li>500 Internal Server Error - Server-side error</li>
        </ul>
      </section>

      <section className="example-usage">
        <h2>Example Usage</h2>
        <div className="code-examples">
          <div className="code-example">
            <h3>cURL</h3>
            <SyntaxHighlighter language="bash" style={solarizedlight}>
              {curlExample}
            </SyntaxHighlighter>
          </div>

          <div className="code-example">
            <h3>JavaScript (Fetch API)</h3>
            <SyntaxHighlighter language="javascript" style={solarizedlight}>
              {javascriptExample}
            </SyntaxHighlighter>
          </div>

          <div className="code-example">
            <h3>Python (requests library)</h3>
            <SyntaxHighlighter language="python" style={solarizedlight}>
              {pythonExample}
            </SyntaxHighlighter>
          </div>
        </div>
      </section>

      <section className="notes">
        <h2>Notes</h2>
        <ul>
          <li>Ensure all required fields are provided to avoid errors.</li>
          <li>The logo and signature images should be base64 encoded strings.</li>
          <li>You can include up to three signatures. If you don't need all three, simply include fewer signature objects in the array.</li>
          <li>The generated PDF URL will be returned in the response and can be used to download or display the certificate.</li>
        </ul>
      </section>
    </div>
  );
}

export default ApiGuide;