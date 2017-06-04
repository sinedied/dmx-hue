# :bulb: dmx-hue

[![NPM version](https://img.shields.io/npm/v/dmx-hue.svg)](https://www.npmjs.com/package/dmx-hue)
[![Build status](https://img.shields.io/travis/sindied/dmx-hue/master.svg)](https://travis-ci.org/sinedied/dmx-hue)
![Node version](https://img.shields.io/badge/node-%3E%3D6.0.0-brightgreen.svg)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> Art-Net node to control Philips Hue lights with DMX

## Installation

```bash
npm install -g dmx-hue
```

## Usage

```
Usage: dmx-hue [setup] [options]

Create an ArtNet DMX<>Hue bridge.

Options:
  -h, --host       Host address to listen on               [default: '0.0.0.0']
  -a, --address    Set DMX address (range 0-510)           [default: 0]
  -c, --colorloop  Enable colorloop feature                [default: false]
                   When enabled, setting all RGB channels of a light to 1 will
                   enable colorloop mode.
  -t, --transition Set transition time in ms               [default: 100]
                   Can also be set to 'channel' to enable a dedicated DMX
                   channel on which 1 step equals 100ms.

Commands:
  setup            Configure hue bridge and DMX options
    -l, --list     List bridges on the network
    -i, --ip       Set bridge IP (use first bridge if not specified)
    --force        Force bridge setup if already configured
```

## Philips Hue response times vs DMX

With the Philips Hue API it’s only possible to update the state of bulbs 10 times per second, 1 bulb at a time.
Compared to a single DMX universe, which controls all 512 individual parameters up to 44 times per second, there’s
some major differences in how quickly we can update your lights using this software bridge.

This is especially noticeable when using automation sequences, if you try to update Hue lights quicker than 0.1s times
the number of lights in your projects, some updates may be skipped. This is unfortunately a limitation with the Hue
lights API and I cannot do anything about that.
