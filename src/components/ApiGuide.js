import React from 'react';
import './ApiGuide.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { solarizedlight } from 'react-syntax-highlighter/dist/esm/styles/prism';

function ApiGuide() {
  const curlExample = `curl -X POST \\
  -F "name=John Doe" \\
  -F "course=Advanced Web Development" \\
  -F "date=2023-04-15" \\
  -F "certificateType=completion" \\
  -F "issuer=Tech Academy" \\
  -F "additionalInfo=Completed with distinction" \\
  -F "logo=@/path/to/logo.png" \\
  -F "signatureName1=John Smith" \\
  -F "signature1=data:image/png;base64,iVBORw0KGgo..." \\
  -F "signatureName2=Jane Doe" \\
  -F "signature2=data:image/png;base64,iVBORw0KGgo..." \\
  -F "signatureName3=Bob Johnson" \\
  -F "signature3=data:image/png;base64,iVBORw0KGgo..." \\
  http://localhost:3001/api/generate-certificate \\
  --output certificate.pdf`;

  const javascriptExample = `const formData = new FormData();
formData.append('name', 'John Doe');
formData.append('course', 'Advanced Web Development');
formData.append('date', '2023-04-15');
formData.append('certificateType', 'completion');
formData.append('issuer', 'Tech Academy');
formData.append('additionalInfo', 'Completed with distinction');
formData.append('logo', logoFile); // File object
formData.append('signatureName1', 'John Smith');
formData.append('signature1', signatureBase64_1);
formData.append('signatureName2', 'Jane Doe');
formData.append('signature2', signatureBase64_2);
formData.append('signatureName3', 'Bob Johnson');
formData.append('signature3', signatureBase64_3);

fetch('http://localhost:3001/api/generate-certificate', {
  method: 'POST',
  body: formData
})
.then(response => response.blob())
.then(blob => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'certificate.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
})
.catch(error => console.error('Error:', error));`;

  const pythonExample = `import requests

url = 'http://localhost:3001/api/generate-certificate'
files = {
    'logo': ('logo.png', open('/path/to/logo.png', 'rb'), 'image/png')
}
data = {
    'name': 'John Doe',
    'course': 'Advanced Web Development',
    'date': '2023-04-15',
    'certificateType': 'completion',
    'issuer': 'Tech Academy',
    'additionalInfo': 'Completed with distinction',
    'signatureName1': 'John Smith',
    'signature1': 'data:image/png;base64,iVBORw0KGgo...',
    'signatureName2': 'Jane Doe',
    'signature2': 'data:image/png;base64,iVBORw0KGgo...',
    'signatureName3': 'Bob Johnson',
    'signature3': 'data:image/png;base64,iVBORw0KGgo...'
}

response = requests.post(url, files=files, data=data)

if response.status_code == 200:
    with open('certificate.pdf', 'wb') as f:
        f.write(response.content)
    print('Certificate downloaded successfully')
else:
    print(f'Error: {response.status_code}')
    print(response.json())`;

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
            POST http://localhost:3001/api/generate-certificate
          </SyntaxHighlighter>
        </div>
      </section>

      <section className="request-headers">
        <h2>Request Headers</h2>
        <div className="code-block">
          <SyntaxHighlighter language="http" style={solarizedlight}>
            Content-Type: multipart/form-data
          </SyntaxHighlighter>
        </div>
      </section>

      <section className="request-body">
        <h2>Request Body</h2>
        <p>The request body should be sent as <code>multipart/form-data</code> with the following fields:</p>
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
              <td>file</td>
              <td>No</td>
              <td>Image file for the logo (supported formats: PNG, JPEG)</td>
            </tr>
            <tr>
              <td>signatureName1</td>
              <td>string</td>
              <td>No</td>
              <td>Name of the first signer</td>
            </tr>
            <tr>
              <td>signature1</td>
              <td>string</td>
              <td>No</td>
              <td>Base64 encoded image of the first signature</td>
            </tr>
            <tr>
              <td>signatureName2</td>
              <td>string</td>
              <td>No</td>
              <td>Name of the second signer</td>
            </tr>
            <tr>
              <td>signature2</td>
              <td>string</td>
              <td>No</td>
              <td>Base64 encoded image of the second signature</td>
            </tr>
            <tr>
              <td>signatureName3</td>
              <td>string</td>
              <td>No</td>
              <td>Name of the third signer</td>
            </tr>
            <tr>
              <td>signature3</td>
              <td>string</td>
              <td>No</td>
              <td>Base64 encoded image of the third signature</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="response">
        <h2>Response</h2>
        <p>The API responds with a PDF file containing the generated certificate.</p>
        <ul>
          <li><strong>Content-Type:</strong> application/pdf</li>
          <li><strong>Status Code:</strong> 200 OK on success</li>
        </ul>
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
          <h3>cURL</h3>
          <SyntaxHighlighter language="bash" style={solarizedlight}>
            {curlExample}
          </SyntaxHighlighter>

          <h3>JavaScript (Fetch API)</h3>
          <SyntaxHighlighter language="javascript" style={solarizedlight}>
            {javascriptExample}
          </SyntaxHighlighter>

          <h3>Python (requests library)</h3>
          <SyntaxHighlighter language="python" style={solarizedlight}>
            {pythonExample}
          </SyntaxHighlighter>
        </div>
      </section>

      <section className="notes">
        <h2>Notes</h2>
        <ul>
          <li>Ensure all required fields are provided to avoid errors.</li>
          <li>The logo file should be a reasonable size to prevent large payloads.</li>
          <li>Signatures should be provided as base64 encoded image strings.</li>
          <li>You can include up to three signatures. If you don't need all three, simply omit the unused signature fields.</li>
          <li>The generated PDF will be automatically downloaded by the browser in the example usage.</li>
        </ul>
      </section>
    </div>
  );
}

export default ApiGuide;