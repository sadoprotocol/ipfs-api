"use strict";

const createError = require('http-errors');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const helmet = require('helmet');
const useragent = require('express-useragent');

// APIs
const indexRouter = require('./routes/index');

const app = express();

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(express.json({ limit: process.env.APP_NETWORK_REQUEST_LIMIT, extended: true }));
app.use(express.urlencoded({ limit: process.env.APP_NETWORK_REQUEST_LIMIT, extended: true }));

app.use(logger('dev'));
app.use(cookieParser());
app.use(useragent.express());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Methods', "*");
  res.header("Access-Control-Allow-Headers", "*");
  if ('OPTIONS' === req.method) {
    res.sendStatus(200);
  } else {
    next();
  }
});

// API ===
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function(err, req, res, next) {
  console.log('');
  console.log('===============================================================');
  console.log(err);
  console.log('===============================================================');
  console.log('');

  res.status(err.status || 500);

  res.json({
    success: false,
    message: err.message
  });
});

module.exports = app;
