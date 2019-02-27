import { Logger } from '@stryker-mutator/api/logging';
import fileUrl = require('file-url');
import * as path from 'path';
import { Reporter, MutantResult, SourceFile, ScoreResult } from '@stryker-mutator/api/report';
import * as util from './util';
import * as templates from './templates';
import Breadcrumb from './Breadcrumb';
import { StrykerOptions } from '@stryker-mutator/api/core';
import { tokens, commonTokens } from '@stryker-mutator/api/plugin';

const DEFAULT_BASE_FOLDER = path.normalize('reports/mutation/html');
const MUTATION_RESULT_FILE_NAME = 'mutation-report.json';
const MUTATION_TEST_ELEMENTS_FILE_NAME = 'mutation-test-elements.js';
export const RESOURCES_DIR_NAME = 'strykerResources';

export default class HtmlReporter implements Reporter {
  private _baseDir!: string;
  private mainPromise!: Promise<void>;
  private mutantResults!: MutantResult[];
  private files!: SourceFile[];
  private scoreResult!: ScoreResult;

  constructor(private readonly options: StrykerOptions, private readonly log: Logger) {
  }

  public static readonly inject = tokens(commonTokens.options, commonTokens.logger);

  public onAllSourceFilesRead(files: SourceFile[]) {
    this.files = files;
  }

  public onAllMutantsTested(results: MutantResult[]) {
    this.mutantResults = results;
  }

  public onScoreCalculated(score: ScoreResult) {
    this.scoreResult = score;
    this.mainPromise = this.generateReport();
  }

  public wrapUp() {
    return this.mainPromise;
  }

  private async generateReport(): Promise<void> {
    await this.cleanBaseFolder();
    await this.writeReportJson();
    await this.writeCommonResources();
    const location = await this.writeReportDirectory();
    this.log.info(`Your report can be found at: ${fileUrl(location)}`);
  }

  private async writeReportJson() {
    const base = path.join(this.baseDir, 'new');
    const indexFileName = path.join(base, 'index.html');
    const mutationTestElements = path.join(base, MUTATION_TEST_ELEMENTS_FILE_NAME);
    const mutationResultFileName = path.join(base, MUTATION_RESULT_FILE_NAME);
    await util.mkdir(base);
    const report = util.toReportSchema(this.mutantResults, this.files, this.options.thresholds);
    await Promise.all([
      util.writeFile(mutationResultFileName, JSON.stringify(report, null, 2)),
      util.copyFile(require.resolve('mutation-testing-elements'), mutationTestElements),
      util.writeFile(indexFileName, templates.mutationTestReport(MUTATION_RESULT_FILE_NAME, MUTATION_TEST_ELEMENTS_FILE_NAME))
    ]);
    this.log.info(`Your **NEW** report can be found at: ${fileUrl(indexFileName)}`);
  }

  private writeCommonResources() {
    const resourcesDir = path.join(__dirname, '..', 'resources');
    return util.copyFolder(resourcesDir, this.resourcesDir);
  }

  private writeReportDirectory(scoreResult = this.scoreResult, currentDirectory = this.baseDir, breadcrumb = Breadcrumb.start)
    : Promise<string> {
    const fileContent = templates.directory(scoreResult, breadcrumb, this.options.thresholds);
    const location = path.join(currentDirectory, 'index.html');
    return util.mkdir(currentDirectory)
      .then(_ => util.writeFile(location, fileContent))
      .then(_ => this.writeChildren(scoreResult, currentDirectory, breadcrumb))
      .then(_ => location);
  }

  private writeChildren(scoreResult: ScoreResult, currentDirectory: string, breadcrumb: Breadcrumb) {
    return Promise.all(scoreResult.childResults.map(child => {
      if (child.representsFile) {
        return this.writeReportFile(child, currentDirectory, breadcrumb.add(child.name, util.countPathSep(child.name)));
      } else {
        return this.writeReportDirectory(child, path.join(currentDirectory, child.name), breadcrumb.add(child.name, util.countPathSep(child.name) + 1))
          .then(_ => void 0);
      }
    }));
  }

  private writeReportFile(scoreResult: ScoreResult, baseDir: string, breadcrumb: Breadcrumb) {
    if (scoreResult.representsFile) {
      const fileContent = templates.sourceFile(scoreResult, this.findFile(scoreResult.path), this.findMutants(scoreResult.path), breadcrumb, this.options.thresholds);
      return util.writeFile(path.join(baseDir, `${scoreResult.name}.html`), fileContent);
    } else {
      return Promise.resolve(); // not a report file
    }
  }

  private findFile(filePath: string) {
    return this.files.find(file => file.path === filePath);
  }

  private findMutants(filePath: string) {
    return this.mutantResults.filter(mutant => mutant.sourceFilePath === filePath);
  }

  private get resourcesDir() {
    return path.join(this.baseDir, RESOURCES_DIR_NAME);
  }

  private get baseDir(): string {
    if (!this._baseDir) {
      if (this.options.htmlReporter && this.options.htmlReporter.baseDir) {
        this._baseDir = this.options.htmlReporter.baseDir;
        this.log.debug(`Using configured output folder ${this._baseDir}`);
      } else {
        this.log.debug(`No base folder configuration found (using configuration: htmlReporter: { baseDir: 'output/folder' }), using default ${DEFAULT_BASE_FOLDER}`);
        this._baseDir = DEFAULT_BASE_FOLDER;
      }
    }
    return this._baseDir;
  }

  private cleanBaseFolder(): Promise<void> {
    return util.deleteDir(this.baseDir).then(() => util.mkdir(this.baseDir));
  }

}
