require('dotenv').config();
var express = require('express');

var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const vehiclesRouter = require('./routes/vehicleRoutes');
const tripsRouter = require('./routes/tripRoutes');
const reservationsRouter = require('./routes/reservationRoutes');
const notificationsRouter = require('./routes/notificationRoutes');
const ratingsRouter = require('./routes/ratingRoutes');
const adminRouter = require('./routes/adminRoutes');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');


const app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Server is healthy' });
});

// Documentación interactiva Swagger / OpenAPI
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'UniRide API - Swagger UI',
  })
);
app.get('/api-docs.json', (req, res) => {
  res.status(200).json(swaggerDocument);
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/ratings', ratingsRouter);
app.use('/api/admin', adminRouter);

module.exports = app;
