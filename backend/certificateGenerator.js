const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function generateCertificate(name, course, date, logoPath, certificateType, issuer, additionalInfo, signatures) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      layout: 'landscape',
      size: 'A4',
      margin: 0,
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // Generate unique ID
    const uniqueId = uuidv4();

    // Load custom fonts
    doc.registerFont('Heading', path.join(__dirname, 'fonts', 'Montserrat-Bold.ttf'));
    doc.registerFont('SubHeading', path.join(__dirname, 'fonts', 'Montserrat-Medium.ttf'));
    doc.registerFont('Text', path.join(__dirname, 'fonts', 'Montserrat-Regular.ttf'));

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
    if (logoPath) {
      doc.image(logoPath, 700, 50, { width: 100 });
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

    // Store certificate data for verification
    storeCertificateData(uniqueId, name);
  });
}

function storeCertificateData(id, name) {
  // In a real application, you would store this in a database
  // For this example, we'll use a simple JSON file
  const data = JSON.parse(fs.readFileSync('certificates.json', 'utf8'));
  data[id] = name;
  fs.writeFileSync('certificates.json', JSON.stringify(data));
}

module.exports = { generateCertificate };