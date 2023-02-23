import dgram from 'node:dgram';
import { Buffer } from 'node:buffer';
import Util from './util.js';
import Network from './network.js';

const NODE_NAME = 'HueDMX';
const PORT = 6454;
const HEADER = 'Art-Net\0';
const OPCODE_OUTPUT = 0x50_00; // ArtDMX data packet
const OPCODE_POLL = 0x20_00; // ArtPoll packet
const OPCODE_POLLREPLY = 0x21_00; // ArtPollReply packet
const MIN_PROTOCOL_VERSION = 14;

export function listenArtNet(address, dmxHandler) {
  // Set up the socket
  const socket = dgram.createSocket(
    { type: 'udp4', reuseAddr: true },
    (message, peer) => {
      const header = message.toString('utf8', 0, 8);
      const opcode = message.readUInt16LE(8);
      const version = message.readUInt16BE(10);

      if (header !== HEADER || version < MIN_PROTOCOL_VERSION) {
        return;
      }

      if (opcode === OPCODE_OUTPUT) {
        // Deserialize DMX data
        const sequence = message.readUInt8(12);
        const physical = message.readUInt8(13);
        const universe = message.readUInt16LE(14);
        const length = message.readUInt16BE(16);
        const dmx = [];

        for (let i = 0; i < length; ++i) {
          dmx.push(message.readUInt8(18 + i));
        }

        dmxHandler({ sequence, physical, universe, length, dmx }, peer);
      } else if (opcode === OPCODE_POLL) {
        // Send ArtPollReply
        const buffer = Buffer.alloc(238);
        const itf = Network.interface();
        const ip = itf.address.split('.').map((s) => Number.parseInt(s, 10));
        const mac = itf.mac.split(':').map((s) => Number.parseInt(s, 16));
        buffer.write(HEADER, 0, 8);
        buffer.writeUInt16LE(OPCODE_POLLREPLY, 8);
        for (let i = 0; i < 4; i++) {
          buffer[10 + i] = ip[i];
        }

        buffer.writeUInt16LE(PORT, 14);
        buffer[23] = 0xa0; // Status 1
        buffer.write('tm', 24, 2); // ESTA code
        buffer.write(NODE_NAME, 26, 18); // Short name
        buffer.write(NODE_NAME, 44, 64); // Long name
        buffer[173] = 1; // Number of ports
        buffer[174] = 0x0f; // Port 1 can output DMX
        buffer[183] = 0x0f; // Port 1 good output
        buffer[190] = 0; // Port 1 address
        for (let i = 0; i < 6; i++) {
          buffer[201 + i] = mac[i];
        }

        buffer[212] = 0xc; // Status 2

        const to = address
          ? address.split('.')[0] + '.255.255.255'
          : '255.255.255.255';
        socket.setBroadcast(true);
        socket.send(buffer, 0, buffer.length, PORT, to);
      }
    }
  );

  return new Promise((resolve) => {
    socket.on('error', (error) =>
      Util.exit('Error: ' + (error.message ?? error))
    );
    socket.bind(PORT, address, () => resolve(socket));
  });
}
