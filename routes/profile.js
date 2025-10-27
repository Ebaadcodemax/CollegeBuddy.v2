// routes/profile.js
const express = require('express');
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');
const User = require('../models/User');
const { ensureAuth } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024 } });

router.post('/avatar', ensureAuth, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).send('No file');

  const uploadStream = cloudinary.uploader.upload_stream({ folder: 'collegebuddy/avatars' }, async (err, result) => {
    if (err) {
      console.error('avatar upload err', err);
      return res.status(500).send('Upload failed');
    }
    const user = await User.findByIdAndUpdate(req.session.user.id, { avatarUrl: result.secure_url }, { new: true });
   
    req.session.user.avatarUrl = user.avatarUrl;
    res.redirect('/chat');
  });
  streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
});

module.exports = router;
