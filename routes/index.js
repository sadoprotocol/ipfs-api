"use strict";

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
const maximumFilesize = 5 ** 8; // 50 MB

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
const acceptedMedia = [
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
    return next(createError(400, 'File size exceeded limit: ' + (maximumFilesize / 10 ** 6) + 'MB'));
  }

  // ### Read file and upload to IPFS

  const tmpFilePath = path.join(__dirname, '..', file.path);
  try {
    const contents = await fs.readFile(tmpFilePath, { encoding: 'base64' });
    const uploaded = await handleIpfs(contents, {
      name: req.body.name ? `${req.body.name}.${file.originalname.split(".").pop()}` : file.originalname,
      size: file.size,
      type: file.mimetype,
      pin: req.body.pin === true
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

router.get("/:cid", async function (req, res, next) {
  try {
    const file = await ipfsModel.findOne({ path: req.params.cid });
    if (file === false) {
      return next(createError(404, 'File not found.'));
    }
    const content = await ipfs.get(file.path);
    if (content === undefined) {
      return next(createError(500, 'Unable to fetch file from IPFS.'));
    }
    console.log(file);
    res.set('Content-Type', file.type);
    res.status(200).send(Buffer.from(content, 'base64'));
  } catch (err) {
    console.log(err);
    next(createError(500, err.message));
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

module.exports = router;
