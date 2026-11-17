// import fs from 'fs';
// import path from 'path';
// import os from 'os';
// import { execFile } from 'child_process';
// import { promisify } from 'util';
// import { v4 as uuidv4 } from 'uuid';
// import PizZip from 'pizzip';
// import Docxtemplater from 'docxtemplater';
// import { uploadDirs } from '../middleware/upload.js';
// import { ValidationError } from '../utils/errors.js';
// import logger from '../utils/logger.js';

// const execFileAsync = promisify(execFile);

// /**
//  * DOCX-based certificate generation pipeline.
//  *
//  * The uploaded .docx stays the MASTER TEMPLATE end-to-end:
//  *   original .docx -> docxtemplater fills {{placeholders}} in place (preserves every
//  *   run/paragraph's font, size, bold/italic/underline, color, alignment, spacing,
//  *   tables, borders, images, headers/footers, margins, page size/orientation — nothing
//  *   is re-derived from HTML) -> filled .docx -> LibreOffice headless converts that exact
//  *   .docx to PDF, so the PDF is a faithful rendering of the same formatted document.
//  *
//  * docxtemplater parses the underlying WordprocessingML text nodes (not the visible text),
//  * which is what lets it find a tag like {{participant_name}} even when Word has split it
//  * across several <w:r> runs (e.g. after autocorrect/spellcheck) — no manual run-merging needed.
//  */

// function resolveSofficeBinary() {
//   if (process.env.LIBREOFFICE_PATH) return process.env.LIBREOFFICE_PATH;
//   const candidates = [
//     '/Applications/LibreOffice.app/Contents/MacOS/soffice', // macOS
//     '/usr/bin/soffice', // Linux (most distros)
//     '/usr/bin/libreoffice',
//     '/opt/libreoffice/program/soffice',
//     'C:\\Program Files\\LibreOffice\\program\\soffice.exe', // Windows
//   ];
//   for (const candidate of candidates) {
//     if (path.isAbsolute(candidate) && fs.existsSync(candidate)) return candidate;
//   }
//   return 'soffice'; // fall back to PATH lookup
// }

// /**
//  * Fills a .docx template's {{placeholders}} with data, preserving all original
//  * Word formatting (fonts, styles, tables, images, headers/footers, layout).
//  * Returns a Buffer of the completed .docx.
//  */
// export function fillDocxTemplate(docxPath, data) {
//   if (!fs.existsSync(docxPath)) {
//     throw new ValidationError('Master certificate template file is missing on the server');
//   }

//   const stringData = {};
//   Object.entries(data).forEach(([key, value]) => {
//     stringData[key] = value === null || value === undefined ? '' : String(value);
//   });

//   const content = fs.readFileSync(docxPath, 'binary');
//   let zip;
//   try {
//     zip = new PizZip(content);
//   } catch {
//     throw new ValidationError('Master certificate template file is not a valid .docx document');
//   }

//   const doc = new Docxtemplater(zip, {
//     paragraphLoop: true,
//     linebreaks: true,
//     delimiters: { start: '{{', end: '}}' },
//     nullGetter: () => '',
//   });

//   try {
//     doc.render(stringData);
//   } catch (error) {
//     const details = error.properties?.errors
//       ?.map((e) => e.properties?.explanation)
//       .filter(Boolean)
//       .join('; ');
//     throw new ValidationError(`Failed to fill certificate template${details ? `: ${details}` : ''}`);
//   }

//   return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
// }

// /**
//  * Converts a .docx file to PDF via LibreOffice headless, preserving layout/formatting
//  * (the same rendering engine Word-compatible viewers use). Each call gets an isolated
//  * profile directory so concurrent/bulk conversions don't collide on LibreOffice's lock file.
//  */
// export async function convertDocxToPdf(docxPath, outDir) {
//   const binary = resolveSofficeBinary();
//   const profileDir = path.join(os.tmpdir(), `lo-profile-${uuidv4()}`);

