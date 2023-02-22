import process from 'node:process';
import Conf from 'conf';

const Util = {
  exit(error, code = 1) {
    console.error(error);
    process.exit(code);
  },

  get config() {
    if (!Util._config) {
      Util._config = new Conf();
    }

    return Util._config;
  }
};

export default Util;
