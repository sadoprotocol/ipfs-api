"use strict"

const mongo = require('../modules/mongodb');
const db = mongo.getClient();
const { ObjectId } = require('mongodb');

const collectionName = 'ipfs';

exports.create = create;
exports.update = update;
exports.findOne = findOne;

async function create(params) {
  if (
    typeof params === 'object'
    && params.name !== undefined
    && params.size !== undefined
    && params.type !== undefined
    && params.path !== undefined
  ) {
    let foundOne = await findOne({
      path: params.path
    });

    if (foundOne === false) {
      let insertRes = await db.collection(collectionName).insertOne({
        name: params.name,
        size: params.size,
        type: params.type,
        path: params.path,
        pin: params.pin || false,
        created: new Date()
      });

      return insertRes.ops[0]._id;
    } else {
      await update({
        _id: foundOne._id,
        pin: params.pin || false
      });

      return foundOne._id;
    }
  } else {
    console.log(params);
    throw new Error('Invalid ipfs parameters');
  }
}

async function update(params) {
  if (
    typeof params === 'object'
    && params._id !== undefined
  ) {
    let foundRes = await findOne({ _id: params._id });

    if (foundRes) {
      let updateObject = {};

      if ( typeof params.pin !== 'undefined') {
        updateObject.pin = params.pin;
      }

      await db.collection(collectionName).updateOne({ _id: params._id }, {
        $set: updateObject,
        $currentDate: { lastModified: true }
      });

      return true;
    }

    throw new Error("Can't find user");
  }

  throw new Error('Insufficient parameter received');
}

async function findOne(params) {
  if (typeof params._id === 'string') {
    params._id = ObjectId(params._id);
  }

  let findData = await db.collection(collectionName).findOne(params);

  if (findData !== null) {
    return findData;
  }

  return false;
}
