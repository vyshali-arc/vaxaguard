const express = require('express');
const router = express.Router();
const { getRecords, createRecord, downloadRecordPdf } = require('../controllers/recordController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.route('/')
  .get(getRecords)
  .post(upload.single('certificate'), createRecord);

router.get('/dependent/:dependentId/pdf', downloadRecordPdf);

module.exports = router;
