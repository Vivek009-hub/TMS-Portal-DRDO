import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import { ValidationError } from '../utils/errors.js';

const uploadDirs = {
  documents: path.join(config.upload.dir, 'documents'),
  certificates: path.join(config.upload.dir, 'certificates'),
  imports: path.join(config.upload.dir, 'imports'),
  templates: path.join(config.upload.dir, 'templates'),
};

Object.values(uploadDirs).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function createStorage(subdir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDirs[subdir]),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'text/plain',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError('File type not allowed'), false);
  }
};

export const uploadDocument = multer({
  storage: createStorage('documents'),
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter,
});

export const uploadImport = multer({
  storage: createStorage('imports'),
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError('Only Excel files are allowed'), false);
    }
  },
});

export const uploadDocx = multer({
  storage: createStorage('imports'),
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new ValidationError('Only .docx Word files are allowed'), false);
    }
  },
});

export { uploadDirs };
