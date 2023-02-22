import os from 'node:os';

const Network = {
  interface() {
    const interfaces = os.networkInterfaces();
    return Object.keys(interfaces)
      .map((n) => interfaces[n])
      .map((n) => n.find((i) => !i.internal && i.family === 'IPv4'))
      .find(Boolean);
  }
};

export default Network;
