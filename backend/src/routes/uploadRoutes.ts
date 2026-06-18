import { Router, Request, Response } from 'express';
import { getUploadedImageUrl, upload } from '../utils/upload';
import { authenticateUser, authorizeRoles } from '../middleware/auth';

const router = Router();

// Endpoint for uploading single image
router.post('/', authenticateUser, authorizeRoles('ADMIN'), upload.single('image'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided' });
  }

  const imageUrl = getUploadedImageUrl(req, req.file);

  return res.status(200).json({
    message: 'Image uploaded successfully',
    url: imageUrl
  });
});

export default router;
