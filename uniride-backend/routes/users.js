const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const validateMiddleware = require('../middlewares/validateMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

/**
 * @route   GET /users
 * @desc    Listar usuarios registrados con búsqueda (q), filtro por rol (rol)
 *          y paginación (page, limit: 20 por defecto, máximo 50)
 * @access  Privado (requiere Bearer Token y rol Administrador)
 */
router.get(
  '/',
  authMiddleware.verifyToken,
  roleMiddleware('Administrador'),
  validateMiddleware.validateListUsers,
  userController.list
);

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
  validateMiddleware.validateUpdateProfile,
  authController.updateMe
);

module.exports = router;
