"use strict";

const mongoConfig = {
  hostname: process.env.MONGO_HOSTNAME,
  database: process.env.MONGO_DATABASE,
  username: process.env.MONGO_USERNAME,
  password: process.env.MONGO_PASSWORD,
  port: process.env.MONGO_PORT
};

const MongoClient = require('mongodb').MongoClient;
const mongo = require('mongodb');

exports.getClient = getClient;
exports.getGfs = getGfs;
exports.connect = connectServer;
exports.disconnect = disconnect;

var dbConnected = false;
var dbGfsConnected = false;
var dbDatabase = false;

function getClient() {
  if (dbConnected === false) {
    throw new Error('MongoDB disconnected');
  }
  return dbConnected.db(dbDatabase);
}

function getGfs() {
  if (dbGfsConnected === false) {
    throw new Error('MongoDB GFS disconnected');
  }
  return dbGfsConnected;
}

async function connectServer() {
  try {
    let url = "";
    let username = mongoConfig.username;
    let password = mongoConfig.password;
    let hostname = mongoConfig.hostname;
    let database = mongoConfig.database;
    let port = mongoConfig.port;

    if (username === "" && password === "") {
      url = "mongodb://"+hostname+":"+port+'/'+database;
    } else {
      url = "mongodb://"+username+":"+password+"@"+hostname+":"+port+'/'+database;
    }

    console.log('Mongo: Connecting to ' + hostname + ':' + port + '/' + database);

    dbConnected = await connectDb(url);
    dbDatabase = database;

    try {
      dbGfsConnected = createGfs();
    } catch (err) {
      console.log(err.message);
    }

    return dbConnected;
  } catch(e) {
    throw e;
  }
}

function connectDb(url) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true, 
      authSource:'admin' 
    }, function (err, db) {
      if (err) {
        reject(err);
      }
      resolve(db);
    });
  });
}

function disconnect() {
  if (dbConnected) {
    dbConnected.close();
    dbGfsConnected = false;
  }
}

function createGfs() {
  return new mongo.GridFSBucket(getClient());
}