//   try {
//     await execFileAsync(
//       binary,
//       [
//         '--headless', '--norestore', '--nolockcheck', '--nodefault', '--nofirststartwizard',
//         `-env:UserInstallation=file://${profileDir}`,
//         '--convert-to', 'pdf', '--outdir', outDir, docxPath,
//       ],
//       { timeout: 60000 }
//     );
//   } catch (error) {
//     logger.error(`LibreOffice DOCX->PDF conversion failed: ${error.message}`);
//     throw new ValidationError(
//       'PDF conversion is unavailable (LibreOffice is not installed or not reachable on the server). ' +
//       'The generated .docx certificate is still available for download.'
//     );
//   } finally {
//     fs.rm(profileDir, { recursive: true, force: true }, () => {});
//   }

//   const pdfPath = path.join(outDir, `${path.basename(docxPath, path.extname(docxPath))}.pdf`);
//   if (!fs.existsSync(pdfPath)) {
//     throw new ValidationError('PDF conversion did not produce an output file');
//   }
//   return pdfPath;
// }

// /**
//  * Full pipeline: fill the master .docx template with data, save the completed .docx,
//  * then convert it to PDF. Returns paths/filenames for both artifacts.
//  */
// export async function generateFromDocxTemplate(templateDocxPath, data, baseFileName) {
//   const outDir = uploadDirs.certificates;
//   const base = baseFileName || uuidv4();
//   const docxFileName = `${base}.docx`;
//   const docxOutPath = path.join(outDir, docxFileName);

//   const filledBuffer = fillDocxTemplate(templateDocxPath, data);
//   fs.writeFileSync(docxOutPath, filledBuffer);

//   let pdfPath = null;
//   let pdfFileName = null;
//   try {
//     pdfPath = await convertDocxToPdf(docxOutPath, outDir);
//     pdfFileName = path.basename(pdfPath);
//   } catch (error) {
//     // DOCX generation with full formatting still succeeded; surface the PDF failure
//     // separately so callers can decide whether to hard-fail or continue DOCX-only.
//     return { docxPath: docxOutPath, docxFileName, pdfPath: null, pdfFileName: null, pdfError: error.message };
//   }

//   return { docxPath: docxOutPath, docxFileName, pdfPath, pdfFileName, pdfError: null };
// }



import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { pathToFileURL } from 'url';
import { v4 as uuidv4 } from 'uuid';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

import { uploadDirs } from '../middleware/upload.js';
import { ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';

const execFileAsync = promisify(execFile);

/**
 * Resolve LibreOffice executable.
 *
 * Priority:
 * 1. LIBREOFFICE_PATH environment variable
 * 2. Common Windows locations
 * 3. Common Linux/macOS locations
 * 4. PATH lookup using "soffice"
 */
function resolveSofficeBinary() {
  // 1. Explicit environment variable
  if (process.env.LIBREOFFICE_PATH) {
    const configuredPath = process.env.LIBREOFFICE_PATH.trim();

    if (fs.existsSync(configuredPath)) {
      return configuredPath;
    }

    logger.warn(
      `LIBREOFFICE_PATH is configured but executable was not found: ${configuredPath}`
    );
  }

  // 2. Windows
  const windowsCandidates = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  ];

  // 3. Linux
  const linuxCandidates = [
    '/usr/bin/soffice',
    '/usr/bin/libreoffice',
    '/opt/libreoffice/program/soffice',
  ];

  // 4. macOS
  const macCandidates = [
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  ];

  const candidates = [
    ...windowsCandidates,
    ...linuxCandidates,
    ...macCandidates,
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      logger.info(`LibreOffice executable found: ${candidate}`);
      return candidate;
    }
  }

  // Last fallback:
  // If soffice is available through PATH, execFile will resolve it.
  return 'soffice';
}

/**
 * Check whether a LibreOffice executable exists.
 */
function isExplicitLibreOfficePath(binary) {
  return binary !== 'soffice';
}

