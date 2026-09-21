const express = require("express");

const tripController = require("../controllers/tripController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/", authMiddleware.verifyToken, tripController.listAvailable);
router.post("/:id/book", authMiddleware.verifyToken, roleMiddleware(["Pasajero"]), tripController.book);

module.exports = router;