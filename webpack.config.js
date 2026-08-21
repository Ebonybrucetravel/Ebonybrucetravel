const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = function (options, webpack) {
  return {
    ...options,
    resolve: {
      ...options.resolve,
      alias: {
        ...(options.resolve && options.resolve.alias),
        
        '@prisma/client': path.resolve(__dirname, 'generated/prisma/client.ts'),
  
        '@prisma/client/runtime/library': path.resolve(
          __dirname,
          'node_modules/@prisma/client/runtime/client.js'
        ),
      },
    },
    
    externals: [
      nodeExternals({
        allowlist: ['@prisma/client'],
      }),
    ],
  };
};