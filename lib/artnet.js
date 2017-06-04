'use strict';

const dgram = require('dgram');
const Util = require('./util');
const Network = require('./network');

const NODE_NAME = 'HueDMX';
const PORT = 6454;
const HEADER = 'Art-Net\0';
const OPCODE_OUTPUT = 0x5000;     // ArtDMX data packet
const OPCODE_POLL = 0x2000;       // ArtPoll packet
const OPCODE_POLLREPLY = 0x2100;  // ArtPollReply packet
const MIN_PROTOCOL_VERSION = 14;

class ArtNet {

  static listen(address, dmxHandler) {
    // Set up the socket
    const socket = dgram.createSocket('udp4', (msg, peer) => {
      const header = msg.toString('utf8', 0, 8);
      const opcode = msg.readUInt16LE(8);
      const version = msg.readUInt16BE(10);

      if (header !== HEADER || version < MIN_PROTOCOL_VERSION) {
        return;
      }

      if (opcode === OPCODE_OUTPUT) {
        // Deserialize DMX data
        const sequence = msg.readUInt8(12);
        const physical = msg.readUInt8(13);
        const universe = msg.readUInt16LE(14);
        const length = msg.readUInt16BE(16);
        const dmx = [];

        for (let i = 0; i < length; ++i) {
          dmx.push(msg.readUInt8(18 + i));
        }

        dmxHandler({sequence, physical, universe, length, dmx}, peer);
      } else if (opcode === OPCODE_POLL) {
        // Send ArtPollReply
        const buffer = Buffer.alloc(238);
        const itf = Network.interface();
        const ip = itf.address.split('.').map(s => parseInt(s, 10));
        const mac = itf.mac.split(':').map(s => parseInt(s, 16));
        buffer.write(HEADER, 0, 8);
        buffer.writeUInt16LE(OPCODE_POLLREPLY, 8);
        for (let i = 0; i < 4; i++) {
          buffer[10 + i] = ip[i];
        }
        buffer.writeUInt16LE(PORT, 14);
        buffer[23] = 0xA0;                // Status 1
        buffer.write('tm', 24, 2);        // ESTA code
        buffer.write(NODE_NAME, 26, 18);  // Short name
        buffer.write(NODE_NAME, 44, 64);  // Long name
        buffer[173] = 1;                  // Number of ports
        buffer[174] = 0x0f;               // Port 1 can output DMX
        buffer[183] = 0x0f;               // Port 1 good output
        buffer[190] = 0;                  // Port 1 address
        for (let i = 0; i < 6; i++) {
          buffer[201 + i] = mac[i];
        }
        buffer[212] = 0xC;                // Status 2

        const to = address ? address.split('.')[0] + '.255.255.255' : '255.255.255.255';
        socket.setBroadcast(true);
        socket.send(buffer, 0, buffer.length, PORT, to);
      }
    });

    return new Promise(resolve => {
      socket.on('error', err => Util.exit('Error: ' + (err.message ? err.message : err)));
      socket.bind(PORT, address, () => resolve(socket));
    });
  }
}

module.exports = ArtNet;
