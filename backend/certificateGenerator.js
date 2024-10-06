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

async function generateCertificate(name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures, template) {
  return new Promise(async (resolve, reject) => {
    const uniqueId = uuidv4();

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
        await storeCertificateData(uniqueId, name, course, date, certificateType, issuer, template);
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

    switch (template) {
      case 'modern-minimalist':
        generateModernMinimalistTemplate(doc, name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures, uniqueId);
        break;
      case 'vibrant-achievement':
        generateVibrantAchievementTemplate(doc, name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures, uniqueId);
        break;
      case 'classic-elegance':
        generateClassicEleganceTemplate(doc, name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures, uniqueId);
        break;
      default:
        generateModernMinimalistTemplate(doc, name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures, uniqueId);
    }

    doc.end();
  });
}

function generateModernMinimalistTemplate(doc, name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures, uniqueId) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Background
  doc.rect(0, 0, pageWidth, pageHeight).fill('#f9f9f9');

  // Subtle geometric pattern
  const patternSize = 20;
  doc.opacity(0.1);
  for (let x = 0; x < pageWidth; x += patternSize) {
    for (let y = 0; y < pageHeight; y += patternSize) {
      doc.polygon([x, y], [x + patternSize, y], [x + patternSize / 2, y + patternSize])
         .fill('#333333');
    }
  }
  doc.opacity(1);

  // Sleek border
  const borderWidth = 20;
  doc.rect(borderWidth, borderWidth, pageWidth - 2 * borderWidth, pageHeight - 2 * borderWidth)
     .lineWidth(3)
     .stroke('#333333');

  // Header
  doc.font('Heading')
     .fontSize(42)
     .fillColor('#333333')
     .text(`Certificate of ${certificateType.charAt(0).toUpperCase() + certificateType.slice(1)}`, 0, 100, { align: 'center' });

  // Horizontal lines
  const lineY = 160;
  doc.moveTo(100, lineY).lineTo(pageWidth - 100, lineY).lineWidth(1).stroke('#333333');
  doc.moveTo(100, lineY + 3).lineTo(pageWidth - 100, lineY + 3).lineWidth(1).stroke('#333333');

  // Content
  doc.font('SubHeading')
     .fontSize(24)
     .fillColor('#555555')
     .text('This certifies that', 0, 220, { align: 'center' });

  doc.font('Heading')
     .fontSize(36)
     .fillColor('#333333')
     .text(name, 0, 260, { align: 'center' });

  doc.font('SubHeading')
     .fontSize(24)
     .fillColor('#555555')
     .text(`has successfully ${certificateType === 'completion' ? 'completed' : 'participated in'}`, 0, 320, { align: 'center' });

  doc.font('Heading')
     .fontSize(32)
     .fillColor('#333333')
     .text(course, 0, 360, { align: 'center' });

  doc.font('Text')
     .fontSize(18)
     .fillColor('#777777')
     .text(`on ${date}`, 0, 420, { align: 'center' });

  // Add a subtle watermark
  doc.save()
     .translate(pageWidth / 2, pageHeight / 2)
     .rotate(-45)
     .font('Heading')
     .fontSize(144)
     .fillOpacity(0.03)
     .fillColor('#000000')
     .text('CERTIFIED', 0, 0, { align: 'center' })
     .restore();

  addCommonElements(doc, logoBuffer, additionalInfo, signatures, issuer, uniqueId);
}

function generateVibrantAchievementTemplate(doc, name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures, uniqueId) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Gradient background
  const grad = doc.linearGradient(0, 0, pageWidth, pageHeight);
  grad.stop(0, '#1a5f7a').stop(1, '#57c5b6');
  doc.rect(0, 0, pageWidth, pageHeight).fill(grad);

  // Decorative elements
  doc.circle(0, 0, 200).fillOpacity(0.1).fill('#ffffff');
  doc.circle(pageWidth, pageHeight, 300).fillOpacity(0.1).fill('#ffffff');

  // White content area
  doc.roundedRect(40, 40, pageWidth - 80, pageHeight - 80, 20)
     .fillOpacity(0.9)
     .fill('#ffffff');

  // Reset fill opacity for text
  doc.fillOpacity(1);

  // Header
  doc.font('Heading')
     .fontSize(42)
     .fillColor('#1a5f7a')
     .text(`Certificate of ${certificateType.charAt(0).toUpperCase() + certificateType.slice(1)}`, 0, 80, { align: 'center' });

  // Gold accent line
  doc.moveTo(100, 140).lineTo(pageWidth - 100, 140).lineWidth(3).stroke('#ffd700');

  // Content
  doc.font('SubHeading')
     .fontSize(24)
     .fillColor('#2c3e50')
     .text('This is to certify that', 0, 180, { align: 'center' });

  doc.font('Heading')
     .fontSize(36)
     .fillColor('#1a5f7a')
     .text(name, 0, 220, { align: 'center' });

  doc.font('SubHeading')
     .fontSize(24)
     .fillColor('#2c3e50')
     .text(`has successfully ${certificateType === 'completion' ? 'completed' : 'participated in'}`, 0, 280, { align: 'center' });

  doc.font('Heading')
     .fontSize(32)
     .fillColor('#1a5f7a')
     .text(course, 0, 320, { align: 'center' });

  doc.font('Text')
     .fontSize(18)
     .fillColor('#34495e')
     .text(`on ${date}`, 0, 380, { align: 'center' });

  // Add a ribbon graphic
  doc.save()
     .translate(60, 40)
     .rotate(-15)
     .polygon([0, 0], [40, 0], [40, 80], [20, 100], [0, 80])
     .fill('#ffd700')
     .restore();

  addCommonElements(doc, logoBuffer, additionalInfo, signatures, issuer, uniqueId);
}

