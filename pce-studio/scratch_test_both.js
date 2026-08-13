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

async function testProject(projPath, projName) {
  const outputBuildDir = path.join(projPath, 'build');
  console.log(`Building ${projName}...`);
  try {
    const res = await buildProject(projPath, {
      outputRoot: outputBuildDir,
      romFilename: `${projName}.pce`
    });
    console.log(`Build ${projName} SUCCESS:`, res);
  } catch (err) {
    console.error(`Build ${projName} FAILED:`, err);
  }
}

async function main() {
  await testProject('C:/Users/alx59/Documents/PCEtest1', 'PCEtest1');
  await testProject('C:/Users/alx59/Documents/testPCEAll', 'testPCEAll');
}

main();
