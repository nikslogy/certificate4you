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
      default:
        generateClassicEleganceTemplate(doc, name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures, uniqueId);
    }

    doc.end();
  });
}

function generateModernMinimalistTemplate(doc, name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures, uniqueId) {
  // Background
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');

  // Subtle geometric pattern
  const patternSize = 30;
  for (let x = 0; x < doc.page.width; x += patternSize) {
    for (let y = 0; y < doc.page.height; y += patternSize) {
      doc.polygon([x, y], [x + patternSize, y], [x + patternSize, y + patternSize])
         .fill('#f0f0f0');
    }
  }

  // Sleek border
  const borderWidth = 15;
  doc.rect(borderWidth, borderWidth, doc.page.width - 2 * borderWidth, doc.page.height - 2 * borderWidth)
     .lineWidth(2)
     .stroke('#333333');

  // Header
  doc.font('Heading')
     .fontSize(48)
     .fillColor('#333333')
     .text(`Certificate of ${certificateType.charAt(0).toUpperCase() + certificateType.slice(1)}`, 0, 80, { align: 'center' });

  // Horizontal line
  doc.moveTo(100, 150).lineTo(doc.page.width - 100, 150).stroke('#333333');

  // Content
  doc.font('SubHeading')
     .fontSize(24)
     .fillColor('#555555')
     .text('This certifies that', 0, 200, { align: 'center' });

  doc.font('Heading')
     .fontSize(42)
     .fillColor('#333333')
     .text(name, 0, 240, { align: 'center' });

  doc.font('SubHeading')
     .fontSize(24)
     .fillColor('#555555')
     .text(`has successfully ${certificateType === 'completion' ? 'completed' : 'participated in'}`, 0, 300, { align: 'center' });

  doc.font('Heading')
     .fontSize(36)
     .fillColor('#333333')
     .text(course, 0, 340, { align: 'center' });

  doc.font('Text')
     .fontSize(20)
     .fillColor('#777777')
     .text(`on ${date}`, 0, 400, { align: 'center' });

  // Add a subtle watermark
  doc.save()
     .translate(doc.page.width / 2, doc.page.height / 2)
     .rotate(-45)
     .font('Heading')
     .fontSize(144)
     .fillOpacity(0.04)
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
  grad.stop(0, '#4a90e2').stop(1, '#63b3ed');
  doc.rect(0, 0, pageWidth, pageHeight).fill(grad);

  // Decorative elements
  doc.circle(50, 50, 100).fillOpacity(0.1).fill('#ffffff');
  doc.circle(pageWidth - 50, pageHeight - 50, 150).fillOpacity(0.1).fill('#ffffff');

  // White content area with increased opacity
  doc.roundedRect(50, 50, pageWidth - 100, pageHeight - 100, 20)
     .fillOpacity(0.9)
     .fill('#ffffff');

  // Reset fill opacity for text
  doc.fillOpacity(1);

  // Header
  doc.font('Heading')
     .fontSize(48)
     .fillColor('#2c3e50')
     .text(`Certificate of ${certificateType.charAt(0).toUpperCase() + certificateType.slice(1)}`, 0, 80, { align: 'center' });

  // Gold accent line
  doc.moveTo(100, 140).lineTo(pageWidth - 100, 140).lineWidth(2).stroke('#f39c12');

  // Content
  doc.font('SubHeading')
     .fontSize(24)
     .fillColor('#34495e')
     .text('This is to certify that', 0, 180, { align: 'center' });

  doc.font('Heading')
     .fontSize(36)
     .fillColor('#2980b9')
     .text(name, 0, 220, { align: 'center' });

  doc.font('SubHeading')
     .fontSize(24)
     .fillColor('#34495e')
     .text(`has successfully ${certificateType === 'completion' ? 'completed' : 'participated in'}`, 0, 270, { align: 'center' });

  doc.font('Heading')
     .fontSize(32)
     .fillColor('#2980b9')
     .text(course, 0, 310, { align: 'center' });

  doc.font('Text')
     .fontSize(20)
     .fillColor('#7f8c8d')
     .text(`on ${date}`, 0, 360, { align: 'center' });

  // Add a ribbon graphic
  doc.save()
     .translate(60, 40)
     .rotate(-15)
     .polygon([0, 0], [40, 0], [40, 80], [20, 100], [0, 80])
     .fill('#f39c12')
     .restore();

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
       .text(additionalInfo, 50, 420, { align: 'center', width: pageWidth - 100 });
  }

  // Add logo if provided
  if (logoBuffer) {
    doc.image(logoBuffer, 700, 50, { width: 100 });
  }

  // Add signatures
  const signatureWidth = 130;
  const signatureHeight = 50;
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