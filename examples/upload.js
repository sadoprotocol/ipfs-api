"use strict"

const IPFS = {
  endpoint: "http://ipfs-api.ordit.io",

  upload(form) {
    let _this = this;
    let fileObject = $(form).find('input[name=file]')[0].files[0];
    let pin = $(form).find('input[name=pin]').is(':checked');

    const reader = new FileReader();
    reader.readAsDataURL(fileObject);

    $(form).find('button').prop('disabled', true);

    reader.onload = function (e) {
      let options = { 
        file: e.target.result, 
        name: fileObject.name,
        size: fileObject.size,
        type: fileObject.type,
        pin
      };

      _this._send(options, { pathname: 'upload' }).then(response => {
        console.log("Response from server", response);

        $(form).find('button').prop('disabled', false);
      });
    }
  },

  async _send(message , options = {}) {
    message = this._refineMessage(message);

    let url = new URL(this.endpoint);

    if (options.pathname !== undefined) {
      url.pathname = url.pathname.replace(/\/+$/, "") + options.pathname;
    }

    if (message !== false) {
      let res = false;

      await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: message
      }).then(jsonResponse => {
        return jsonResponse.json();
      }).then(out => {
        res = out;
      }).catch(err => {
        console.error(err);
      });

      return res;
    }
  },

  _refineMessage(something) {
    if (typeof something !== 'string') {
      if (typeof something === 'object' || typeof something === 'array') {
        something = JSON.stringify(something);
      } else {
        throw new Error('Invalid message format');
      }
    }
    return something;
  }
}
