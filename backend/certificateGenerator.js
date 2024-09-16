const PDFDocument = require('pdfkit');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({
  region: process.env.MYCERT_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY
  }
});

const s3 = new AWS.S3({
  accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  region: process.env.MYCERT_AWS_REGION
});

async function generateCertificate(name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures) {
  return new Promise(async (resolve, reject) => {
    const uniqueId = uuidv4(); // Generate uniqueId here

    const doc = new PDFDocument({
      layout: 'landscape',
      size: 'A4',
      margin: 0,
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(buffers);
      
      try {
        await uploadToS3(pdfBuffer, `certificates/${uniqueId}.pdf`, 'application/pdf');
        await storeCertificateData(uniqueId, name);
        const url = await generatePresignedUrl(`certificates/${uniqueId}.pdf`);
        resolve({ 
          id: uniqueId, 
          url: url
        });
      } catch (error) {
        reject(error);
      }
    });

    try {
      // Load custom fonts
      const headingFont = await getFileFromS3('fonts/Montserrat-Bold.ttf');
      const subHeadingFont = await getFileFromS3('fonts/Montserrat-Medium.ttf');
      const textFont = await getFileFromS3('fonts/Montserrat-Regular.ttf');

      doc.registerFont('Heading', headingFont);
      doc.registerFont('SubHeading', subHeadingFont);
      doc.registerFont('Text', textFont);
    } catch (error) {
      console.error('Error loading custom fonts:', error);
      // Use fallback fonts if custom fonts fail to load
      doc.font('Helvetica-Bold');
      doc.font('Helvetica');
    }

    // Background color
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f5f5f5');

    // Border
    const borderWidth = 20;
    doc.rect(borderWidth, borderWidth, doc.page.width - (borderWidth * 2), doc.page.height - (borderWidth * 2))
       .lineWidth(3)
       .stroke('#1e3a8a');

    // Header
    doc.font('Heading')
       .fontSize(40)
       .fillColor('#1e3a8a')
       .text(`Certificate of ${certificateType.charAt(0).toUpperCase() + certificateType.slice(1)}`, 0, 100, { align: 'center' });

    // Content
    doc.font('SubHeading')
       .fontSize(22)
       .fillColor('#333')
       .text('This is to certify that', 0, 180, { align: 'center' });

    doc.font('Heading')
       .fontSize(32)
       .fillColor('#1e3a8a')
       .text(name, 0, 220, { align: 'center' });

    doc.font('SubHeading')
       .fontSize(22)
       .fillColor('#333')
       .text(`has successfully ${certificateType === 'completion' ? 'completed' : 'participated in'}`, 0, 280, { align: 'center' });

    doc.font('Heading')
       .fontSize(28)
       .fillColor('#1e3a8a')
       .text(course, 0, 320, { align: 'center' });

    doc.font('Text')
       .fontSize(18)
       .fillColor('#666')
       .text(`on ${date}`, 0, 380, { align: 'center' });

    // Additional Info
    if (additionalInfo) {
      doc.font('Text')
         .fontSize(14)
         .fillColor('#666')
         .text(additionalInfo, 50, 420, { align: 'center', width: doc.page.width - 100 });
    }

    // Add logo if provided
    if (logoBuffer) {
      doc.image(logoBuffer, 700, 50, { width: 100 });
    }

    // Add signatures
    const signatureWidth = 130;
    const signatureHeight = 50;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const marginX = 50;
    const marginBottom = 100;

    signatures.forEach((sig, index) => {
      let x, y;
      
      if (signatures.length === 1) {
        x = (pageWidth - signatureWidth) / 2;
      } else if (signatures.length === 2) {
        x = index === 0 ? pageWidth / 4 - signatureWidth / 2 : (3 * pageWidth) / 4 - signatureWidth / 2;
      } else {
        x = marginX + (index * (pageWidth - 2 * marginX - signatureWidth)) / 2;
      }
      
      y = pageHeight - marginBottom - signatureHeight;

      if (sig.image) {
        doc.image(sig.image, x, y, { width: signatureWidth });
      }
      doc.font('Text')
         .fontSize(12)
         .fillColor('#666')
         .text(sig.name, x, y + signatureHeight + 10, { width: signatureWidth, align: 'center' });
    });

    // Adjust issuer and unique ID positions
    const issuerY = pageHeight - 60;
    const idY = pageHeight - 40;

    // Add issuer
    doc.font('Text')
       .fontSize(14)
       .fillColor('#666')
       .text(issuer, 0, issuerY, { align: 'center', width: pageWidth });

    // Add unique ID
    doc.font('Text')
       .fontSize(10)
       .fillColor('#999')
       .text(`Certificate ID: ${uniqueId}`, 0, idY, { align: 'center', width: pageWidth });

    doc.end();
  });
}

async function uploadToS3(buffer, key, contentType) {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType
  });
  return s3Client.send(command);
}

async function getFileFromS3(key) {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    });
    const response = await s3Client.send(command);
    return await streamToBuffer(response.Body);
  } catch (error) {
    console.error(`Error fetching file ${key} from S3:`, error);
    throw error;
  }
}

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function generatePresignedUrl(key) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key
  });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
}

async function storeCertificateData(id, name) {
  const data = JSON.stringify({ id, name });
  await uploadToS3(Buffer.from(data), `certificates/${id}.json`, 'application/json');
}

module.exports = { generateCertificate };