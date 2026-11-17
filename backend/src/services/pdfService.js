import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { replaceTemplatePlaceholders } from '../utils/helpers.js';
import config from '../config/index.js';
import { uploadDirs } from '../middleware/upload.js';

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(html) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, '  ')
      .replace(/<[^>]+>/g, '')
  ).replace(/\n{3,}/g, '\n\n').trim();
}

const HEADING_SIZE = { h1: 20, h2: 16, h3: 14, h4: 12, h5: 11, h6: 11 };

/**
 * Turns template HTML into a list of {text, size, bold, align} paragraph blocks
 * so certificates render as formatted text rather than a raw tag dump.
 * Falls back to a single plain-text block if the HTML has no recognizable
 * block-level structure (e.g. a bare text template).
 */
function parseBlocks(html) {
  let normalized = html
    .replace(/<table[^>]*>|<\/table>|<thead[^>]*>|<\/thead>|<tbody[^>]*>|<\/tbody>/gi, '')
    .replace(/<tr[^>]*>/gi, '<p>')
    .replace(/<\/tr>/gi, '</p>')
    .replace(/<\/(td|th)>/gi, '  ')
    .replace(/<(td|th)[^>]*>/gi, '')
    .replace(/<li[^>]*>/gi, '<p>&bull; ')
    .replace(/<\/li>/gi, '</p>')
    .replace(/<\/?[uo]l[^>]*>/gi, '');

  const blocks = [];
  const blockRegex = /<(h[1-6]|p|div)([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = blockRegex.exec(normalized))) {
    const [, tag, attrs, inner] = match;
    const text = decodeEntities(inner.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).trim();
    if (!text) continue;

    // Templates are authored in the Quill rich-text editor, which encodes alignment
    // as a class (ql-align-center/right/justify) rather than an inline style — check
    // both so centered/right-aligned template text isn't silently flattened to left.
    const align = /text-align\s*:\s*center/i.test(attrs) || /\bql-align-center\b/.test(attrs) ? 'center'
      : /text-align\s*:\s*right/i.test(attrs) || /\bql-align-right\b/.test(attrs) ? 'right'
      : /text-align\s*:\s*justify/i.test(attrs) || /\bql-align-justify\b/.test(attrs) ? 'justify'
      : 'left';
    const isHeading = /^h[1-6]$/.test(tag);
    const fullyBold = isHeading || /^<(strong|b)>[\s\S]*<\/(strong|b)>$/i.test(inner.trim());

    blocks.push({ text, size: HEADING_SIZE[tag] || 11, bold: fullyBold, align });
  }

  if (blocks.length === 0) {
    const plain = stripHtml(html);
    if (plain) blocks.push({ text: plain, size: 11, bold: false, align: 'left' });
  }

  return blocks;
}

const CERTIFICATE_TITLES = {
  completion: 'CERTIFICATE OF COMPLETION',
  participation: 'CERTIFICATE OF PARTICIPATION',
  detention: 'CERTIFICATE OF DETENTION',
  returned_to_unit: 'RETURNED TO UNIT CERTIFICATE',
  appreciation: 'CERTIFICATE OF APPRECIATION',
};

