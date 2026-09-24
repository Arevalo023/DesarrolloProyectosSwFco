const express = require('express');
const router = express.Router();

const vehicleController = require('../controllers/vehicleController');
const validateMiddleware = require('../middlewares/validateMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @route   POST /api/vehicles
 * @desc    Registrar un nuevo vehículo (cualquier usuario autenticado)
 * @access  Privado (requiere Bearer Token)
 */
router.post(
  '/',
  authMiddleware.verifyToken,
  validateMiddleware.validateVehicle,
  vehicleController.create
);

/**
 * @route   GET /api/vehicles/user
 * @desc    Obtener los vehículos del usuario autenticado
 * @access  Privado (requiere Bearer Token)
 */
router.get(
  '/user',
  authMiddleware.verifyToken,
  vehicleController.listMine
);

/**
 * @route   GET /api/vehicles/:id
 * @desc    Obtener un vehículo por su ID
 * @access  Privado (requiere Bearer Token)
 */
router.get(
  '/:id',
  authMiddleware.verifyToken,
  vehicleController.getById
);

/**
 * @route   PUT /api/vehicles/:id
 * @desc    Editar información completa de un vehículo propio
 * @access  Privado (requiere Bearer Token)
 */
router.put(
  '/:id',
  authMiddleware.verifyToken,
  validateMiddleware.validateVehicle,
  vehicleController.update
);

/**
 * @route   PATCH /api/vehicles/:id/status
 * @desc    Cambiar estado activo/inactivo de un vehículo propio
 * @access  Privado (requiere Bearer Token)
 */
router.patch(
  '/:id/status',
  authMiddleware.verifyToken,
  validateMiddleware.validateVehicleStatus,
  vehicleController.changeStatus
);

/**
 * @route   DELETE /api/vehicles/:id
 * @desc    Eliminar un vehículo propio
 * @access  Privado (requiere Bearer Token)
 */
router.delete(
  '/:id',
  authMiddleware.verifyToken,
  vehicleController.remove
);

module.exports = router;
