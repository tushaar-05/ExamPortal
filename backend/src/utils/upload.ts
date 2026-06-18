import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Ensure uploads directory exists
export const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '../../uploads');
if (!process.env.VERCEL && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const storage = process.env.VERCEL ? multer.memoryStorage() : diskStorage;

// File filter to only allow images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images (jpeg, png, gif, webp) are allowed!'));
  }
};

export const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export const getUploadedImageUrl = (req: Request, file: Express.Multer.File): string => {
  if (file.buffer) {
    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  }

  const protocol = req.get('x-forwarded-proto') || req.protocol;
  return `${protocol}://${req.get('host')}/uploads/${file.filename}`;
};
