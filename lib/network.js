'use strict';

const os = require('os');

class Network {
  static interface() {
    const interfaces = os.networkInterfaces();
    return Object.keys(interfaces)
      .map(n => interfaces[n])
      .map(n => n.find(i => !i.internal && i.family === 'IPv4'))
      .find(i => i);
  }
}

module.exports = Network;
