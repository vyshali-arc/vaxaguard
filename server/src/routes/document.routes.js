const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '../../uploads/certificates');

// Secure document viewing route
router.get('/:filename', protect, (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(uploadDir, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'Certificate document not found'
    });
  }

  // Send protected file
  res.sendFile(filePath);
});

module.exports = router;
