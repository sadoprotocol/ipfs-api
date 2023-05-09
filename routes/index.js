"use strict";

const createError = require('http-errors');
const express = require('express');
const router = express.Router();

const ipfsModel = require('../models/ipfs');
const ipfs = require('../modules/ipfs');

const myGateway = process.env.IPFS_GATEWAY;

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

router.post("/upload", function(req, res, next) {
  let maximumFilesize = 5 ** 8; // 50 MB

  // Check data received
  if (
    req.body.name !== undefined 
    && req.body.size !== undefined
    && req.body.type !== undefined
    && req.body.file !== undefined
  ) {
    // Check media type
    if (acceptedMedia.includes(req.body.type)) {
      // Check size
      if (req.body.size <= maximumFilesize) {
        try {
          // Convert the base64 to buffer and save the media temporarily
          let baseImage = req.body.file;
          let ext = baseImage.substring(baseImage.indexOf("/") + 1, baseImage.indexOf(";base64"));
          let fileType = baseImage.substring("data:".length,baseImage.indexOf("/"));

          //Forming regex to extract base64 data of file.
          let regex = new RegExp(`^data:${fileType}\/${ext};base64,`, 'gi');

          // Extract base64 data.
          let base64_data = baseImage.replace(regex, "");
          let bitmap = Buffer.from(base64_data, 'base64');

          handleIpfs(bitmap, req.body).then(uploaded => {
            res.json({
              success: true,
              message: 'OK',
              rdata: {
                address: uploaded.path,
                "ipfs-gateway": `https://ipfs.io/ipfs/${uploaded.path}`,
                "cake-gateway": `${myGateway}/ipfs/${uploaded.path}`
              }
            });
          }).catch(err => {
            next(createError(500, err.message));
          });
        } catch (err) {
          next(createError(500, err.message));
        }
      } else {
        next(createError(406, 'Filesize exceed limit: ' + (maximumFilesize / 10 ** 6) + 'MB'));
      }
    } else {
      next(createError(406, 'Invalid media type, ' + req.body.type));
    }
  } else {
    next(createError(406, 'Insufficient parameter received.'));
  }
});

// ==

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

