
const express = require('express');
const multer = require('multer');
const streamifier = require('streamifier');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('../config/cloudinary'); 
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
    } else {
      cb(null, true);
    }
  }
});


router.post('/image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const publicId = `collegebuddy/${uuidv4()}`;

  const uploadStream = cloudinary.uploader.upload_stream(
    { folder: 'collegebuddy', public_id: publicId, resource_type: 'image'},
    (error, result) => {
      if (error) {
        console.error('Cloudinary upload error:', error);
        return res.status(500).json({ error: 'Upload failed' });
      }
    
      return res.json({ url: result.secure_url, public_id: result.public_id });
    }
  );

  
  streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
});


module.exports = router;