const express = require('express');
const router = express.Router();
const {
  getCurrentOrganization,
  getBeneficiaries,
  addBeneficiary,
  handoverCare,
  getAggregateReport
} = require('../controllers/organizationController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');

router.use(protect);

router.get('/current', getCurrentOrganization);
router.get('/beneficiaries', getBeneficiaries);
router.post('/beneficiaries', addBeneficiary);
router.post('/beneficiaries/:id/handover', handoverCare);
router.get('/report', getAggregateReport);

module.exports = router;
