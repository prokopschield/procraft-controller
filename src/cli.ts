#!/usr/bin/env node

// Configure dotenv before doing anything!
import dotenv from 'dotenv';
dotenv.config();

import { config } from '.';
config.save();

process.on('uncaughtException', () => {});
