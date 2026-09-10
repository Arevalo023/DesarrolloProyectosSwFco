const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const validateMiddleware = require('../middlewares/validateMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @route   POST /users/register
 * @desc    Registrar un nuevo usuario
 * @access  Público
 */
router.post(
  '/register',
  validateMiddleware.validateRegister,
  authController.register
);

/**
 * @route   POST /users/login
 * @desc    Iniciar sesión y obtener token JWT
 * @access  Público
 */
router.post(
  '/login',
  validateMiddleware.validateLogin,
  authController.login
);

/**
 * @route   GET /users/me
 * @desc    Obtener perfil del usuario autenticado
 * @access  Privado (requiere Bearer Token)
 */
router.get(
  '/me',
  authMiddleware.verifyToken,
  authController.me
);

router.get(
  '/campuses',
  authMiddleware.verifyToken,
  authController.campuses
);

/**
 * @route   PATCH /users/me
 * @desc    Actualizar los datos editables del perfil autenticado
 * @access  Privado (requiere Bearer Token)
 */
router.patch(
  '/me',
  authMiddleware.verifyToken,
  authController.updateMe
);

module.exports = router;
