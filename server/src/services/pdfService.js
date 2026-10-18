const PDFDocument = require('pdfkit');

/**
 * Generate a printable Immunization Record PDF for a person.
 */
function generateImmunizationPdf({ dependent, records, schedules }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4'
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header Banner
      doc.rect(40, 40, 515, 60).fill('#0284C7');
      doc.fillColor('#FFFFFF')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('VaxaGuard — Official Immunization Record', 55, 52);

      doc.fontSize(10)
         .font('Helvetica')
         .text('Universal Immunization Tracking & Pediatric Healthcare Card', 55, 78);

      // Person Details Box
      const boxTop = 115;
      doc.rect(40, boxTop, 515, 75).strokeColor('#E2E8F0').fillColor('#F8FAFC').fillAndStroke();

      doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold');
      doc.text(`Full Name: ${dependent.name}`, 55, boxTop + 14);
      doc.text(`Category: ${dependent.ageCategory || 'Individual'} (${dependent.ageInYears} years)`, 320, boxTop + 14);

      doc.font('Helvetica').fontSize(9).fillColor('#334155');
      const dobStr = dependent.dateOfBirth ? new Date(dependent.dateOfBirth).toLocaleDateString('en-GB') : 'N/A';
      doc.text(`Date of Birth: ${dobStr}`, 55, boxTop + 34);
      doc.text(`Gender: ${dependent.gender || 'Not specified'}`, 200, boxTop + 34);
      doc.text(`Jurisdiction: ${dependent.jurisdiction || 'Indian UIP Schedule'}`, 320, boxTop + 34);

      doc.text(`Generated On: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`, 55, boxTop + 54);
      doc.text(`Status: ${records.length} Completed Doses`, 320, boxTop + 54);

      // Section Header: Administered Doses
      let currentY = boxTop + 100;
      doc.fillColor('#0284C7').fontSize(13).font('Helvetica-Bold').text('Administered Immunizations & Vaccines', 40, currentY);

      currentY += 20;

      // Table Header
      doc.rect(40, currentY, 515, 22).fill('#0F172A');
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
      doc.text('Vaccine Name', 46, currentY + 6);
      doc.text('Dose', 160, currentY + 6);
      doc.text('Date Given', 200, currentY + 6);
      doc.text('Clinic / Center', 270, currentY + 6);
      doc.text('Batch / Lot', 390, currentY + 6);
      doc.text('Verification', 465, currentY + 6);

      currentY += 22;

      // Table Rows
      if (!records || records.length === 0) {
        doc.rect(40, currentY, 515, 30).strokeColor('#E2E8F0').stroke();
        doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('No administered vaccination records recorded yet.', 50, currentY + 10);
        currentY += 40;
      } else {
        records.forEach((rec, idx) => {
          const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          doc.rect(40, currentY, 515, 20).fill(rowBg);

          doc.fillColor('#1E293B').fontSize(8).font('Helvetica-Bold');
          doc.text(rec.vaccineName || 'N/A', 46, currentY + 6, { width: 110, ellipsis: true });

          doc.font('Helvetica').fillColor('#334155');
          doc.text(`Dose ${rec.doseNumber}`, 160, currentY + 6);

          const dateStr = rec.administeredAt ? new Date(rec.administeredAt).toLocaleDateString('en-GB') : 'N/A';
          doc.text(dateStr, 200, currentY + 6);
          doc.text(rec.clinic || 'Civil / Private Clinic', 270, currentY + 6, { width: 115, ellipsis: true });
          doc.text(rec.batchNumber || '—', 390, currentY + 6, { width: 70, ellipsis: true });

          const isVerified = rec.verificationStatus === 'verified_by_doctor';
          doc.fillColor(isVerified ? '#059669' : '#D97706');
          doc.text(isVerified ? 'Doctor Verified' : 'Self Reported', 465, currentY + 6);

          currentY += 20;

          // Page boundary check
          if (currentY > 740) {
            doc.addPage();
            currentY = 50;
          }
        });
      }

      currentY += 20;

      // Footer and Sign-Off Box
      if (currentY > 680) {
        doc.addPage();
        currentY = 50;
      }

      doc.rect(40, currentY, 515, 65).strokeColor('#CBD5E1').stroke();
      doc.fillColor('#475569').fontSize(7.5).font('Helvetica');
      doc.text(
        'NOTICE & VERIFICATION: This document is an informational record of vaccinations generated via VaxaGuard based on national health guidance. ' +
        'For international travel or mandatory institutional admissions, clinical verification with official clinic stamps may be required. ' +
        'Contact your pediatrician or healthcare practitioner for verification inquiries.',
        50, currentY + 10, { width: 330, align: 'left', lineGap: 2 }
      );

      // Signature line
      doc.strokeColor('#94A3B8').moveTo(400, currentY + 45).lineTo(530, currentY + 45).stroke();
      doc.fontSize(7.5).fillColor('#64748B').text('Authorized Medical Signature', 400, currentY + 50, { width: 130, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateImmunizationPdf };
