import { fsAsPromised } from '@stryker-mutator/util';
import * as path from 'path';
import * as mkdirp from 'mkdirp';
import * as rimraf from 'rimraf';
import { SourceFile, MutantResult, MutantStatus } from '@stryker-mutator/api/report';
import { MutationScoreThresholds, Location, Position } from '@stryker-mutator/api/core';
import * as schema from 'mutation-testing-elements/api';

export function toReportSchema(mutantResults: MutantResult[], files: SourceFile[], thresholds: MutationScoreThresholds): schema.MutationTestResult {
  return {
    files: toFileDictionary(files, mutantResults),
    mutationScore: 0,
    schemaVersion: '1',
    thresholds,
  };
}

function toFileDictionary(files: SourceFile[], mutantResults: MutantResult[]): schema.FileResultDictionary {
  const fileDictionary: schema.FileResultDictionary = {};
  files.filter(file => mutantResults.some(mutant => mutant.sourceFilePath === file.path)).forEach(file => fileDictionary[file.path] = {
    language: determineLanguage(file.path),
    mutants: mutantResults.filter(mutantResult => mutantResult.sourceFilePath === file.path).map(toMutantSchema),
    source: file.content
  });
  return fileDictionary;
}

function determineLanguage(fileName: string) {
  const ext = path.extname(fileName);
  return ['.ts', '.tsx'].indexOf(ext) >= 0 ? 'typescript' : 'javascript';
}

function toMutantSchema(mutantResult: MutantResult, index: number): schema.MutantResult {
  return {
    id: index.toString(),
    location: toLocationSchema(mutantResult.location),
    mutatorName: mutantResult.mutatorName,
    replacement: mutantResult.replacement,
    status: toStatusSchema(mutantResult.status)
  };
}

function toLocationSchema(loc: Location): schema.Location {
  return {
    end: toPositionSchema(loc.end),
    start: toPositionSchema(loc.start)
  };

  function toPositionSchema(pos: Position): schema.Position {
    return {
      column: pos.column + 1,
      line: pos.line + 1
    };
  }
}

function toStatusSchema(status: MutantStatus): schema.MutantStatus {
  switch (status) {
    case MutantStatus.Killed: return schema.MutantStatus.Killed;
    case MutantStatus.NoCoverage: return schema.MutantStatus.NoCoverage;
    case MutantStatus.Survived: return schema.MutantStatus.Survived;
    case MutantStatus.RuntimeError: return schema.MutantStatus.RuntimeError;
    case MutantStatus.TimedOut: return schema.MutantStatus.Timeout;
    case MutantStatus.TranspileError: return schema.MutantStatus.CompileError;
  }
}

async function copyFolderOrFile(fromPath: string, toPath: string): Promise<void> {
  const stats = await fsAsPromised.stat(fromPath);
  if (stats.isDirectory()) {
    return copyFolder(fromPath, toPath);
  }
  else {
    return copyFile(fromPath, toPath);
  }
}

export function copyFolder(fromPath: string, to: string): Promise<void> {
  return mkdir(to)
    .then(() => fsAsPromised.readdir(fromPath))
    .then(files => Promise.all(files.map(file => copyFolderOrFile(path.join(fromPath, file), path.join(to, file)))))
    .then(_ => void 0);
}

export function copyFile(fromFilename: string, toFilename: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const readStream = fsAsPromised.createReadStream(fromFilename);
    const writeStream = fsAsPromised.createWriteStream(toFilename);
    readStream.on('error', reject);
    writeStream.on('error', reject);
    readStream.pipe(writeStream);
    readStream.on('end', () => resolve());
  });
}

export function deleteDir(dirToDelete: string): Promise<void> {
  return new Promise((res, rej) => {
    rimraf(dirToDelete, err => {
      if (err) {
        rej(err);
      } else {
        res();
      }
    });
  });
}

export function mkdir(folderName: string): Promise<void> {
  return new Promise<void>((res, rej) => {
    mkdirp(folderName, err => {
      if (err) {
        rej(err);
      } else {
        res();
      }
    });
  });
}

export function writeFile(fileName: string, content: string) {
  return mkdir(path.dirname(fileName))
    .then(_ => fsAsPromised.writeFile(fileName, content, 'utf8'));
}

export function countPathSep(fileName: string) {
  let count = 0;
  for (const ch of fileName) {
    if (ch === path.sep) {
      count++;
    }
  }
  return count;
}
