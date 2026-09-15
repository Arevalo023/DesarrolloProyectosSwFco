const express = require("express");
const router = express.Router();

const vehicleController = require("../controllers/vehicleController");
const validateMiddleware = require("../middlewares/validateMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");

/**
 * @route   POST /vehiculos
 * @desc    Registrar un nuevo vehículo
 * @access  Privado (requiere Bearer Token)
 */
router.post(
  "/",
  authMiddleware.verifyToken,
  validateMiddleware.validateVehicle,
  vehicleController.create,
);

/**
 * @route   GET /vehiculos/mios
 * @desc    Obtener los vehículos del usuario autenticado
 * @access  Privado (requiere Bearer Token)
 */
router.get("/mios", authMiddleware.verifyToken, vehicleController.listMine);

/**
 * @route   GET /vehiculos/:id
 * @desc    Obtener un vehículo por su ID
 * @access  Privado (requiere Bearer Token)
 */
router.get("/:id", authMiddleware.verifyToken, vehicleController.getById);

/**
 * @route   PATCH /vehiculos/:id
 * @desc    Actualizar los datos de un vehículo propio
 * @access  Privado (requiere Bearer Token)
 */
router.patch(
  "/:id",
  authMiddleware.verifyToken,
  validateMiddleware.validateVehicle,
  vehicleController.update,
);

/**
 * @route   DELETE /vehiculos/:id
 * @desc    Eliminar un vehículo propio
 * @access  Privado (requiere Bearer Token)
 */
router.delete("/:id", authMiddleware.verifyToken, vehicleController.remove);

module.exports = router;
