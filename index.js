'use strict';

const minimist = require('minimist');
const inquirer = require('inquirer');
const Util = require('./lib/util');
const Hue = require('./lib/hue');
const ArtNet = require('./lib/artnet');
const pkg = require('./package.json');

const help =
`Usage: dmx-hue [setup] [options]

Create an ArtNet DMX<>Hue bridge.

Options:
  -h, --host       Host address to listen on              [default: '0.0.0.0']
  -a, --address    Set DMX address (range 1-511)          [default: 1]
  -u, --universe   Art-Net universe                       [default: 0]
  -t, --transition Set transition time in ms              [default: 100]
                   Can also be set to 'channel' to enable a dedicated DMX
                   channel on which 1 step equals 100ms.
  -c, --colorloop  Enable colorloop feature
                   When enabled, setting all RGB channels of a light to 1 will
                   enable colorloop mode.
  -n, --no-limit   Disable safety rate limiting
                   Warning: when this option is enabled, make sure to not send
                   more than <number_of_lights>/10 updates per second, or you
                   might overload your Hue bridge.

Note: options overrides settings saved during setup.

Commands:
  setup            Configure hue bridge and DMX options
    -l, --list     List bridges on the network
    -i, --ip       Set bridge IP (use first bridge if not specified)
    --force        Force bridge setup if already configured
`;

class DmxHue {

  constructor(args) {
    this._args = minimist(args, {
      boolean: ['list', 'force', 'help', 'version', 'colorloop', 'no-limit'],
      string: ['ip', 'host', 'transition'],
      number: ['address', 'universe'],
      alias: {
        l: 'list',
        i: 'ip',
        h: 'host',
        a: 'address',
        t: 'transition',
        c: 'colorloop',
        n: 'no-limit',
        u: 'universe'
      }
    });
    this._hue = new Hue();
    this._lastUpdate = 0;
    this._delayedUpdate = null;
  }

  start(options) {
    if (options.address <= 0 || options.address > 511) {
      Util.exit('Invalid DMX address');
    }

    options = Object.assign({}, options);
    this._hue
      .getLights()
      .then(lights => {
        const disabled = Util.config.get('disabledLights') || {};
        options.lights = lights.filter(light => !disabled[light.id]);
        options.transitionChannel = options.transition === 'channel';
        options.colors = {};
        const dmxChannelCount = (3 * options.lights.length) + (options.transitionChannel ? 1 : 0);
        const extraDmxAddress = options.address + dmxChannelCount - 512;

        if (extraDmxAddress >= 0) {
          console.warn('Warning: not enough DMX channels, some lights will be unavailable');
          const lightsToRemove = Math.ceil(extraDmxAddress / 3.0);
          options.lights = options.lights.slice(0, -lightsToRemove);
        }

        return ArtNet.listen(options.host, data => {
          if (data.univers === options.universe) {
            this._updateLights(data.dmx, options);
          }
        });
      })
      .then(() => {
        let currentAddress = options.address;
        if (options.noLimit) {
          console.log('Warning, safety rate limiting is disabled!\n');
        }
        console.log(`DMX addresses on universe ${options.universe}:`);
        if (options.transitionChannel) {
          console.log(` ${currentAddress++}: transition time`);
        }
        options.lights.forEach(light => {
          console.log(` ${currentAddress}: ${light.name}`);
          currentAddress += 3;
        });
        console.log('\nArtNet node started (CTRL+C to quit)');
      });
  }

  setup(ip, force) {
    this._hue.setupBridge(ip, force).then(() => this._setupOptions());
  }

