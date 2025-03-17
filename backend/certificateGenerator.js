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

async function generateCertificate(name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures, templateId) {
  return new Promise(async (resolve, reject) => {
    const uniqueId = uuidv4();

    try {
      // If a custom template ID is provided, use it
      if (templateId) {
        return await generateFromCustomTemplate(
          templateId, 
          { name, course, date, issuer, certificateType, additionalInfo },
          logoBuffer,
          signatures,
          uniqueId,
          resolve,
          reject
        );
      }
      
      // Otherwise use the built-in templates
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
          await storeCertificateData(uniqueId, name, course, date, certificateType, issuer, templateId);
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

      // Use the appropriate built-in template
      switch (templateId) {
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
    } catch (error) {
      reject(error);
    }
  });
}

async function generateFromCustomTemplate(templateId, data, logoBuffer, signatures, uniqueId, resolve, reject) {
  try {
    // Fetch the template from S3
    const command = new GetObjectCommand({
      Bucket: process.env.MYCERT_S3_BUCKET_NAME,
      Key: `templates/${templateId}.json`
    });
    
    const response = await s3Client.send(command);
    const templateString = await response.Body.transformToString();
    const template = JSON.parse(templateString);
    
    // Create PDF document with the appropriate orientation
    const doc = new PDFDocument({
      layout: template.orientation,
      size: template.size,
      margin: 0,
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(buffers);
      
      try {
        await uploadToS3(pdfBuffer, `certificates/${uniqueId}.pdf`, 'application/pdf');
        await storeCertificateData(uniqueId, data.name, data.course, data.date, data.certificateType, data.issuer, templateId);
        const url = await generatePresignedUrl(`certificates/${uniqueId}.pdf`);
        resolve({ 
          id: uniqueId, 
          url: url
        });
      } catch (error) {
        reject(error);
      }
    });
    
    // Set background color
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(template.background);
    
    // Load fonts
    try {
      const headingFont = await getFileFromS3('fonts/Montserrat-Bold.ttf');
      const subHeadingFont = await getFileFromS3('fonts/Montserrat-Medium.ttf');
      const textFont = await getFileFromS3('fonts/Montserrat-Regular.ttf');

      doc.registerFont('Heading', headingFont);
      doc.registerFont('SubHeading', subHeadingFont);
      doc.registerFont('Text', textFont);
    } catch (error) {
      console.error('Error loading custom fonts:', error);
      // Use fallback fonts if custom fonts fail to load
    }
    
    // Render each element from the template
    for (const element of template.elements) {
      renderTemplateElement(doc, element, data, logoBuffer, signatures);
    }
    
    // Add certificate ID at the bottom
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor('#999999')
       .text(`Certificate ID: ${uniqueId}`, 0, doc.page.height - 30, { 
         align: 'center', 
         width: doc.page.width 
       });
    
    doc.end();
  } catch (error) {
    console.error('Error generating from custom template:', error);
    reject(error);
  }
}

function renderTemplateElement(doc, element, data, logoBuffer, signatures) {
  switch (element.type) {
    case 'text':
      let text = element.text;
      
      // Replace dynamic fields with actual data
      if (element.isDynamic && element.dynamicField) {
        const fieldValue = data[element.dynamicField];
        if (fieldValue) {
          text = fieldValue;
        }
      }
      
      doc.font(element.fontFamily || 'Helvetica')
         .fontSize(element.fontSize || 12)
         .fillColor(element.fill || '#000000')
         .text(text, element.x, element.y, {
           width: element.width,
           align: element.align || 'left'
         });
      break;
      
    case 'image':
      // For logo placeholder, use the provided logo
      if (element.isLogo && logoBuffer) {
        doc.image(logoBuffer, element.x, element.y, {
          width: element.width,
          height: element.height
        });
      } else if (element.src) {
        // For other images, use the source from the template
        doc.image(element.src, element.x, element.y, {
          width: element.width,
          height: element.height
        });
      }
      break;
      
    case 'signature':
      // Find the corresponding signature from the provided signatures
      const signatureIndex = parseInt(element.signatureIndex || 0);
      if (signatures && signatures.length > signatureIndex) {
        const signature = signatures[signatureIndex];
        if (signature.image) {
          doc.image(signature.image, element.x, element.y, {
            width: element.width
          });
        }
        
        // Add signature name below
        doc.font(element.fontFamily || 'Helvetica')
           .fontSize(element.fontSize || 12)
           .fillColor(element.fill || '#000000')
           .text(signature.name, element.x, element.y + element.height + 5, {
             width: element.width,
             align: 'center'
           });
      } else {
        // Draw a placeholder line if no signature is provided
        doc.moveTo(element.x, element.y + element.height)
           .lineTo(element.x + element.width, element.y + element.height)
           .stroke('#000000');
      }
      break;
  }
}

function generateClassicEleganceTemplate(doc, name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures, uniqueId) {
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

async function storeCertificateData(uniqueId, name, course, date, certificateType, issuer, templateId) {
  const certificateData = {
    id: uniqueId,
    name: name,
    course: course,
    date: date,
    certificateType: certificateType,
    issuer: issuer,
    templateId: templateId,
    issuedAt: new Date().toISOString()
  };

  await uploadToS3(JSON.stringify(certificateData), `certificates/${uniqueId}.json`, 'application/json');
}

module.exports = { generateCertificate };