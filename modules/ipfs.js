"use strict";

const https = require('https');
const ipfs = require("ipfs-http-client");
const ipfsConfig = {
  gateway: process.env.IPFS_GATEWAY,
  api: process.env.IPFS_API,
  lifetime: process.env.IPFS_IPFS_LIFETIME
};

exports.create = create;
exports.get = get;
exports.resolve = resolve;
exports.publish = publish;
exports.pin = pin;
exports.unpin = unpin;
exports.keyGen = keyGen;
exports.getContent = getContent;

var client = false;

if (!client) {
  client = ipfs.create(ipfsConfig.api);

  if (!client) {
    throw new Error("Unable to create IPFS client at " + ipfsConfig.api);
  }
}

// Note: default auto pin disabled
async function create(content) {
  let data = await client.add(content, { pin: false });
  data.url = ipfsConfig.gateway + '/ipfs/' + data.path;
  return data;
}

async function get(addr) {
  return getContent(ipfsConfig.gateway + '/ipfs/' + addr)
}

async function pin(addr) {
  if (!addr.includes('ipfs')) {
    addr = '/ipfs/' + addr;
  }

  let pinned = await client.pin.add(addr)
  return pinned;
}

async function unpin(addr) {
  try {
    if (!addr.includes('ipfs')) {
      addr = '/ipfs/' + addr;
    }

    let unpinned = await client.pin.rm(addr)
    return unpinned;
  } catch (err) {
    throw err;
  }
}

async function resolve(name) {
  let addr = '/ipns/' + name;
  let resolved = false;

  for await (const name of client.name.resolve(addr, { recursive: false, timeout: 10000 })) {
    resolved = name;
  }

  return resolved;
}

async function keyGen(id) {
  let keys = await client.key.list();
  let key = null;

  for (let k = 0; k < keys.length; k++) {
    if (keys[k].name === id) {
      key = keys[k];
    }
  }

  if (!key) {
    key = await client.key.gen(id);
  }

  return key;
}

// Note: will pin new content and unpin old content
async function publish(ipfsData, id, wait = false) {
  let addr = '/ipfs/' + ipfsData.cid;
  let key = await keyGen(id);

  // Check first if the ipns resolved to something else
  // if yes.. remove the old from pin and pin the new one
  let currentAddr = await resolve(key.id);

  if (currentAddr && currentAddr !== addr) {
    try {
      await unpin(currentAddr);
    } catch (err) {
      console.log('unpin error', err);
    }
  }

  await pin(addr);

  let asyncMethod = client.name.publish(addr, {
    'key': id,
    'lifetime': ipfsConfig.lifetime,
    'resolve': false
  });

  await timeout(asyncMethod, false, wait);

  return {
    name: key.id,
    value: 'ipfs/' + ipfsData.path,
    url: ipfsConfig.gateway + '/ipns/' + key.id
  };
}

function timeout(asyncMethod, seconds = 10, wait = false) {
  return new Promise(resolve => {
    asyncMethod.then(() => {
      resolve(true);
    });

    if (!wait) {
      setTimeout(function () {
        resolve(true);
      }, seconds * 1000);
    }
  });
}

function getContent(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      let data = '';

      // A chunk of data has been received.
      resp.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        resolve(data);
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

