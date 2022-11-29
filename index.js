'use strict';

const minimist = require('minimist');
const inquirer = require('inquirer');
const chalk = require('chalk');
const Util = require('./lib/util');
const Hue = require('./lib/hue');
const ArtNet = require('./lib/artnet');
const pkg = require('./package.json');
/*number of channels 
1=red
2=green
3=blue
4=brightness
5=saturation
6=huestate temp
Note: this could be optimized. Not all lights need 6 channels. huestate temp lights only need 3
*/
const number_of_channels = 6;

const help =
`${chalk.bold('Usage:')} dmx-hue [setup] [options]

Create an ArtNet DMX<>Hue bridge.

${chalk.bold('Options:')}
  -h, --host       Host address to listen on              [default: '0.0.0.0']
  -a, --address    Set DMX address (range 1-511)          [default: 1]
  -u, --universe   Art-Net universe                       [default: 0]
  -t, --transition Set transition time in ms              [default: 100]
                   Can also be set to 'channel' to enable a dedicated DMX
                   channel on which 1 step equals 100ms.
  -c, --huestateloop  Enable huestateloop feature
                   When enabled, setting all RGB channels of a light to 1 will
                   enable huestateloop mode.
  -n, --no-limit   Disable safety rate limiting
                   Warning: when this option is enabled, make sure to not send
                   more than <number_of_lights>/10 updates per second, or you
                   might overload your Hue bridge.

Note: options overrides settings saved during setup.

${chalk.bold('Commands:')}
  setup            Configure hue bridge and DMX options
    -l, --list     List bridges on the network
    -i, --ip       Set bridge IP (use first bridge if not specified)
    --force        Force bridge setup if already configured
`;

class DmxHue {
  constructor(args) {
    this._args = minimist(args, {
      boolean: ['list', 'force', 'help', 'version', 'huestateloop', 'no-limit'],
      string: ['ip', 'host', 'transition'],
      number: ['address', 'universe'],
      alias: {
        l: 'list',
        i: 'ip',
        h: 'host',
        a: 'address',
        t: 'transition',
        c: 'huestateloop',
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
        const ordered = options.order.reduce((r, id) => {
          const light = lights.find(light => light.id === id.toString());
          if (light && !options.disabled[id]) {
            r.push(light);
          }
          return r;
        }, []);
        const remaining = lights.filter(light => !options.disabled[light.id] && !ordered.find(o => light.id === o.id));
        options.lights = ordered.concat(remaining);
        options.transitionChannel = options.transition === 'channel';
        options.huestates = {};
        const dmxChannelCount = (number_of_channels * options.lights.length) + (options.transitionChannel ? 1 : 0);
        const extraDmxAddress = options.address + dmxChannelCount - 512;

        if (extraDmxAddress >= 0) {
          console.warn(chalk.yellow('Warning: not enough DMX channels, some lights will be unavailable'));
          const lightsToRemove = Math.ceil(extraDmxAddress / number_of_channels);
          options.lights = options.lights.slice(0, -lightsToRemove);
        }

        return ArtNet.listen(options.host, data => {
          if (data.universe === options.universe) {
            this._updateLights(data.dmx, options);
          }
        });
      })
      .then(() => {
        let currentAddress = options.address;
        if (options.noLimit) {
          console.warn(chalk.yellow('Warning, safety rate limiting is disabled!\n'));
        }
        console.log(chalk.bold(`DMX addresses on universe ${options.universe}:`));
        if (options.transitionChannel) {
          console.log(` ${currentAddress++}: transition time`);
        }
        options.lights.forEach(light => {
          console.log(` ${chalk.cyan(`${currentAddress}:`)} ${light.name} ${chalk.grey(`(Hue ID: ${light.id})`)} ${light.type}`);
          currentAddress += number_of_channels;
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

    const dmx = dmxData.slice(address, address + (number_of_channels * options.lights.length));
    let j = 0;
    const length = options.lights.length;
    let indices = Array.from({length}, (_, i) => i);
    indices = this._shuffle(indices);

    let i;
    for (i of indices) {
      const lightId = options.lights[i].id;
      j = i * number_of_channels;
      const huestate = dmx.slice(j, j + number_of_channels);
      const previous = options.huestates[lightId];

      // Update light only if rgb huestate changed
      if (!previous || huestate[0] !== previous[0] || huestate[1] !== previous[1] || huestate[2] !== previous[2]) {
        // Rate limit Hue API to 0,1s between calls
        const now = new Date().getTime();
        if (options.noLimit || now - this._lastUpdate >= 100) {
          const state = this._hue.createLightState(huestate[0], huestate[1], huestate[2], options);
          this._lastUpdate = now;
          this._hue.setLight(lightId, state);
          options.huestates[lightId] = huestate;
        } else if (!this._delayedUpdate) {
          // Make sure to apply update later if changes could not be applied
          this._delayedUpdate = setTimeout(() => this._updateLights(dmxData, options), 100);
        }
      }

      // Update light only if bri, sat or ct huestate changed
      if (!previous || huestate[3] !== previous[3] || huestate[4] !== previous[4] || huestate[5] !== previous[5]) {
        // Rate limit Hue API to 0,1s between calls
        const now = new Date().getTime();
        if (options.noLimit || now - this._lastUpdate >= 100) {
          const state = this._hue.createctLightState(huestate[3], huestate[4], huestate[5], options);
          this._lastUpdate = now;
          this._hue.setLight(lightId, state);
          options.huestates[lightId] = huestate;
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
              validate: input => parseInt(input, 10) >= 0
            },
            {
              type: 'confirm',
              name: 'huestateloop',
              message: 'Enable huestateloop feature',
              default: Util.config.get('huestateloop') || false
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
            Util.config.set('huestateloop', answers.huestateloop);
            Util.config.set('transition', answers.transitionChannel ? 'channel' : parseInt(answers.transition, 10));
            Util.config.set('disabledLights', lights
              .filter(light => !answers.lights.includes(light.id))
              .reduce((l, light) => {
                l[light.id] = true;
                return l;
              }, {}));
            console.log(`Configuration saved at ${chalk.green(Util.config.path)}`);
          });
      });
  }

  _shuffle(array) {
    let currentIndex = array.length;
    let temporaryValue;
    let randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
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
      huestateloop: this._args.huestateloop || Util.config.get('huestateloop') || false,
      transition: this._args.transition || Util.config.get('transition') || 100,
      noLimit: this._args['no-limit'] || Util.config.get('noLimit') || false,
      universe: this._args.universe || Util.config.get('universe') || 0,
      disabled: Util.config.get('disabledLights') || {},
      order: Util.config.get('lightsOrder') || []
    });
  }
}

module.exports = DmxHue;
