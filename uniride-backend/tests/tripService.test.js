const test = require('node:test');
const assert = require('node:assert/strict');
const tripService = require('../services/tripService');

test('isVehicleActive normaliza los valores comunes de BIT y boolean', () => {
  assert.equal(tripService.isVehicleActive(true), true);
  assert.equal(tripService.isVehicleActive(false), false);
  assert.equal(tripService.isVehicleActive(1), true);
  assert.equal(tripService.isVehicleActive(0), false);
  assert.equal(tripService.isVehicleActive('1'), true);
  assert.equal(tripService.isVehicleActive('true'), true);
  assert.equal(tripService.isVehicleActive('false'), false);
  assert.equal(tripService.isVehicleActive('activo'), true);
  assert.equal(tripService.isVehicleActive('inactivo'), false);
  assert.equal(tripService.isVehicleActive(null), true);
  assert.equal(tripService.isVehicleActive(undefined), true);
});
