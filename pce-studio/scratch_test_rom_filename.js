const tsConfig = require('./tsconfig.json');
const tsConfigPaths = require('tsconfig-paths');
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
    target: 'es2020',
    baseUrl: './src'
  }
});

tsConfigPaths.register({
  baseUrl: './src',
  paths: {
    ...tsConfig.compilerOptions.paths,
    "consts": ["consts.ts"],
    "shared/*": ["shared/*"],
    "lib/*": ["lib/*"]
  }
});

const { getROMFilename } = require('./src/shared/lib/helpers/filePaths');

console.log('testPCEAll with empty override:', getROMFilename('', 'testPCEAll'));
console.log('testPCEAll with override:', getROMFilename('testPCEAll', 'testPCEAll'));
console.log('PCEtest1 with empty override:', getROMFilename('', 'PCEtest1'));
