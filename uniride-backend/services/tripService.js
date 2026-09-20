const tripModel = require("../models/tripModel");

const tripService = {
  listAvailable(filters) {
    return tripModel.findAvailable(filters);
  },

  book(tripId, passengerId) {
    return tripModel.book(tripId, passengerId);
  },
};

module.exports = tripService;