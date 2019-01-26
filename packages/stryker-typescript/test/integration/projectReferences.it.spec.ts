import * as path from 'path';
import * as fs from 'fs';
import { expect } from 'chai';
import { Config } from 'stryker-api/config';
import { File } from 'stryker-api/core';
import TypescriptConfigEditor from '../../src/TypescriptConfigEditor';
// import TypescriptTranspiler from '../../src/TypescriptTranspiler';
import { CONFIG_KEY } from '../../src/helpers/keys';

describe('stryker-typescript', () => {

  let config: Config;
  let inputFiles: File[];

  beforeEach(() => {
    const configEditor = new TypescriptConfigEditor();
    config = new Config();
    config.set({
      tsconfigFile: path.resolve(__dirname, '..', '..', 'testResources', 'projectReferences', 'tsconfig.json'),
    });
    configEditor.edit(config);
    inputFiles = config[CONFIG_KEY].fileNames.map((fileName: string) => new File(fileName, fs.readFileSync(fileName, 'utf8')));
  });

  it('should discover 2 ts files', () => {
    expect(inputFiles).lengthOf(2);
  });
});
