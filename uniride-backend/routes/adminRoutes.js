const express = require('express');

const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get(
  '/summary',
  authMiddleware.verifyToken,
  roleMiddleware('Administrador'),
  adminController.summary
);

module.exports = router;