export async function generatePdfFromHtml(htmlContent, options = {}) {
  const { title = 'Document', qrData = null, fileName = null } = options;
  const outputFileName = fileName || `${uuidv4()}.pdf`;
  const outputPath = path.join(uploadDirs.certificates, outputFileName);

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      doc.fontSize(10).fillColor('#666666')
        .text(config.app.name, { align: 'center' });
      doc.moveDown(0.5);
      doc.strokeColor('#1e3a8a').lineWidth(2)
        .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      doc.fontSize(18).fillColor('#1e3a8a')
        .text(title, { align: 'center' });
      doc.moveDown(1.5);

      const plainText = stripHtml(htmlContent);
      doc.fontSize(11).fillColor('#333333')
        .text(plainText, { align: 'left', lineGap: 4 });

      if (qrData) {
        const qrBuffer = await QRCode.toBuffer(qrData, { width: 100, margin: 1 });
        doc.image(qrBuffer, doc.page.width - 150, doc.page.height - 150, { width: 80 });
        doc.fontSize(8).fillColor('#666666')
          .text('Scan to verify', doc.page.width - 150, doc.page.height - 65, { width: 80, align: 'center' });
      }

      doc.fontSize(8).fillColor('#999999')
        .text(
          `Generated on ${new Date().toLocaleDateString('en-IN')} | ${config.app.name}`,
          50,
          doc.page.height - 40,
          { align: 'center', width: doc.page.width - 100 }
        );

      doc.end();

      stream.on('finish', () => resolve({ filePath: outputPath, fileName: outputFileName }));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateCertificatePdf(templateContent, data, options = {}) {
  const content = replaceTemplatePlaceholders(templateContent, data);
  const qrData = options.qrData || `${config.app.apiUrl}/api/certificates/verify/${data.certificate_number}`;
  const fileName = options.fileName || `${uuidv4()}.pdf`;
  const outputPath = path.join(uploadDirs.certificates, fileName);

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 40, right: 40 } });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Decorative double border frame
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).lineWidth(2).strokeColor('#1e3a8a').stroke();
      doc.rect(28, 28, doc.page.width - 56, doc.page.height - 56).lineWidth(0.75).strokeColor('#93c5fd').stroke();

      doc.moveDown(1.5);
      doc.fontSize(9).fillColor('#64748b').font('Helvetica')
        .text(config.app.name.toUpperCase(), { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(20).fillColor('#1e3a8a').font('Helvetica-Bold')
        .text(CERTIFICATE_TITLES[data.type] || 'CERTIFICATE', { align: 'center' });
      doc.moveDown(0.2);
      doc.fontSize(9).fillColor('#94a3b8').font('Helvetica')
        .text(`Certificate No: ${data.certificate_number}`, { align: 'center' });
      doc.moveDown(1);

      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(120, doc.y).lineTo(doc.page.width - 120, doc.y).stroke();
      doc.moveDown(1);

      const blocks = parseBlocks(content);
      const bodyX = 80;
      const bodyWidth = doc.page.width - 160;
      blocks.forEach((block) => {
        doc.font(block.bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(block.size)
          .fillColor('#1e293b')
          .text(block.text, bodyX, doc.y, { width: bodyWidth, align: block.align, lineGap: 3 });
        doc.moveDown(0.4);
      });

      // Type-specific auto-filled details box
      const extraLines = [];
      if (data.grading) extraLines.push(`Grading: ${data.grading}`);
      if (data.type === 'returned_to_unit' && data.rtu_reason) extraLines.push(`Reason for RTU: ${data.rtu_reason}`);
      if (data.sos_date) extraLines.push(`Struck Off Strength Date: ${data.sos_date}`);
      if (data.movement_order_reference) extraLines.push(`Movement Order Ref: ${data.movement_order_reference}`);
      if (extraLines.length) {
        doc.moveDown(0.5);
        doc.fontSize(9).font('Helvetica').fillColor('#475569')
          .text(extraLines.join('   |   '), bodyX, doc.y, { width: bodyWidth, align: 'center' });
      }

      // No signature block is drawn here — signatories are entirely template-driven via
      // placeholders (e.g. {{director_name}}, {{course_director_name}}, or any other
      // authority_type/faculty role placeholder — see certificateService.js), same as
      // every other field. A template only shows a signatory if it actually references one.

      if (options.includeQr) {
        const qrBuffer = await QRCode.toBuffer(qrData, { width: 100, margin: 1 });
        doc.image(qrBuffer, doc.page.width - 110, 40, { width: 65 });
        doc.fontSize(7).fillColor('#94a3b8')
          .text('Scan to verify', doc.page.width - 110, 106, { width: 65, align: 'center' });
      }

      doc.fontSize(7).fillColor('#94a3b8')
        .text(`Issued on ${data.issued_date} | Generated by ${config.app.name}`, 40, doc.page.height - 34, {
          align: 'center', width: doc.page.width - 80,
        });

      doc.end();
      stream.on('finish', () => resolve({ filePath: outputPath, fileName }));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateDocumentPdf(templateContent, data, title) {
  const content = replaceTemplatePlaceholders(templateContent, data);
  return generatePdfFromHtml(content, { title });
}

/**
 * Streams a professional bordered table (org name, title, active-filter summary,
 * header row repeated on every page, alternating row shading, footer + page numbers)
 * to the response. Used by every "Export PDF" action across the app (Reports,
 * Participants, Courses, Course Roster, Certificates, Leaves, Feedback, Schedules).
 *
 * @param {object} [options]
 * @param {string[]} [options.filterSummaryLines] - e.g. ["Training Year: 2025", "Department: Fire Safety"]
 * @param {'portrait'|'landscape'} [options.orientation] - defaults to landscape (auto-appropriate for wide tables)
 */
export function streamTablePdfToResponse(res, title, columns, rows, options = {}) {
  const { filterSummaryLines = [], orientation = 'landscape' } = options;
  const doc = new PDFDocument({ size: 'A4', layout: orientation, margins: { top: 40, bottom: 40, left: 30, right: 30 }, bufferPages: true });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}.pdf"`);
  doc.pipe(res);

  const pageWidth = doc.page.width - 60;
  const colWidth = pageWidth / columns.length;
  const rowHeight = 22;

  doc.fontSize(9).fillColor('#64748b').font('Helvetica').text(config.app.name, 30, 30, { width: pageWidth, align: 'center' });
  doc.fontSize(14).fillColor('#1e3a8a').font('Helvetica-Bold').text(title, 30, doc.y + 2, { width: pageWidth, align: 'center' });

  if (filterSummaryLines.length) {
    doc.moveDown(0.3);
    doc.fontSize(8).fillColor('#475569').font('Helvetica')
      .text(filterSummaryLines.join('    |    '), 30, doc.y, { width: pageWidth, align: 'center' });
  }
  doc.moveDown(0.3);
  doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
    .text(`Generated On: ${new Date().toLocaleString('en-IN')}`, 30, doc.y, { width: pageWidth, align: 'center' });
  doc.moveDown(0.6);

  function drawHeader(y) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
    doc.rect(30, y, pageWidth, rowHeight).fill('#1e3a8a');
    columns.forEach((col, i) => {
      doc.fillColor('#ffffff').text(col.label, 30 + i * colWidth + 4, y + 6, { width: colWidth - 8, ellipsis: true });
    });
    return y + rowHeight;
  }

  let y = drawHeader(doc.y);

  if (rows.length === 0) {
    doc.font('Helvetica').fontSize(9).fillColor('#94a3b8')
      .text('No records found', 30, y + 10, { width: pageWidth, align: 'center' });
  }

  rows.forEach((row, rowIndex) => {
    if (y + rowHeight > doc.page.height - 50) {
      doc.addPage();
      y = drawHeader(40);
    }
    if (rowIndex % 2 === 0) {
      doc.rect(30, y, pageWidth, rowHeight).fill('#f8fafc');
    }
    doc.font('Helvetica').fontSize(8).fillColor('#1e293b');
    columns.forEach((col, i) => {
      const value = row[col.key];
      doc.text(value === null || value === undefined || value === '' ? '—' : String(value), 30 + i * colWidth + 4, y + 6, {
        width: colWidth - 8, ellipsis: true,
      });
    });
    y += rowHeight;
  });

  // Footer + page numbers on every page (must run after all content, via buffered pages).
  const pageRange = doc.bufferedPageRange();
  for (let i = 0; i < pageRange.count; i++) {
    doc.switchToPage(pageRange.start + i);
    doc.fontSize(7).fillColor('#94a3b8')
      .text(`${config.app.name} | Page ${i + 1} of ${pageRange.count}`, 30, doc.page.height - 25, {
        align: 'center', width: pageWidth,
      });
  }

  doc.end();
}

export async function streamPdfToResponse(res, htmlContent, title) {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}.pdf"`);

  doc.pipe(res);

  doc.fontSize(10).fillColor('#666666').text(config.app.name, { align: 'center' });
  doc.moveDown(0.5);
  doc.strokeColor('#1e3a8a').lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);
  doc.fontSize(18).fillColor('#1e3a8a').text(title, { align: 'center' });
  doc.moveDown(1.5);
  doc.fontSize(11).fillColor('#333333').text(stripHtml(htmlContent), { align: 'left', lineGap: 4 });
  doc.end();
}
