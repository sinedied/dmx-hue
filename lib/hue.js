'use strict';

const Color = require('color');
const hue = require('node-hue-api');
const HueApi = hue.api;
const Util = require('./util');

const APP_DESCRIPTION = 'dmx-hue utility';

class Hue {
  getLights() {
    return this.api
      .lights()
      .then(result => result.lights, () => Util.exit('No lights found'));
  }

  createLightState(r, g, b, bri, sat, ct, options) {
    const state = hue.lightState.create().transition(options.transition);
    if (r === g && g === b && b === 0) {
      state.off();
    } else if (options.colorloop && r === g && g === b && b === 1) {
      state
        .on()
        .effect('colorloop')
        .sat(sat)
        .bri(bri)
        .ct(ct);
    } else {
      const hsv = Color.rgb(r, g, b).hsv().array();
      state.on()
        .effect('none')
        .hsb(hsv[0], hsv[1], hsv[2])
        .bri(bri)
        .sat(sat)
        .ct(ct);
    }
    return state;
  }

  setLight(id, state) {
    return this.api.setLightState(id, state);
  }

  listBridges(print) {
    return hue
      .nupnpSearch()
      .then(bridges => {
        if (print) {
          bridges.forEach(b => console.log(b.ipaddress));
        }
        return bridges;
      }, () => Util.exit('No bridge found'));
  }

  setupBridge(ip = null, force = false) {
    const bridge = Util.config.get('bridge');
    if (bridge && Util.config.get('user') && !force) {
      console.log(`Bridge configured at ${bridge}`);
      return Promise.resolve();
    }
    return hue
      .nupnpSearch()
      .then(bridges => {
        const bridge = ip ? bridges.find(b => b.ipaddress === ip) : bridges[0];
        if (bridge !== null) {
          Util.config.set('bridge', bridge.ipaddress);
          console.log(`Hue bridge found at ${bridge.ipaddress}`);
          return this.bridge;
        }
        return Promise.reject();
      })
      .catch(() => {
        if (ip) {
          Util.config.set('bridge', ip);
          console.log(`Forced Hue bridge at ${ip}`);
          return this.bridge;
        }
        Util.exit('No bridge found');
      })
      .then(bridge => new HueApi()
        .registerUser(bridge, APP_DESCRIPTION)
        .then(user => {
          Util.config.set('user', user);
          console.log('Linked bridge successfully');
          return user;
        }, () => Util.exit('Cannot link, press the button on bridge and try again.')));
  }

  get bridge() {
    return Util.config.get('bridge') || Util.exit('Bridge not configured, run "dmx-hue setup"');
  }

  get user() {
    return Util.config.get('user') || Util.exit('Bridge not linked, run "dmx-hue setup"');
  }

  get api() {
    if (!this._api) {
      this._api = new HueApi(this.bridge, this.user);
    }
    return this._api;
  }
}

module.exports = Hue;
