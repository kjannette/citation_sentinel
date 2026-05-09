'use strict';

import pino from 'pino';

const DEBUG = !!process.env.DEBUG;

const logger = pino({
  level: DEBUG ? 'debug' : 'info',
  transport: process.stdout.isTTY ? { target: 'pino-pretty' } : undefined,
});

export default logger;
