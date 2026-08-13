import path from 'path';
import { buildProject } from './src/lib/compiler/buildProject.ts';

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
