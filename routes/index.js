"use strict";

const CID = require('cids');
const fs = require('node:fs').promises;
const path = require('node:path');
const createError = require('http-errors');
const express = require('express');
const multer = require("multer");
const router = express.Router();

const ipfsModel = require('../models/ipfs');
const ipfs = require('../modules/ipfs');

const upload = multer({ dest: 'uploads/' });
const myGateway = process.env.IPFS_GATEWAY;
const maximumFilesize = 52_428_800; // 50 MB

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
const acceptedMedia = [
  'application/json',
  'application/pdf',
  'text/csv',
  'text/plain',
  'image/jpeg',
  'image/bmp',
  'image/gif',
  'image/png',
  'image/svg+xml',
  'image/tiff',
  'image/webp',
  'audio/mpeg',
  'audio/webm',
  'audio/wav',
  'audio/ogg',
  'audio/midi',
  'audio/x-midi',
  'video/x-msvideo',
  'video/mp4',
  'video/mpeg',
  'video/ogg',
  'video/webm'
];

router.post("/upload", upload.single("file"), async function (req, res, next) {
  const file = req.file;

  // ### File Validation

  if (file === undefined) {
    return next(createError(406, 'Missing file.'));
  }

  if (acceptedMedia.includes(file.mimetype) === false) {
    return next(createError(406, 'Invalid media type, ' + file.mimetype));
  }

  if (file.size > maximumFilesize) {
    return next(createError(400, 'File size exceeded limit: ' + maximumFilesize + 'MB. Received ' + file.size));
  }

  // ### Read file and upload to IPFS

  const tmpFilePath = path.join(__dirname, '..', file.path);

  try {
    const contents = await fs.readFile(tmpFilePath, { encoding: 'base64' });
    const bitmap = Buffer.from(contents, 'base64');
    const uploaded = await handleIpfs(bitmap, {
      name: req.body.name ? `${req.body.name}.${file.originalname.split(".").pop()}` : file.originalname,
      size: file.size,
      type: file.mimetype,
      pin: req.body.pin === "true"
    });
    res.json({
      success: true,
      message: 'OK',
      rdata: {
        address: uploaded.path,
        "ipfs-gateway": `https://ipfs.io/ipfs/${uploaded.path}`,
        "cake-gateway": `${myGateway}/ipfs/${uploaded.path}`
      }
    });
  } catch (err) {
    console.log(err);
    next(createError(500, err.message));
  } finally {
    fs.unlink(tmpFilePath); // remove temporary upload regardless of success or failure
  }
});

async function handleIpfs(bitmap, options) {
  let uploaded = await ipfs.create(bitmap);

  if (options.pin) {
    console.log('Pinning..');
    await ipfs.pin(uploaded.path);
  }

  await ipfsModel.create({
    name: options.name,
    size: options.size,
    type: options.type,
    path: uploaded.path,
    pin: options.pin || false
  });

  return uploaded;
}

router.all("/pin/:cid", async function (req, res, next) {
  pinOrUnpin(req.params.cid, true).then(() => {
    res.json({
      success: true,
      message: 'OK'
    });
  }).catch(next);
});

router.all("/unpin/:cid", async function (req, res, next) {
  pinOrUnpin(req.params.cid, false).then(() => {
    res.json({
      success: true,
      message: 'OK'
    });
  }).catch(next);
});

async function pinOrUnpin(cid, pin) {
  if (!cid || pin === undefined) {
    throw new Error("Insufficient parameter received.");
  }

  if (!cid) {
    throw new Error("Expecting CID.");
  }

  if (typeof pin !== 'boolean') {
    throw new Error("Expecting pin to be a boolean value.");
  }

  const cidInstance = new CID(cid);

  if (!CID.isCID(cidInstance)) {
    throw new Error(`${cid} is an invalid CID.`);
  }

  if (pin === true) {
    await ipfs.pin(cid);
  } else {
    await ipfs.unpin(cid);
  }

  let existInLog = await ipfsModel.findOne({ path: cid });

  if (existInLog && existInLog._id) {
    await ipfsModel.update({
      _id: existInLog._id,
      pin: pin
    });
  } else {
    await ipfsModel.create({
      name: '',
      size: 0,
      type: '',
      path: cid,
      pin: pin
    });
  }
}

module.exports = router;
