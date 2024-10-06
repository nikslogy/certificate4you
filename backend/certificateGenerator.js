const PDFDocument = require('pdfkit');
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const s3Client = new S3Client({
  region: process.env.MYCERT_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MYCERT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MYCERT_AWS_SECRET_ACCESS_KEY,
  },
});

const generateCertificate = async (data) => {
  try {
    const { name, course, date, certificateType, issuer, template, additionalInfo, logo, signatures } = data;

    // Validate required fields
    if (!name || !course || !date || !certificateType || !issuer || !template) {
      throw new Error('Missing required certificate data');
    }

    const doc = new PDFDocument({
      layout: 'landscape',
      size: 'A4',
      margin: 0,
    });

    const uniqueId = uuidv4();

    // ... (rest of the function remains the same)

    switch (template) {
      case 'Classic Elegance':
        await generateClassicEleganceTemplate(doc, data);
        break;
      // ... (other cases)
      default:
        throw new Error(`Unknown template: ${template}`);
    }

    // ... (rest of the function remains the same)
  } catch (error) {
    console.error('Error generating certificate:', error);
    throw error;
  }
};

function generateClassicEleganceTemplate(doc, name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures, uniqueId) {
  if (!certificateType) {
    certificateType = 'completion'; // Provide a default value
    console.warn('Certificate type not provided, using default: completion');
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

  addCommonElements(doc, logoBuffer, additionalInfo, signatures, issuer, uniqueId);
}

function generateModernMinimalistTemplate(doc, name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures, uniqueId) {
  // Background
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');

  // Header
  doc.font('Heading')
     .fontSize(40)
     .fillColor('#333333')
     .text(`Certificate of ${certificateType.charAt(0).toUpperCase() + certificateType.slice(1)}`, 0, 100, { align: 'center' });

  // Content
  doc.font('SubHeading')
     .fontSize(24)
     .fillColor('#555555')
     .text('This is to certify that', 0, 180, { align: 'center' });

  doc.font('Heading')
     .fontSize(36)
     .fillColor('#333333')
     .text(name, 0, 220, { align: 'center' });

  doc.font('SubHeading')
     .fontSize(24)
     .fillColor('#555555')
     .text(`has successfully ${certificateType === 'completion' ? 'completed' : 'participated in'}`, 0, 280, { align: 'center' });

  doc.font('Heading')
     .fontSize(32)
     .fillColor('#333333')
     .text(course, 0, 320, { align: 'center' });

  doc.font('Text')
     .fontSize(20)
     .fillColor('#777777')
     .text(`on ${date}`, 0, 380, { align: 'center' });

  addCommonElements(doc, logoBuffer, additionalInfo, signatures, issuer, uniqueId);
}

function generateVibrantAchievementTemplate(doc, name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures, uniqueId) {
  // Background
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f0f0f0');

  // Colorful top banner
  doc.rect(0, 0, doc.page.width, 100).fill('#4a90e2');

  // Header
  doc.font('Heading')
     .fontSize(44)
     .fillColor('#ffffff')
     .text(`Certificate of ${certificateType.charAt(0).toUpperCase() + certificateType.slice(1)}`, 0, 30, { align: 'center' });

  // Content
  doc.font('SubHeading')
     .fontSize(26)
     .fillColor('#333333')
     .text('This is to certify that', 0, 140, { align: 'center' });

  doc.font('Heading')
     .fontSize(38)
     .fillColor('#4a90e2')
     .text(name, 0, 180, { align: 'center' });

  doc.font('SubHeading')
     .fontSize(26)
     .fillColor('#333333')
     .text(`has successfully ${certificateType === 'completion' ? 'completed' : 'participated in'}`, 0, 240, { align: 'center' });

  doc.font('Heading')
     .fontSize(34)
     .fillColor('#4a90e2')
     .text(course, 0, 280, { align: 'center' });

  doc.font('Text')
     .fontSize(22)
     .fillColor('#555555')
     .text(`on ${date}`, 0, 340, { align: 'center' });

  // Add decorative elements
  doc.circle(50, 50, 30).fillAndStroke('#f9a825', '#f57f17');
  doc.circle(doc.page.width - 50, doc.page.height - 50, 30).fillAndStroke('#f9a825', '#f57f17');

  addCommonElements(doc, logoBuffer, additionalInfo, signatures, issuer, uniqueId);
}

const addCommonElements = (doc, data) => {
  const { name, course, date, certificateType, issuer, additionalInfo, logo, signatures } = data;

  // Add error checking for required fields
  if (!name || !course || !date || !certificateType || !issuer) {
    throw new Error('Missing required certificate data');
  }

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Additional Info
  if (additionalInfo) {
    doc.font('Text')
       .fontSize(14)
       .fillColor('#666')
       .text(additionalInfo, 50, 420, { align: 'center', width: pageWidth - 100 });
  }

  // Add logo if provided
  if (logo) {
    doc.image(logo, 700, 50, { width: 100 });
  }

  // Add signatures
  const signatureWidth = 130;
  const signatureHeight = 50;
  const marginX = 50;
  const marginBottom = 100;

  if (signatures && Array.isArray(signatures)) {
    signatures.forEach((signature, index) => {
      let x, y;
      
      if (signatures.length === 1) {
        x = (pageWidth - signatureWidth) / 2;
      } else if (signatures.length === 2) {
        x = index === 0 ? pageWidth / 4 - signatureWidth / 2 : (3 * pageWidth) / 4 - signatureWidth / 2;
      } else {
        x = marginX + (index * (pageWidth - 2 * marginX - signatureWidth)) / 2;
      }
      
      y = pageHeight - marginBottom - signatureHeight;

      if (signature.image) {
        doc.image(signature.image, x, y, { width: signatureWidth });
      }
      doc.font('Text')
         .fontSize(12)
         .fillColor('#666')
         .text(signature.name, x, y + signatureHeight + 10, { width: signatureWidth, align: 'center' });
    });
  }

  // Add issuer
  doc.font('Text')
     .fontSize(14)
     .fillColor('#666')
     .text(issuer, 0, pageHeight - 60, { align: 'center', width: pageWidth });

  // Add unique ID
  doc.font('Text')
     .fontSize(10)
     .fillColor('#999')
     .text(`Certificate ID: ${uniqueId}`, 0, pageHeight - 40, { align: 'center', width: pageWidth, link: 'https://certificate4you.com/#/verify' });
};

async function uploadToS3(buffer, key, contentType) {
  const command = new PutObjectCommand({
    Bucket: process.env.MYCERT_S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType
  });
  return s3Client.send(command);
}

async function getFileFromS3(key) {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.MYCERT_S3_BUCKET_NAME,
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
    Bucket: process.env.MYCERT_S3_BUCKET_NAME,
    Key: key
  });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
}

async function storeCertificateData(uniqueId, name, course, date, certificateType, issuer, template) {
  const certificateData = {
    id: uniqueId,
    name: name,
    course: course,
    date: date,
    certificateType: certificateType,
    issuer: issuer,
    template: template,
    issuedAt: new Date().toISOString()
  };

  await uploadToS3(JSON.stringify(certificateData), `certificates/${uniqueId}.json`, 'application/json');
}

module.exports = { generateCertificate };