# :bulb: dmx-hue

[![NPM version](https://img.shields.io/npm/v/dmx-hue.svg)](https://www.npmjs.com/package/dmx-hue)
[![Build status](https://img.shields.io/travis/sinedied/dmx-hue/master.svg)](https://travis-ci.org/sinedied/dmx-hue)
![Node version](https://img.shields.io/badge/node-%3E%3D6.0.0-brightgreen.svg)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

![dmx-hue-logo](https://cloud.githubusercontent.com/assets/593151/26761623/710db1ba-4933-11e7-9a08-471e3f9fb9e5.png)

> Art-Net node to control Philips Hue lights with DMX

## Installation

Install [NodeJS](https://nodejs.org), then open a command prompt:

```bash
npm install -g dmx-hue
```

## Usage

```
Usage: dmx-hue [setup] [options]

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
```

### Setup

Before being able to control Hue lights on your network, your first have to setup your Hue bridge with the app.
Run `dmx-hue setup`, press the **link button** on your Hue bridge within 30s, then run `dmx-hue setup` again.

After that, follow instructions to configure the default settings.
You can change these settings later at anytime by running `dmx-hue setup` again.

Once your Hue bridge is correctly setup, just run `dmx-hue` to start the Art-Net node, then go crazy with your
favorite DMX controller! :bulb:

If you're looking for a nice cross-platform & open-source DMX software controller, you should take a look at
[QLC+](http://www.qlcplus.org/).

#### Setting lights order

If you need to define your lights order manually for the DMX mapping, edit your configuration file with a text editor
(the file path is displayed at the end of `dmx-hue setup`) and add a new `lightsOrder` entry at the end like this:
```js
{
  ...
  "lightsOrder": [1, 2, 3]  // Hue lights ID
}
```

The Hue lights IDs are displayed when `dmx-hue` is started.

### Hue lights specific features

#### Colorloop

When colorloop option is enabled, your can enable Hue light automatic colorloop mode by setting the R/G/B channels of
a given light to the value `1`.

#### Transition time

Hue light can automatically perform transitions from one state to another in a specified time. This is especially
useful since there is a somewhat low update rate limitation on Hue lights (see next section for more details). If you
want to go creative and be able to adjust transition times dynamically, you can dedicate a DMX channel for it.

## Philips Hue response times vs DMX

With the Philips Hue API it’s only possible to update the state of bulbs 10 times per second, 1 bulb at a time.
Compared to a single DMX universe, which controls all 512 individual parameters up to 44 times per second, there’s
some major differences in how quickly we can update your lights using this software bridge.

This is especially noticeable when using automation sequences, if you try to update Hue lights quicker than 0.1s times
the number of lights in your projects, some updates may be skipped. This is unfortunately a limitation with the Hue
lights API and I cannot do anything about that.

### Saftey rate limiting

By default, a safety rate limit is enforced so there is always a 0,1s interval between Hue API calls. You can disable
this limit using the `--no-limit` option, but then you have to make sure to not make more than *number_of_lights / 10*
DMX value changes per second, or your Hue bridge might get overloaded.
