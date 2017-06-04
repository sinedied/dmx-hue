'use strict';

const Conf = require('conf');

class Util {

  static exit(error, code = 1) {
    console.error(error);
    process.exit(code);
  }

  static get config() {
    if (!Util._config) {
      Util._config = new Conf();
    }
    return Util._config;
  }

}

module.exports = Util;
