/**
 * Custom Webpack config for NestJS.
 * Prisma 7: use generated client (custom output) and fix runtime/library resolution.
 */
const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = function (options, webpack) {
  return {
    ...options,
    resolve: {
      ...options.resolve,
      alias: {
        ...(options.resolve && options.resolve.alias),
        // Use our generated Prisma client so adapter and custom output work at runtime.
        '@prisma/client': path.resolve(__dirname, 'generated/prisma/client.ts'),
        // Prisma 7 removed runtime/library; point it to runtime/client.
        '@prisma/client/runtime/library': path.resolve(
          __dirname,
          'node_modules/@prisma/client/runtime/client.js'
        ),
      },
    },
    // Bundle @prisma/client from generated folder; leave rest of node_modules external.
    externals: [
      nodeExternals({
        allowlist: ['@prisma/client'],
      }),
    ],
  };
};
