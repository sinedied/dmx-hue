#!/usr/bin/env node
import process from 'node:process';
import { DmxHue } from '../index.js';

const cli = new DmxHue(process.argv.slice(2));
cli.run();
