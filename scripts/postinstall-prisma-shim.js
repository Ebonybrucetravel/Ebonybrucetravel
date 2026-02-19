/**
 * Prisma 7: runtime/library.js was removed; some code still requires it.
 * This shim creates node_modules/@prisma/client/runtime/library.js that
 * re-exports from runtime/client.js so those requires succeed.
 */
const fs = require('fs');
const path = require('path');

const targetDir = path.join(
  __dirname,
  '..',
  'node_modules',
  '@prisma',
  'client',
  'runtime'
);
const shimPath = path.join(targetDir, 'library.js');
const content = `"use strict";
// Prisma 7 shim: runtime/library was removed; re-export runtime/client.
module.exports = require('./client.js');
`;

if (!fs.existsSync(path.join(targetDir, 'client.js'))) {
  console.warn(
    'postinstall-prisma-shim: @prisma/client/runtime/client.js not found, skipping shim.'
  );
  process.exit(0);
}

try {
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(shimPath, content, 'utf8');
  console.log('postinstall-prisma-shim: created runtime/library.js shim.');
} catch (e) {
  console.warn('postinstall-prisma-shim: could not create shim:', e.message);
}
