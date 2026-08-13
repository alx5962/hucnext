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

const path = require('path');
const { buildProject } = require('./src/lib/compiler/buildProject');

async function main() {
  const projectDirPath = 'C:/Users/alx59/Documents/testPCEAll';
  const outputBuildDir = path.join(projectDirPath, 'build');

  console.log('Testing buildProject on testPCEAll...');
  try {
    const res = await buildProject(projectDirPath, {
      outputRoot: outputBuildDir,
      romFilename: 'testPCEAll.pce'
    });
    console.log('buildProject completed successfully:', res);
  } catch (err) {
    console.error('buildProject failed:', err);
  }
}

main();
