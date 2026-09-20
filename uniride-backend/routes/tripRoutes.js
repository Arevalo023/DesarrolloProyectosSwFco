const express = require("express");

const tripController = require("../controllers/tripController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware.verifyToken, tripController.listAvailable);
router.post("/:id/book", authMiddleware.verifyToken, tripController.book);

module.exports = router;