/**
 * Fill a .docx template with {{placeholders}}.
 *
 * The uploaded Word document remains the MASTER TEMPLATE.
 *
 * This function does not recreate the certificate using HTML/CSS.
 * It directly modifies the DOCX XML while preserving the original
 * Word formatting, layout, tables, images, borders, fonts, etc.
 */
export function fillDocxTemplate(docxPath, data) {
  if (!fs.existsSync(docxPath)) {
    throw new ValidationError(
      'Master certificate template file is missing on the server'
    );
  }

  const stringData = {};

  Object.entries(data).forEach(([key, value]) => {
    stringData[key] =
      value === null || value === undefined
        ? ''
        : String(value);
  });

  const content = fs.readFileSync(docxPath, 'binary');

  let zip;

  try {
    zip = new PizZip(content);
  } catch (error) {
    throw new ValidationError(
      'Master certificate template file is not a valid .docx document'
    );
  }

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: {
      start: '{{',
      end: '}}',
    },
    nullGetter: () => '',
  });

  try {
    doc.render(stringData);
  } catch (error) {
    const details = error.properties?.errors
      ?.map((e) => e.properties?.explanation)
      .filter(Boolean)
      .join('; ');

    throw new ValidationError(
      `Failed to fill certificate template${
        details ? `: ${details}` : ''
      }`
    );
  }

  return doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
}

/**
 * Convert DOCX → PDF using LibreOffice.
 *
 * The DOCX generated by Docxtemplater is passed directly to LibreOffice.
 *
 * Important:
 * - Uses headless mode
 * - Uses an isolated temporary LibreOffice profile
 * - Handles Windows paths correctly
 * - Captures stdout/stderr
 * - Verifies that PDF was actually generated
 * - Cleans temporary profile
 */
export async function convertDocxToPdf(docxPath, outDir) {
  if (!fs.existsSync(docxPath)) {
    throw new ValidationError(
      'Generated DOCX file was not found for PDF conversion'
    );
  }

  // Make sure output directory exists.
  fs.mkdirSync(outDir, {
    recursive: true,
  });

  const binary = resolveSofficeBinary();

  logger.info(`Using LibreOffice executable: ${binary}`);

  // Create isolated LibreOffice profile.
  const profileDir = path.join(
    os.tmpdir(),
    `libreoffice-profile-${uuidv4()}`
  );

  fs.mkdirSync(profileDir, {
    recursive: true,
  });

  // IMPORTANT:
  // LibreOffice expects a proper file URL.
  //
  // Windows:
  // C:\Users\...\profile
  //
  // becomes:
  // file:///C:/Users/.../profile
  //
  const profileUrl = pathToFileURL(profileDir).href;

  try {
    logger.info(
      `Starting LibreOffice DOCX → PDF conversion`
    );

    logger.info(`Input DOCX: ${docxPath}`);
    logger.info(`Output directory: ${outDir}`);
    logger.info(`LibreOffice profile: ${profileUrl}`);

    const args = [
      '--headless',
      '--nologo',
      '--nodefault',
      '--nofirststartwizard',
      '--norestore',
      '--nolockcheck',

      `-env:UserInstallation=${profileUrl}`,

      '--convert-to',
      'pdf',

      '--outdir',
      outDir,

      docxPath,
    ];

    const result = await execFileAsync(
      binary,
      args,
      {
        timeout: 120000,
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      }
    );

    if (result.stdout) {
      logger.info(
        `LibreOffice stdout: ${result.stdout.trim()}`
      );
    }

    if (result.stderr) {
      logger.warn(
        `LibreOffice stderr: ${result.stderr.trim()}`
      );
    }
  } catch (error) {
    logger.error(
      `LibreOffice DOCX → PDF conversion failed`
    );

    logger.error(`Executable: ${binary}`);
    logger.error(`Input DOCX: ${docxPath}`);
    logger.error(`Output directory: ${outDir}`);

    if (error.stdout) {
      logger.error(
        `LibreOffice stdout: ${error.stdout}`
      );
    }

    if (error.stderr) {
      logger.error(
        `LibreOffice stderr: ${error.stderr}`
      );
    }

    logger.error(
      `LibreOffice error: ${error.message}`
    );

    if (
      isExplicitLibreOfficePath(binary) &&
      !fs.existsSync(binary)
    ) {
      throw new ValidationError(
        'LibreOffice executable was not found. Please verify LIBREOFFICE_PATH or the LibreOffice installation.'
      );
    }

    throw new ValidationError(
      'PDF conversion failed. Please verify that LibreOffice is correctly installed and accessible on the server. The generated Word certificate is still available for download.'
    );
  } finally {
    // Clean temporary LibreOffice profile.
    try {
      await fs.promises.rm(profileDir, {
        recursive: true,
        force: true,
      });
    } catch (cleanupError) {
      logger.warn(
        `Could not remove temporary LibreOffice profile: ${cleanupError.message}`
      );
    }
  }

  const pdfPath = path.join(
    outDir,
    `${path.basename(
      docxPath,
      path.extname(docxPath)
    )}.pdf`
  );

  // LibreOffice sometimes returns successfully but the output
  // file may not yet be available immediately.
  //
  // Check for a short period before declaring conversion failed.
  const maxWait = 5000;
  const startTime = Date.now();

  while (!fs.existsSync(pdfPath)) {
    if (Date.now() - startTime > maxWait) {
      throw new ValidationError(
        'LibreOffice completed but did not produce the expected PDF file'
      );
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 200)
    );
  }

  const stats = fs.statSync(pdfPath);

  if (stats.size === 0) {
    throw new ValidationError(
      'LibreOffice produced an empty PDF file'
    );
  }

  logger.info(
    `PDF successfully generated: ${pdfPath}`
  );

  return pdfPath;
}

