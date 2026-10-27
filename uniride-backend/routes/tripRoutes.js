const express = require("express");

const tripController = require("../controllers/tripController");
const ratingController = require("../controllers/ratingController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const validateMiddleware = require("../middlewares/validateMiddleware");

const router = express.Router();

/**
 * @route   GET /api/trips/admin
 * @desc    Listar viajes registrados con filtros (estado, fecha, conductor) y paginación
 * @access  Privado (requiere Bearer Token y rol Administrador)
 */
router.get(
	"/admin",
	authMiddleware.verifyToken,
	roleMiddleware("Administrador"),
	validateMiddleware.validateListTripsAdmin,
	tripController.listAdmin
);

/**
 * @route   GET /api/trips/admin/:id
 * @desc    Consultar detalle de un viaje con sus reservaciones
 * @access  Privado (requiere Bearer Token y rol Administrador)
 */
router.get(
	"/admin/:id",
	authMiddleware.verifyToken,
	roleMiddleware("Administrador"),
	validateMiddleware.validateTripIdParam,
	tripController.getDetailAdmin
);

router.post(
	"/",
	authMiddleware.verifyToken,
	roleMiddleware(["Conductor"]),
	tripController.create
);
router.get(
	"/driver",
	authMiddleware.verifyToken,
	roleMiddleware(["Conductor"]),
	tripController.listByDriver
);
router.get(
	"/driver/requests",
	authMiddleware.verifyToken,
	roleMiddleware(["Conductor"]),
	tripController.listReceivedRequests
);
router.get("/reservations", authMiddleware.verifyToken, tripController.listReservations);
router.get("/", authMiddleware.verifyToken, tripController.listAvailable);

/**
 * @route   GET /api/trips/:id
 * @desc    Consultar detalle de un viaje con sus reservaciones (alias)
 * @access  Privado (requiere Bearer Token y rol Administrador)
 */
router.get(
	"/:id",
	authMiddleware.verifyToken,
	roleMiddleware("Administrador"),
	validateMiddleware.validateTripIdParam,
	tripController.getDetailAdmin
);

router.patch(
	"/:id/cancel",
	authMiddleware.verifyToken,
	roleMiddleware(["Conductor"]),
	tripController.cancel
);
router.patch(
	"/:id/start",
	authMiddleware.verifyToken,
	roleMiddleware(["Conductor"]),
	tripController.start
);
router.patch(
	"/:id/finish",
	authMiddleware.verifyToken,
	roleMiddleware(["Conductor"]),
	tripController.finish
);
router.post("/:id/book", authMiddleware.verifyToken, roleMiddleware(["Pasajero"]), tripController.book);
router.post("/:id/rate-driver", authMiddleware.verifyToken, ratingController.rateDriver);
router.post(
	"/:id/rate-passenger",
	authMiddleware.verifyToken,
	roleMiddleware(["Conductor"]),
	ratingController.ratePassenger
);

module.exports = router;