function generateClassicEleganceTemplate(doc, name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures, uniqueId) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Implement the classic elegance template generation here
  // For now, we'll use a placeholder implementation
  doc.rect(0, 0, pageWidth, pageHeight).fill('#f9f9f9');

  doc.font('Heading')
     .fontSize(42)
     .fillColor('#333333')
     .text(`Certificate of ${certificateType.charAt(0).toUpperCase() + certificateType.slice(1)}`, 0, 100, { align: 'center' });

  doc.font('SubHeading')
     .fontSize(24)
     .fillColor('#555555')
     .text('This certifies that', 0, 220, { align: 'center' });

  doc.font('Heading')
     .fontSize(36)
     .fillColor('#333333')
     .text(name, 0, 260, { align: 'center' });

  doc.font('SubHeading')
     .fontSize(24)
     .fillColor('#555555')
     .text(`has successfully ${certificateType === 'completion' ? 'completed' : 'participated in'}`, 0, 320, { align: 'center' });

  doc.font('Heading')
     .fontSize(32)
     .fillColor('#333333')
     .text(course, 0, 360, { align: 'center' });

  doc.font('Text')
     .fontSize(18)
     .fillColor('#777777')
     .text(`on ${date}`, 0, 420, { align: 'center' });

  addCommonElements(doc, logoBuffer, additionalInfo, signatures, issuer, uniqueId);
}

function addCommonElements(doc, logoBuffer, additionalInfo, signatures, issuer, uniqueId) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Additional Info
  if (additionalInfo) {
    doc.font('Text')
       .fontSize(14)
       .fillColor('#666')
       .text(additionalInfo, 100, 440, { align: 'center', width: pageWidth - 200 });
  }

  // Add logo if provided
  if (logoBuffer) {
    doc.image(logoBuffer, pageWidth - 150, 50, { width: 100 });
  }

  // Add signatures
  const signatureWidth = 150;
  const signatureHeight = 60;
  const marginBottom = 120;
  const signaturesY = pageHeight - marginBottom;

  signatures.forEach((sig, index) => {
    let x;
    
    if (signatures.length === 1) {
      x = (pageWidth - signatureWidth) / 2;
    } else if (signatures.length === 2) {
      x = index === 0 ? pageWidth / 4 - signatureWidth / 2 : (3 * pageWidth) / 4 - signatureWidth / 2;
    } else {
      x = 100 + (index * (pageWidth - 200 - signatureWidth)) / 2;
    }

    if (sig.image) {
      doc.image(sig.image, x, signaturesY, { width: signatureWidth });
    }
    doc.moveTo(x, signaturesY + signatureHeight)
       .lineTo(x + signatureWidth, signaturesY + signatureHeight)
       .stroke('#333333');
    doc.font('Text')
       .fontSize(12)
       .fillColor('#666')
       .text(sig.name, x, signaturesY + signatureHeight + 10, { width: signatureWidth, align: 'center' });
  });

  // Add issuer 
  doc.font('SubHeading')
     .fontSize(16)
     .fillColor('#333333')
     .text(issuer, 0, pageHeight - 60, { align: 'center', width: pageWidth });

  // Add unique ID
  doc.font('Text')
     .fontSize(10)
     .fillColor('#999')
     .text(`Certificate ID: ${uniqueId}`, 0, pageHeight - 30, { align: 'center', width: pageWidth, link: 'https://certificate4you.com/#/verify' });
}

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