/**
 * Full certificate generation pipeline.
 *
 * MASTER DOCX TEMPLATE
 *        ↓
 * Fill placeholders
 *        ↓
 * Generated DOCX
 *        ↓
 * LibreOffice
 *        ↓
 * Generated PDF
 */
export async function generateFromDocxTemplate(
  templateDocxPath,
  data,
  baseFileName
) {
  const outDir = uploadDirs.certificates;

  // Ensure certificate directory exists.
  fs.mkdirSync(outDir, {
    recursive: true,
  });

  const base = baseFileName || uuidv4();

  const docxFileName = `${base}.docx`;

  const docxOutPath = path.join(
    outDir,
    docxFileName
  );

  // ---------------------------------------------
  // STEP 1: Fill Word template
  // ---------------------------------------------

  const filledBuffer = fillDocxTemplate(
    templateDocxPath,
    data
  );

  fs.writeFileSync(
    docxOutPath,
    filledBuffer
  );

  logger.info(
    `DOCX certificate generated: ${docxOutPath}`
  );

  // ---------------------------------------------
  // STEP 2: Convert DOCX → PDF
  // ---------------------------------------------

  let pdfPath = null;
  let pdfFileName = null;

  try {
    pdfPath = await convertDocxToPdf(
      docxOutPath,
      outDir
    );

    pdfFileName = path.basename(pdfPath);

    logger.info(
      `Certificate PDF generated: ${pdfPath}`
    );
  } catch (error) {
    /*
     * IMPORTANT:
     *
     * DOCX generation has already succeeded.
     *
     * Therefore we don't destroy the successful DOCX
     * just because PDF conversion failed.
     */
    logger.warn(
      `Certificate PDF generation failed: ${error.message}`
    );

    return {
      docxPath: docxOutPath,
      docxFileName,

      pdfPath: null,
      pdfFileName: null,

      pdfError: error.message,
    };
  }

  return {
    docxPath: docxOutPath,
    docxFileName,

    pdfPath,
    pdfFileName,

    pdfError: null,
  };
}