  _updateLights(dmxData, options) {
    if (this._delayedUpdate) {
      clearTimeout(this._delayedUpdate);
      this._delayedUpdate = null;
    }

    let address = options.address - 1;

    if (options.transitionChannel) {
      options.transition = dmxData[address] * 100;
      address++;
    }

    const dmx = dmxData.slice(address, address + (3 * options.lights.length));
    let j = 0;

    for (let i = 0; i < options.lights.length; i++) {
      const lightId = options.lights[i].id;
      const color = dmx.slice(j, j + 3);
      const previous = options.colors[lightId];
      j += 3;

      // Update light only if color changed
      if (!previous || color[0] !== previous[0] || color[1] !== previous[1] || color[2] !== previous[2]) {
        // Rate limit Hue API to 0,1s between calls
        const now = new Date().getTime();
        if (options.noLimit || now - this._lastUpdate >= 100) {
          const state = this._hue.createLightState(color[0], color[1], color[2], options);
          this._lastUpdate = now;
          this._hue.setLight(lightId, state);
          options.colors[lightId] = color;
        } else if (!this._delayedUpdate) {
          // Make sure to apply update later if changes could not be applied
          this._delayedUpdate = setTimeout(() => this._updateLights(dmxData, options), 100);
        }
      }
    }
  }

  _setupOptions() {
    const disabled = Util.config.get('disabledLights') || {};
    const transition = Util.config.get('transition') || 0;
    this._hue
      .getLights()
      .then(lights => {
        return inquirer
          .prompt([
            {
              type: 'input',
              name: 'dmxAddress',
              message: 'Set DMX address (range 1-511)',
              default: Util.config.get('dmxAddress') || 1,
              validate: input => {
                const value = parseInt(input, 10);
                return value > 0 && value <= 511;
              }
            },
            {
              type: 'input',
              name: 'universe',
              message: 'Set Art-Net universe',
              default: Util.config.get('universe') || 0,
              validate: input => parseInt(input, 10) > 0
            },
            {
              type: 'confirm',
              name: 'colorloop',
              message: 'Enable colorloop feature',
              default: Util.config.get('colorloop') || false
            },
            {
              type: 'confirm',
              name: 'transitionChannel',
              message: 'Use DMX channel for transition time',
              default: transition === 'channel'
            },
            {
              type: 'input',
              name: 'transition',
              message: 'Set transition time in ms',
              default: transition === 'channel' ? 100 : transition,
              when: answers => !answers.transitionChannel,
              validate: input => parseInt(input, 10) > 0
            },
            {
              type: 'checkbox',
              name: 'lights',
              message: 'Choose lights to use',
              choices: lights.map(light => ({
                name: light.name,
                value: light.id,
                checked: !disabled[light.id]
              }))
            }
          ])
          .then(answers => {
            Util.config.set('dmxAddress', parseInt(answers.dmxAddress, 10));
            Util.config.set('universe', parseInt(answers.universe, 10));
            Util.config.set('colorloop', answers.colorloop);
            Util.config.set('transition', answers.transitionChannel ? 'channel' : parseInt(answers.transition, 10));
            Util.config.set('disabledLights', lights
              .filter(light => !answers.lights.includes(light.id))
              .reduce((l, light) => {
                l[light.id] = true;
                return l;
              }, {}));
            console.log('Configuration saved.');
          });
      });
  }

  run() {
    if (this._args.help) {
      Util.exit(help, 0);
    } else if (this._args.version) {
      Util.exit(pkg.version, 0);
    } else if (this._args._[0] === 'setup') {
      return this._args.list ? this._hue.listBridges() : this.setup(this._args.ip, this._args.force);
    }

    if (this._args.transition !== 'channel') {
      const value = parseInt(this._args.transition, 10);
      this._args.transition = value >= 0 ? value : 0;
    }

    return this.start({
      host: this._args.host,
      address: this._args.address || Util.config.get('dmxAddress') || 1,
      colorloop: this._args.colorloop || Util.config.get('colorloop') || false,
      transition: this._args.transition || Util.config.get('transition') || 100,
      noLimit: this._args['no-limit'] || Util.config.get('noLimit') || false,
      universe: this._args.universe || Util.config.get('universe') || 0
    });
  }

}

module.exports = DmxHue;
