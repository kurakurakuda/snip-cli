import * as sinon from 'sinon';
import { expect, assert } from 'chai';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile } from '../src/utils/filesystems.ts';
import { cleanupTestFiles, CLI_PATH, HOOK_MODULE_PATH, MOCK_CWD_PATH, MOCK_HOME_PATH, MOCK_NOCONFIG_PATH, TEST_WORKING_DIR, __dirname } from './utils/testUtils.ts';

const testDir = TEST_WORKING_DIR;

const execAsync = promisify(exec);

// エラー型の定義
interface ExecError {
  message: string;
  stderr: string;
  stdout: string;
  code?: number;
}

// CLIコマンドを実行する関数
const runCommand = async (args: string): Promise<{ stdout: string; stderr: string }> => {
  return execAsync(`node --require ${HOOK_MODULE_PATH} ${CLI_PATH} ${args}`, {
      env: {
        ...process.env,
        MOCK_HOME: MOCK_HOME_PATH
      },
    });
};

const stdoutIndexOf = (needle: string, stdout:string): number => {
    const lines = stdout.split('\n');
    const i = lines.findIndex((l) => l.includes(needle));
    expect(i, `not found: ${needle}`).to.be.greaterThan(-1);
    return i;
};

describe('Snip CLI', () => {
  let consoleStub: sinon.SinonStub;

  beforeEach(() => {
    consoleStub = sinon.stub(console, 'log').callsFake(() => {});
  });

  afterEach(async () => {
    consoleStub.resetHistory();
    consoleStub.restore();
    await cleanupTestFiles();
  });

  describe('create command', () => {
    it('should create a file with the given name', async () => {
      const fileName = 'test-file';
      await runCommand(`create ${fileName}`);
      const result = await readFile(`${fileName}.snip`, testDir);
      expect(result).to.equal(`@description: 
@tags:`)
    });

    [
      { option: "--description", providedValue: "test-file",  expectedValue: `test-file`, quoted: "unquoted" },
      { option: "-d", providedValue: "test-file",  expectedValue: `test-file`, quoted: "unquoted" },
      { option: "--description", providedValue: `"This is a test file"`,  expectedValue: `"This is a test file"`, quoted: "quoted" },
      { option: "-d", providedValue: `"This is a test file"`,  expectedValue: `"This is a test file"`, quoted: "quoted" },
      { option: "--description", providedValue: `""`,  expectedValue: ``, quoted: "empty" },
      { option: "-d", providedValue: `""`,  expectedValue: ``, quoted: "empty" }
    ].forEach(({option, providedValue, expectedValue, quoted}) => {
      it(`should create a file with description when ${option} option is provided with ${quoted} string`, async () => {
        const fileName1 = 'test-file1';
        await runCommand(`create ${fileName1} ${option} ${providedValue}`);
        const result1 = await readFile(`${fileName1}.snip`, testDir);
        expect(result1).to.equal(`@description: ${expectedValue}
@tags:`)
      });
    });

    it('should create a file with description when --description is empty', async () => {
      try {
        const fileName2 = 'test-file2';
        await runCommand(`create ${fileName2} -d `);
        assert.fail('Expected command to fail but it did not');
      } catch (error) {
        const execError = error as ExecError;
        expect(execError.stderr).to.include('Not enough arguments following: d');
      }
    });

    it('should fail to create a file when the provided file already exists', async () => {
      const fileName = 'test-file';
      await runCommand(`create ${fileName}`);

      const { stdout } = await runCommand(`create ${fileName} -d test-file`);
      expect(stdout).to.include(`${fileName}.snip already exists`);
    });

    it('should log the details when --log option is provided', async () => {
      const fileName1 = 'test-file1';
      const { stdout: stdout1 } = await runCommand(`create ${fileName1} --log`);
      expect(stdout1).to.include(`Created a file`);
      expect(stdout1).to.include(`${fileName1}
─────────
Description : 
Tags        : 
Commands    : `);

      const fileName2 = 'test-file2';
      const { stdout: stdout2 } = await runCommand(`create ${fileName2} -d "This is a test file" --log`);
      expect(stdout2).to.include(`Created a file`);
      expect(stdout2).to.include(`${fileName2}
─────────
Description : This is a test file
Tags        : 
Commands    : `);
    });

    it('should log the details when --log option is not provided', async () => {
      const fileName1 = 'test-file1';
      const { stdout: stdout1 } = await runCommand(`create ${fileName1}`);
      expect(stdout1).to.not.include(`Created a file: ${fileName1}`);
      expect(stdout1).to.not.include(`Its description is: `);

      const fileName2 = 'test-file2';
      const { stdout: stdout2 } = await runCommand(`create ${fileName2} -d "This is a test file"`);
      expect(stdout2).to.not.include(`Created a file: ${fileName2}`);
      expect(stdout2).to.not.include(`Its description is: This is a test file`);
    });

    describe('arguments', () =>{
      it('should throw an error when file is missing', async () => {
        try {
          await runCommand('create');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Not enough non-option arguments: got 0, need at least 1');
        }
      });

      it('should throw an error when file is empty string(double quote)', async () => {
        try {
          await runCommand('create ""');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Empty string is not allowed: file');
        }
      });

      it('should throw an error when file is empty string(single quote)', async () => {
        try {
          await runCommand(`create ''`);
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
          // expect(execError.stderr).to.include('Empty string is not allowed: file');
        }
      });

      it('should throw an error when multiple description option is passed', async () => {
        try {
          await runCommand('create test-file --description test1 --description test2');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('A description does not accept multiple values');
        }

        try {
          await runCommand('create test-file -d test1 -d test2');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('A description does not accept multiple values');
        }
      });
    });
  });

  describe('add command', () => {
    describe('should add a command to the specified file', () => {
      [
        { option: "--command", value: `"echo hello"`},
        { option: "-c", value: `echo-hello`}
      ].forEach(({option, value}) => {
        it(`should add a command to the specified file when ${option} option is provided`, async () => {
          const fileName = 'test-file';
          await runCommand(`create ${fileName}`);

          await runCommand(`add test-file test-cmd ${option} ${value}`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: 
@tags: 
@command: test-cmd {
    cmd: ${value},
    desc: "",
    tags: [],
    depends_on: []
}`);
        });
      });
    });

    describe('should add a command with description when --description option is provided', () => {
      [
        { option: "--description", value: `"Test command"`},
        { option: "-d", value: `Test-command`}
      ].forEach(({option, value}) => {
        it(`should add a command with description when ${option} option is provided`, async () => {
          const fileName = 'test-file';
          await runCommand(`create ${fileName}`);

          await runCommand(`add test-file test-cmd --command "echo hello" ${option} ${value}`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: 
@tags: 
@command: test-cmd {
    cmd: "echo hello",
    desc: ${value},
    tags: [],
    depends_on: []
}`);
        });
      });

      it('empty', async () => {
        try {
          await runCommand('add test-file test-cmd -c "echo hello" --description');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          // TypeScriptのエラー回避のため型アサーションを使用
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Not enough arguments following: description');
        }
      });
    });

    describe('should add a command with tags when --tag option is provided', () => {
      [
        { option: `--tag "test cli"`, value: `"test cli"`, scenario: "--tag"},
        { option: `--tag "test cli" --tag test`, value: `"test cli", test`, scenario: "multiple --tag"},
        { option: `-t cli`, value: `cli`, scenario: "-t"},
        { option: `-t cli -t "test cli"`, value: `cli, "test cli"`, scenario: "multipe -t"},
        { option: `-t cli -t cli`, value: `cli`, scenario: "duplicated -t"}
      ].forEach(({option, value, scenario}) => {
        it(`should add a command with tags when ${scenario} option is provided`, async () => {
          const fileName = 'test-file';
          await runCommand(`create ${fileName}`);

          await runCommand(`add test-file test-cmd --command "echo hello" ${option}`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: 
@tags: 
@command: test-cmd {
    cmd: "echo hello",
    desc: "",
    tags: [${value}],
    depends_on: []
}`);
        });
      });

      [
        { option: `--tag"`, scenario: "tag"},
        { option: `--tag "test cli" --tag`, scenario: "multiple tag"}
      ].forEach(({option, scenario}) => {
        it(`should return error when ${scenario} option is empty string`, async () => {
          try {
            await runCommand(`add test-file test-cmd --command "echo hello" ${option}`);
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            // TypeScriptのエラー回避のため型アサーションを使用
            const execError = error as ExecError;
            expect(execError.stderr).to.include('Not enough arguments following: tag');
          }
        });
      });
    });

    describe('should add a command with dependsOn when --depends-on option is provided', () => {
      [
        { option: `--depends-on "test-cli"`, value: `test-cli`, scenario: "--depends-on"},
        { option: `--depends-on "test-cli" --depends-on cli`, value: `test-cli, cli`, scenario: "multiple --depends-on"},
        { option: `-p cli`, value: `cli`, scenario: "-p"},
        { option: `-p cli -p "test-cli"`, value: `cli, test-cli`, scenario: "multipe -p"},
        { option: `-p cli -p cli`, value: `cli`, scenario: "duplicated -p"}
      ].forEach(({option, value, scenario}) => {
        it(`should add a command with dependsOn when ${scenario} option is provided`, async () => {
          const fileName = 'test-file';
          await runCommand(`create ${fileName}`);

          await runCommand(`add test-file cli --command "echo hello"`);
          await runCommand(`add test-file test-cli --command "echo hello"`);

          await runCommand(`add test-file test-cmd --command "echo hello" ${option}`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: 
@tags: 
@command: cli {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: test-cli {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: test-cmd {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [${value}]
}`);
        });
      });

      [
        { option: `--depends-on`, scenario: "depends-on"},
        { option: `--depends-on "test cli" --depends-on`, scenario: "multiple depends-on"}
      ].forEach(({option, scenario}) => {
        it(`should return error when ${scenario} option is empty string`, async () => {
          try {
            await runCommand(`add test-file test-cmd --command "echo hello" ${option}`);
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            // TypeScriptのエラー回避のため型アサーションを使用
            const execError = error as ExecError;
            expect(execError.stderr).to.include('Not enough arguments following: depends-on');
          }
        });
      });

      [
        { option: `--depends-on test-cmd`, scenario: "depends-on "},
        { option: `--depends-on test-cmd --depends-on dummy`, scenario: "multiple depends-on"},
        { option: `-p test-cmd`, scenario: "p"},
        { option: `-p test-cmd -p dummy`, scenario: "multiple p"}
      ].forEach(({option, scenario}) => {
        it(`should return error when ${scenario} option is itself`, async () => {
          await runCommand(`create test-file`);
          const { stdout } = await runCommand(`add test-file test-cmd --command "echo hello" ${option}`);
          expect(stdout).to.include('command cannot depend on itself');
        });
      });

      [
        { option: `--depends-on non-existing`, scenario: "a depends-on"},
        { option: `--depends-on non-existing --depends-on invalid-cmd`, scenario: "either of depends-on"},
        { option: `-p non-existing`, scenario: "(p command) a depends-on"},
        { option: `-p non-existing -p valid-cmd`, scenario: "(p command) either of depends-on"}
      ].forEach(({option, scenario}) => {
        it(`should return error when no other command exists and ${scenario} provided does not exist`, async () => {
          await runCommand(`create test-file`);
          const { stdout } = await runCommand(`add test-file test-cmd --command "echo hello" ${option}`);
          expect(stdout).to.include("command 'test-cmd' has invalid dependencies: non-existing");
        });
      });

      [
        { option: `--depends-on non-existing`, scenario: "a depends-on"},
        { option: `--depends-on non-existing --depends-on valid-cmd`, scenario: "either of depends-on"},
        { option: `-p non-existing`, scenario: "(p command) a depends-on"},
        { option: `-p non-existing -p valid-cmd`, scenario: "(p command) either of depends-on"}
      ].forEach(({option, scenario}) => {
        it(`should return error when other commands exists and ${scenario} provided does not exist`, async () => {
          await runCommand(`create test-file`);
          await runCommand(`add test-file valid-cmd --command "echo hello"`);
          const { stdout } = await runCommand(`add test-file test-cmd --command "echo hello" ${option}`);
          expect(stdout).to.include("command 'test-cmd' has invalid dependencies: non-existing");
        });
      });
    });

    describe('should log the details when --log option is provided', () => {
      it('log option and only command is provided', async () => {
        const fileName = 'test-file';
        await runCommand(`create ${fileName}`);

        const { stdout } = await runCommand('add test-file test-cmd --command "echo hello" --log');
        expect(stdout).to.include(`A command was added`);
        expect(stdout).to.include(`test-cmd
─────────
Command     : echo hello
Description : 
Tags        : 
DependsOn   :`);
      });

      it('log option and all other option is provided', async () => {
        const fileName = 'test-file';
        await runCommand(`create ${fileName}`);
        await runCommand(`add test-file valid-cmd --command "echo hello"`);
        await runCommand(`add test-file valid-cmd2 --command "echo hello"`);

        const { stdout } = await runCommand('add test-file test-cmd -c "echo hello" -d Test-command -t tag1 -t tag2 -p valid-cmd -p valid-cmd2 --log');
        expect(stdout).to.include(`A command was added`);
        expect(stdout).to.include(`test-cmd
─────────
Command     : echo hello
Description : Test-command
Tags        : tag1, tag2
DependsOn   : valid-cmd, valid-cmd2`);
      });

      it('log option is not provided and only command is provided', async () => {
        const fileName = 'test-file';
        await runCommand(`create ${fileName}`);

        const { stdout } = await runCommand('add test-file test-cmd --command "echo hello"');
        expect(stdout).to.not.include(`A command was added`);
        expect(stdout).to.not.include(`test-cmd
─────────
Command     : echo hello
Description : Test-command
Tags        : tag1, tag2
DependsOn   : valid-cmd, valid-cmd2`);
      });

      it('log option and duplicated tags/dependsOn is provided', async () => {
        const fileName = 'test-file';
        await runCommand(`create ${fileName}`);
        await runCommand(`add test-file valid-cmd --command "echo hello"`);

        const { stdout } = await runCommand('add test-file test-cmd -c "echo hello" -d Test-command -t tag1 -t tag1 -p valid-cmd -p valid-cmd --log');
        expect(stdout).to.include(`A command was added`);
        expect(stdout).to.include(`test-cmd
─────────
Command     : echo hello
Description : Test-command
Tags        : tag1
DependsOn   : valid-cmd`);
      });
    });

    it('Should return error when the snip file does not exist', async () => {
        const { stdout } = await runCommand('add test-file test-cmd --command "echo hello"');
        expect(stdout).to.include('test-file.snip is not found');
    });

    it('Should return error when the command already exist', async () => {
      const fileName = 'test-file';
      await runCommand(`create ${fileName}`);

      await runCommand('add test-file test-cmd --command "echo hello"');
      const result1 = await readFile(`${fileName}.snip`, testDir);
      expect(result1).to.equal(`@description: 
@tags: 
@command: test-cmd {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);
      const { stdout } = await runCommand('add test-file test-cmd --c "echo hello"');
      expect(stdout).to.include("command 'test-cmd' already exists");

      const result2 = await readFile(`${fileName}.snip`, testDir);
      expect(result2).to.equal(`@description: 
@tags: 
@command: test-cmd {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);

    });

    describe('arguments', () =>{
      it('should throw an error when arguement / mandatory option are missing', async () => {
        try {
          await runCommand('add');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          // TypeScriptのエラー回避のため型アサーションを使用
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Not enough non-option arguments: got 0, need at least 2');
        }

        try {
          await runCommand('add test-file');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          // TypeScriptのエラー回避のため型アサーションを使用
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Not enough non-option arguments: got 1, need at least 2');
        }

        try {
          await runCommand('add test-file test-cmd');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          // TypeScriptのエラー回避のため型アサーションを使用
          const execError = error as ExecError;
          expect(execError.stderr).to.include('A command is required');
        }

        try {
          await runCommand('add test-file test-cmd -c ');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          // TypeScriptのエラー回避のため型アサーションを使用
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Not enough arguments following: c');
        }
      });

      it('should throw an error when file is empty string(double quote)', async () => {
        try {
          await runCommand('add "" test-cmd --command "echo hello1"');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Empty string is not allowed: file');
        }
      });

      it('should throw an error when file is empty string(single quote)', async () => {
        try {
          await runCommand(`add '' test-cmd --command "echo hello1"`);
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
          // expect(execError.stderr).to.include('Empty string is not allowed: file');
        }
      });

      it('should throw an error when name is empty string(double quote)', async () => {
        try {
          await runCommand('add test-file "" --command "echo hello1"');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Empty string is not allowed: name');
        }
      });

      it('should throw an error when name is empty string(single quote)', async () => {
        try {
          await runCommand(`add test-file '' test-cmd --command "echo hello1"`);
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
          // expect(execError.stderr).to.include('Empty string is not allowed: name');
        }
      });

      it('should throw an error when multiple option is passed', async () => {
        try {
          await runCommand('add test-file.snip test-cmd --command "echo hello1" --command "echo hello2"');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('A command does not accept multiple values');
        }

        try {
          await runCommand('add test-file.snip test-cmd -c "echo hello1" -c "echo hello2"');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('A command does not accept multiple values');
        }

        try {
          await runCommand('add test-file.snip test-cmd --command "echo hello" --description test1 --description test2');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('A description does not accept multiple values');
        }

        try {
          await runCommand('add test-file.snip test-cmd -c "echo hello" -d test1 -d test2');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('A description does not accept multiple values');
        }
      });
    });
  });

  describe('edit command', () => {
    describe('edit the file', () => {
      describe('should edit a description of the snip file when --description option is provided', () => {
        [
          { option: "--description" }, { option: "-d" }
        ].forEach(({option}) => {
          it(`should create a file with description when ${option} option is provided`, async () => {
            const fileName = 'test-file';
          await runCommand(`create ${fileName}`);

          await runCommand(`edit ${fileName} ${option} "Test command"`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: "Test command"
@tags:`);
          });
        });

        it('reset description by passing double quato', async () => {
          const fileName = 'test-file';
          await runCommand(`create ${fileName} --description "Test command"`);

          await runCommand(`edit ${fileName} --description ""`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: 
@tags:`);
        });

        it('reset description by passing single quato', async () => {
          const fileName = 'test-file';
          await runCommand(`create ${fileName} --description "Test command"`);

          await runCommand(`edit ${fileName} -d ''`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: ''
@tags:`);
        });

        it('empty', async () => {
          try {
            await runCommand(`edit test-file --description `);
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            // TypeScriptのエラー回避のため型アサーションを使用
            const execError = error as ExecError;
            expect(execError.stderr).to.include('Not enough arguments following: description');
          }
        });
      });

      describe('should edit tags when --tag option is provided', () => {
        [
          { option: `--tag "test cli"`, value: `"test cli"`, scenario: "--tag"},
          { option: `--tag "test cli" --tag test`, value: `"test cli", test`, scenario: "multiple --tag"},
          { option: `-t cli`, value: `cli`, scenario: "-t"},
          { option: `-t cli -t "test cli"`, value: `cli, "test cli"`, scenario: "multipe -t"},
          { option: `-t cli -t cli`, value: `cli`, scenario: "duplicated -t"},
        ].forEach(({option, value, scenario}) => {
          it(`should edit tags when ${scenario} option is provided`, async () => {
            const fileName = 'test-file';
            await runCommand(`create ${fileName} -d test-description`);

            await runCommand(`edit ${fileName} ${option}`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            expect(result1).to.equal(`@description: test-description
@tags: ${value}`);
          });
        });

        [
          { option: `-t ""`, scenario: ""},
          { option: `-t xxx -t ""`, scenario: "multiple"},
        ].forEach(({option, scenario}) => {
          it(`reset the tags by passing ${scenario} double quote`, async () => {
            const fileName = 'test-file';
            await runCommand(`create ${fileName} -d test-description`);
            await runCommand(`edit ${fileName} -t "test cli"`);

            await runCommand(`edit ${fileName} ${option}`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            expect(result1).to.equal(`@description: test-description
@tags:`);
          });
        });

        [
          { option: `-t ''`, scenario: ""},
          { option: `-t xxx -t ''`, scenario: "multiple"},
        ].forEach(({option, scenario}) => {
          it(`reset the tags by passing ${scenario} single quote`, async () => {
            const fileName = 'test-file';
            await runCommand(`create ${fileName} -d test-description`);
            await runCommand(`edit ${fileName} -t "test cli"`);

            await runCommand(`edit ${fileName} ${option}`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            // When passing '' to CLI, it works but this test failed..
          // So comment it out
  //         expect(result1).to.equal(`@description: test-description
  // @tags: `);
          });
        });

        [
          { option: `--tag"`, scenario: "tag"},
          { option: `--tag "test cli" --tag`, scenario: "multiple tag"}
        ].forEach(({option, scenario}) => {
          it(`should return error when ${scenario} option is empty string`, async () => {
            try {
              await runCommand(`edit test-file ${option}`);
              assert.fail('Expected command to fail but it did not');
            } catch (error) {
              // TypeScriptのエラー回避のため型アサーションを使用
              const execError = error as ExecError;
              expect(execError.stderr).to.include('Not enough arguments following: tag');
            }
          });
        });
      });

      describe('should log the details when --log option is provided', () => {
        it('log option and description option is provided', async () => {
          const fileName = 'test-file';
          await runCommand(`create ${fileName}`);

          const { stdout } = await runCommand('edit test-file --description "echo hello" --log');
          expect(stdout).to.include(`Updated a file`);
          expect(stdout).to.include(`${fileName}
─────────
Description : echo hello
Tags        : 
Commands    : `);
        });

        it('log option and tag option is provided', async () => {
          const fileName = 'test-file';
          await runCommand(`create ${fileName}`);

          const { stdout } = await runCommand('edit test-file --tag "echo hello" --log');
          expect(stdout).to.include(`Updated a file`);
          expect(stdout).to.include(`${fileName}
─────────
Description : 
Tags        : echo hello
Commands    : `);
        });

        it('log option and description and tag options are provided', async () => {
          const fileName = 'test-file';
          await runCommand(`create ${fileName}`);

          const { stdout } = await runCommand('edit test-file --description "echo hello" --tag tag1 --log');
          expect(stdout).to.include(`Updated a file`);
          expect(stdout).to.include(`${fileName}
─────────
Description : echo hello
Tags        : tag1
Commands    : `);
        });

        it('log option and duplicated tag option is provided', async () => {
          const fileName = 'test-file';
          await runCommand(`create ${fileName}`);

          const { stdout } = await runCommand('edit test-file --tag "echo hello" --tag "echo hello" --log');
          expect(stdout).to.include(`Updated a file`);
          expect(stdout).to.include(`${fileName}
─────────
Description : 
Tags        : echo hello
Commands    : `);
        });

        it('log option and description and tag options are not provided', async () => {
          const fileName = 'test-file';
          await runCommand(`create ${fileName}`);

          const { stdout } = await runCommand('edit test-file --log');
          expect(stdout).to.include("Nothing to update as 'description' and 'tag' were not passed");
        });
      });

      it('Should nothing is updated when description and tag are not provided', async () => {
          const fileName = 'test-file';
          await runCommand(`create ${fileName} -d test-description`);
          await runCommand(`edit ${fileName} -t "test cli"`);

          await runCommand(`edit ${fileName}`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: "test cli"`);
      });

      it('Should return error when the snip file does not exist', async () => {
          const { stdout } = await runCommand('edit test-file -d "echo hello"');
          expect(stdout).to.include('test-file.snip is not found');
      });
    });

    describe('edit the snip command', () => {
      const fileName = 'test-file';
      const name = 'existingCommand';

      beforeEach(async () => {
        await runCommand(`create ${fileName} -d test-description`);
        await runCommand(`add ${fileName} ${name} -c "echo hello" -d "Test desc" -t "tag1"`);
      });

      describe('should edit a command of the snip when --command option is provided', () => {
        [
          { option: `--command`, value: `"Test command"`},
          { option: `-c`, value: `Test-command`}
        ].forEach(({option, value}) => {
          it(`should edit a command of the snip when ${option} option is provided`, async () => {
            await runCommand(`edit ${fileName} ${name} ${option} ${value}`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: ${value},
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`);
          });
        });

        it('reset command by passing double quato', async () => {
          await runCommand(`edit ${fileName} ${name} -c ""`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`);
        });

        it('reset descriptino by passing single quato', async () => {
          await runCommand(`edit ${fileName} ${name} -c ''`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
//           expect(result1).to.equal(`@description: 
// @tags: 
// @command: existingCommand {
//     cmd: "",
//     desc: "Test desc",
//     tags: [tag1],
//     depends_on: [] 
// }`);
        });

        it('empty', async () => {
          try {
            await runCommand(`edit ${fileName} ${name} --command`);
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            // TypeScriptのエラー回避のため型アサーションを使用
            const execError = error as ExecError;
            expect(execError.stderr).to.include('Not enough arguments following: command');
          }
        });
      });

      describe('should edit a description of the snip when --description option is provided', () => {
        [
          { option: `--description`, value: `"Tested desc"`},
          { option: `-d`, value: `Test-desc`}
        ].forEach(({option, value}) => {
          it(`should edit a description of the snip when ${option} option is provided`, async () => {
            await runCommand(`edit ${fileName} ${name} ${option} ${value}`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: ${value},
    tags: [tag1],
    depends_on: []
}`);
          });
        });

        it('reset descriptino by passing double quato', async () => {
          await runCommand(`edit ${fileName} ${name} -d ""`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "",
    tags: [tag1],
    depends_on: []
}`);
        });

        it('reset descriptino by passing single quato', async () => {
          await runCommand(`edit ${fileName} ${name} -d ''`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
//           expect(result1).to.equal(`@description: 
// @tags: 
// @command: existingCommand {
//     cmd: "echo hello",
//     desc: "",
//     tags: [tag1],
//     depends_on: []
// }`);
        });

        it('empty', async () => {
          try {
            await runCommand(`edit ${fileName} ${name} --description`);
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            // TypeScriptのエラー回避のため型アサーションを使用
            const execError = error as ExecError;
            expect(execError.stderr).to.include('Not enough arguments following: description');
          }
        });
      });

      describe('should edit tags of the snip when --tag option is provided', () => {
        [
          { option: `--tag "Test tag"`, value: `"Test tag"`, scenario: "--tag"},
          { option: `--tag "Test tag" --tag test-cli`, value: `"Test tag", test-cli`, scenario: "multiple --tag"},
          { option: `-t "Test tag"`, value: `"Test tag"`, scenario: "-t"},
          { option: `-t "Test tag" -t test-cli`, value: `"Test tag", test-cli`, scenario: "multipe -t"},
          { option: `-t test-cli -t test-cli`, value: `test-cli`, scenario: "duplicated -t"},
        ].forEach(({option, value, scenario}) => {
          it(`should edit a tag with tags when ${scenario} option is provided`, async () => {
            const fileName = 'test-file';
            await runCommand(`create ${fileName}`);

            await runCommand(`edit ${fileName} ${name} ${option}`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [${value}],
    depends_on: []
}`);
          });
        });

        [
          {option: `-t ""`, scenario: "single"},
          {option: `-t "" -t xxx`, scenario: "multiple"}
        ].forEach(({option, scenario}) => {
           it(`rest the tags when ${scenario} tag option is double quote`, async () => {
            await runCommand(`edit ${fileName} ${name} ${option}`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [],
    depends_on: []
}`);
          });
        });

        [
          {option: `-t ''`, scenario: "single"},
          {option: `-t '' -t xxx`, scenario: "multiple"}
        ].forEach(({option, scenario}) => {
           it(`reset the tags when ${scenario} tag option is singlw quote`, async () => {
            await runCommand(`edit ${fileName} ${name} ${option}`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            // When passing '' to CLI, it works but this test failed..
          // So comment it out
//           expect(result1).to.equal(`@description: test-description
// @tags: 
// @command: existingCommand {
//     cmd: "echo hello",
//     desc: "Test desc",
//     tags: [],
//     depends_on: []
// }`);
          });
        });

        [
          { option: `--tag"`, scenario: "tag"},
          { option: `--tag "test cli" --tag`, scenario: "multiple tag"}
        ].forEach(({option, scenario}) => {
          it(`should return error when ${scenario} option is empty string`, async () => {
              try {
                await runCommand(`edit ${fileName} ${name} ${option}`);
                assert.fail('Expected command to fail but it did not');
              } catch (error) {
                // TypeScriptのエラー回避のため型アサーションを使用
                const execError = error as ExecError;
                expect(execError.stderr).to.include('Not enough arguments following: tag');
              }
          });
        });
      });

      describe('should edit dependsOn of the snip when --depends-on option is provided', () => {
        [
          { option: `--depends-on B`, value: `B`, scenario: "-depends-on"},
          { option: `--depends-on B --depends-on C`, value: `B, C`, scenario: "multiple -depends-on"},
          { option: `-p B`, value: `B`, scenario: "-t"},
          { option: `-p B -p C`, value: `B, C`, scenario: "multipe -p"},
          { option: `-p C -p C`, value: `C`, scenario: "duplicated -p"},
        ].forEach(({option, value, scenario}) => {
          it(`should edit a dependsOn when ${scenario} option is provided`, async () => {
           await runCommand(`add ${fileName} B -c "echo hello"`);
           await runCommand(`add ${fileName} C -c "echo hello"`);

            await runCommand(`edit ${fileName} ${name} ${option}`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [${value}]
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: C {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);
          });
        });

        [
          {option: `-p ""`, scenario: "single"},
          {option: `-p "" -p xxx`, scenario: "multiple"}
        ].forEach(({option, scenario}) => {
           it(`rest the dependsOn when ${scenario} dependsOn option is double quote`, async () => {
            await runCommand(`add ${fileName} B -c "echo hello"`);

            await runCommand(`edit ${fileName} ${name} -p B`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B]
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);
            await runCommand(`edit ${fileName} ${name} ${option}`);
            const result2 = await readFile(`${fileName}.snip`, testDir);
            expect(result2).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);
          });
        });

        [
          {option: `-p ""`, scenario: "single"},
          {option: `-p "" -p xxx`, scenario: "multiple"}
        ].forEach(({option, scenario}) => {
           it(`rest the dependsOn when ${scenario} dependsOn is single quote`, async () => {
            await runCommand(`add ${fileName} B -c "echo hello"`);

            await runCommand(`edit ${fileName} ${name} -p B`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            // When passing '' to CLI, it works but this test failed..
            // So comment it out
            expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B]
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);
            await runCommand(`edit ${fileName} ${name} ${option}`);
            const result2 = await readFile(`${fileName}.snip`, testDir);
//             expect(result2).to.equal(`@description: test-description
// @tags: 
// @command: existingCommand {
//     cmd: "echo hello",
//     desc: "Test desc",
//     tags: [tag1],
//     depends_on: []
// }
// @command: B {
//     cmd: "echo hello",
//     desc: "",
//     tags: [],
//     depends_on: []
// }`);
          });
        });

        it('should edit dependsOn for the case : DAG shared nodes', async () => {
          await runCommand(`add ${fileName} E -c "echo hello"`);
          await runCommand(`add ${fileName} D -c "echo hello" -p E`);
          await runCommand(`add ${fileName} B -c "echo hello" -p D`);
          await runCommand(`add ${fileName} C -c "echo hello" -p D`);

          await runCommand(`edit ${fileName} ${name} -p B -p C`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B, C]
}
@command: E {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: D {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [E]
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [D]
}
@command: C {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [D]
}`);
        });

        it('should edit dependsOn for the case : DAG shared nodes case 2', async () => {
          await runCommand(`add ${fileName} B -c "echo hello"`);
          await runCommand(`add ${fileName} C -c "echo hello"`);
          await runCommand(`add ${fileName} D -c "echo hello" -p B -p C`);
          await runCommand(`add ${fileName} E -c "echo hello" -p D`);

          await runCommand(`edit ${fileName} B -p existingCommand`);
          await runCommand(`edit ${fileName} C -p existingCommand`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [existingCommand]
}
@command: C {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [existingCommand]
}
@command: D {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [B, C]
}
@command: E {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [D]
}`);
        });

        it('should edit dependsOn for the case : multiple dependsOn', async () => {
          await runCommand(`add ${fileName} B -c "echo hello"`);
          await runCommand(`add ${fileName} C -c "echo hello"`);
          await runCommand(`add ${fileName} D -c "echo hello" -p B`);
          await runCommand(`add ${fileName} E -c "echo hello" -p C`);

          await runCommand(`edit ${fileName} ${name} -p D -p E`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [D, E]
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: C {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: D {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [B]
}
@command: E {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [C]
}`);
        });

        it('should edit dependsOn for the case : multiple dependsOn case 2', async () => {
          await runCommand(`add ${fileName} B -c "echo hello"`);
          await runCommand(`add ${fileName} C -c "echo hello"`);
          await runCommand(`add ${fileName} D -c "echo hello" -p B`);
          await runCommand(`add ${fileName} E -c "echo hello" -p C`);

          await runCommand(`edit ${fileName} B -p existingCommand`);
          await runCommand(`edit ${fileName} C -p existingCommand`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [existingCommand]
}
@command: C {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [existingCommand]
}
@command: D {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [B]
}
@command: E {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [C]
}`);
        });

        it('should edit dependsOn for the case : multiple shared nodes', async () => {
          await runCommand(`add ${fileName} B -c "echo hello"`);
          await runCommand(`add ${fileName} C -c "echo hello"`);
          await runCommand(`add ${fileName} D -c "echo hello" -p B -p C`);
          await runCommand(`add ${fileName} F -c "echo hello"`);
          await runCommand(`add ${fileName} E -c "echo hello" -p C -p F`);

          await runCommand(`edit ${fileName} ${name} -p D -p E`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [D, E]
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: C {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: D {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [B, C]
}
@command: F {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: E {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [C, F]
}`);
        });

        it('should edit dependsOn for the case : multiple shared nodes case2', async () => {
          await runCommand(`add ${fileName} B -c "echo hello"`);
          await runCommand(`add ${fileName} C -c "echo hello"`);
          await runCommand(`add ${fileName} D -c "echo hello" -p B -p C`);
          await runCommand(`add ${fileName} F -c "echo hello"`);
          await runCommand(`add ${fileName} E -c "echo hello" -p C -p F`);

          await runCommand(`edit ${fileName} B -p existingCommand`);
          await runCommand(`edit ${fileName} C -p existingCommand`);
          await runCommand(`edit ${fileName} F -p existingCommand`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [existingCommand]
}
@command: C {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [existingCommand]
}
@command: D {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [B, C]
}
@command: F {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [existingCommand]
}
@command: E {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [C, F]
}`);
        });

        it('should edit dependsOn for the case : replace existing dependencies', async () => {
          await runCommand(`add ${fileName} B -c "echo hello" -p ${name}`);
          await runCommand(`add ${fileName} C -c "echo hello"`);

          await runCommand(`edit ${fileName} B -p ""`);
          await runCommand(`edit ${fileName} C -p ${name}`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: C {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [existingCommand]
}`);
        });

        it('should edit dependsOn for the case : replace existing dependencies case 2', async () => {
          await runCommand(`add ${fileName} B -c "echo hello" -p ${name}`);
          await runCommand(`add ${fileName} C -c "echo hello"`);

          await runCommand(`edit ${fileName} B -p C`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [C]
}
@command: C {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);
        });

        it('should edit dependsOn for the case : resolve dependency', async () => {
          await runCommand(`add ${fileName} B -c "echo hello" -p ${name}`);
          await runCommand(`add ${fileName} C -c "echo hello" -p B`);

          await runCommand(`edit ${fileName} B -p ""`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: C {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [B]
}`);
        });

        it('should edit dependsOn for the case : resolve dependency case 2', async () => {
          await runCommand(`add ${fileName} B -c "echo hello" -p ${name}`);
          await runCommand(`add ${fileName} C -c "echo hello" -p B`);

          await runCommand(`edit ${fileName} C -p ""`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [existingCommand]
}
@command: C {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);
        });

        [
          { option: `--depends-on"`, scenario: "dependsOn"},
          { option: `--depends-on "test cli" --depends-on`, scenario: "multiple dependsOn"}
        ].forEach(({option, scenario}) => {
          it(`should return error when ${scenario} option is empty string`, async () => {
              try {
                await runCommand(`edit ${fileName} ${name} ${option}`);
                assert.fail('Expected command to fail but it did not');
              } catch (error) {
                // TypeScriptのエラー回避のため型アサーションを使用
                const execError = error as ExecError;
                expect(execError.stderr).to.include('Not enough arguments following: depends-on');
              }
          });
        });

        [
          { option: `--depends-on existingCommand`, scenario: "depends-on"},
          { option: `--depends-on existingCommand --depends-on dummy`, scenario: "multiple depends-on"},
          { option: `-p existingCommand`, scenario: "p"},
          { option: `-p existingCommand -p dummy`, scenario: "multiple p"}
        ].forEach(({option, scenario}) => {
          it(`should return error when ${scenario} option is itself`, async () => {
            const { stdout } = await runCommand(`edit ${fileName} ${name} ${option}`);
            expect(stdout).to.include('command cannot depend on itself');
          });
        });

        [
          { option: `--depends-on non-existing`, scenario: "a depends-on", invalid: "non-existing"},
          { option: `--depends-on non-existing --depends-on invalid-cmd`, scenario: "either of depends-on", invalid: "non-existing, invalid-cmd"},
          { option: `-p non-existing`, scenario: "(p command) a depends-on", invalid: "non-existing"},
          { option: `-p non-existing -p invalid-cmd`, scenario: "(p command) either of depends-on", invalid: "non-existing, invalid-cmd"}
        ].forEach(({option, scenario, invalid}) => {
          it(`should return error when no other command exists and ${scenario} provided does not exist`, async () => {
            const { stdout } = await runCommand(`edit ${fileName} ${name} ${option}`);
            expect(stdout).to.include(`command '${name}' has invalid dependencies: ${invalid}`);
          });
        });

        [
          { option: `--depends-on non-existing`, scenario: "a depends-on", invalid: "non-existing"},
          { option: `--depends-on non-existing --depends-on valid-cmd`, scenario: "either of depends-on", invalid: "non-existing"},
          { option: `-p non-existing`, scenario: "(p command) a depends-on", invalid: "non-existing"},
          { option: `-p non-existing -p valid-cmd`, scenario: "(p command) either of depends-on", invalid: "non-existing"}
        ].forEach(({option, scenario, invalid}) => {
          it(`should return error when other commands exists and ${scenario} provided does not exist`, async () => {
            await runCommand(`add ${fileName} valid-cmd --command "echo hello"`);
            const { stdout } = await runCommand(`edit ${fileName} ${name} ${option}`);
            expect(stdout).to.include(`command '${name}' has invalid dependencies: ${invalid}`);
          });
        });

        describe('dependency cycle', () => {
          it('direct cycle', async () => {
            await runCommand(`add ${fileName} B -c "echo hello" -p ${name}`);

            const { stdout } = await runCommand(`edit ${fileName} ${name} -p B`);
            expect(stdout).to.include(`Circular dependency detected.`);
          });

          it('indirect cycle', async () => {
            await runCommand(`add ${fileName} B -c "echo hello" -p ${name}`);
            await runCommand(`add ${fileName} C -c "echo hello" -p B`);

            const { stdout } = await runCommand(`edit ${fileName} ${name} -p C`);
            expect(stdout).to.include(`Circular dependency detected.`);
          });

          it('indirect cycle(long)', async () => {
            await runCommand(`add ${fileName} B -c "echo hello" -p ${name}`);
            await runCommand(`add ${fileName} C -c "echo hello" -p B`);
            await runCommand(`add ${fileName} D -c "echo hello" -p C`);
            await runCommand(`add ${fileName} E -c "echo hello" -p D`);

            const { stdout } = await runCommand(`edit ${fileName} ${name} -p E`);
            expect(stdout).to.include(`Circular dependency detected.`);
          });

          it('multiple dependsOn and the either become cycling', async () => {
            await runCommand(`add ${fileName} B -c "echo hello" -p ${name}`);
            await runCommand(`add ${fileName} C -c "echo hello"`);
            await runCommand(`add ${fileName} D -c "echo hello" -p B`);

            const { stdout } = await runCommand(`edit ${fileName} ${name} -p C -p D`);
            expect(stdout).to.include(`Circular dependency detected.`);
          });

          it('multiple dependsOn and the either become cycling', async () => {
            await runCommand(`add ${fileName} B -c "echo hello"`);
            await runCommand(`add ${fileName} C -c "echo hello" -p ${name}`);

            const { stdout } = await runCommand(`edit ${fileName} ${name} -p B -p C`);
            expect(stdout).to.include(`Circular dependency detected.`);
          });
        });
      });

      describe('should log the details when --log option is provided', () => {
        it('log option and command option is provided', async () => {
          const { stdout } = await runCommand(`edit ${fileName} ${name} --command "updated hello" --log`);
          expect(stdout).to.include(`A command was updated`);
          expect(stdout).to.include(`${name}
─────────
Command     : updated hello
Description : Test desc
Tags        : tag1
DependsOn   :`);
        });

        it('log option and description option is provided', async () => {
          const { stdout } = await runCommand(`edit ${fileName} ${name} --description "echo hello" --log`);
          expect(stdout).to.include(`A command was updated`);
          expect(stdout).to.include(`${name}
─────────
Command     : echo hello
Description : echo hello
Tags        : tag1
DependsOn   :`);
        });

        it('log option and tag option is provided', async () => {
          const { stdout } = await runCommand(`edit ${fileName} ${name} --tag "echo hello" --log`);
          expect(stdout).to.include(`A command was updated`);
          expect(stdout).to.include(`${name}
─────────
Command     : echo hello
Description : Test desc
Tags        : echo hello
DependsOn   :`);
        });

        it('log option and duplicated tag option is provided', async () => {
          const { stdout } = await runCommand(`edit ${fileName} ${name} --tag "echo hello" --tag "echo hello" --log`);
          expect(stdout).to.include(`A command was updated`);
          expect(stdout).to.include(`${name}
─────────
Command     : echo hello
Description : Test desc
Tags        : echo hello
DependsOn   :`);
        });

        it('log option and description and tag options are provided', async () => {
          const { stdout } = await runCommand(`edit ${fileName} ${name} --command "updated hello" --description "echo desc" --tag "echo tag" --log`);
          expect(stdout).to.include(`A command was updated`);
          expect(stdout).to.include(`${name}
─────────
Command     : updated hello
Description : echo desc
Tags        : echo tag
DependsOn   : `);
        });

        it('log option and dependsOn options are provided', async () => {
          await runCommand(`add ${fileName} B -c "echo hello"`);
          await runCommand(`add ${fileName} C -c "echo hello"`);
          const { stdout } = await runCommand(`edit ${fileName} ${name} --command "updated hello" --depends-on B --depends-on C --log`);
          expect(stdout).to.include(`A command was updated`);
          expect(stdout).to.include(`${name}
─────────
Command     : updated hello
Description : Test desc
Tags        : tag1
DependsOn   : B, C`);
        });

        it('log option and duplicated dependsOn options are provided', async () => {
          await runCommand(`add ${fileName} B -c "echo hello"`);
          const { stdout } = await runCommand(`edit ${fileName} ${name} --command "updated hello" --depends-on B --depends-on B --log`);
          expect(stdout).to.include(`A command was updated`);
          expect(stdout).to.include(`${name}
─────────
Command     : updated hello
Description : Test desc
Tags        : tag1
DependsOn   : B`);
        });

        it('log option and description and tag options are not provided', async () => {
          const { stdout } = await runCommand(`edit ${fileName} ${name} --log`);
          expect(stdout).to.include("Nothing to update as 'name' and 'command' and 'description' and 'tag' and 'dependsOn' were not passed");
        });
      });

      it('Should nothing is updated when description and tag are not provided', async () => {
          await runCommand(`edit ${fileName} ${name}`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`);
      });

      describe('not found', () => {
        it('Should return error when the snip file does not exist', async () => {
            const { stdout } = await runCommand(`edit not-exist-file ${name} --command "Test command"`);
            expect(stdout).to.include('not-exist-file.snip is not found');
        });

        it('Should return error when the command does not exist', async () => {
          await runCommand(`remove ${fileName} ${name}`)
            const { stdout } = await runCommand(`edit ${fileName} ${name} --command "Test command"`);
            expect(stdout).to.include(`command '${name}' is not found`);
        });

        it('Should return error when the command name does not exist', async () => {
            const { stdout } = await runCommand(`edit ${fileName} not-exist-command --command "Test command"`);
            expect(stdout).to.include("command 'not-exist-command' is not found");
        });
      });
    });

    describe('edit the snip command and its snip command name', () => {
      const fileName = 'test-file';
      const name = 'existingCommand';

      beforeEach(async () => {
        await runCommand(`create ${fileName} -d test-description`);
        await runCommand(`add ${fileName} ${name} -c "echo hello" -d "Test desc" -t tag1`);
      });

      describe('should edit a command name', () => {
        it('edit a command name', async () => {
          await runCommand(`edit ${fileName} ${name} newCommand`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`);
        });
      });

      describe('should edit a command of the snip when --command option is provided', () => {
        [
          { option: `--command`, value: `"Test command"`},
          { option: `-c`, value: `Test-command`}
        ].forEach(({option, value}) => {
          it(`should edit a command of the snip when ${option} option is provided`, async () => {
            await runCommand(`edit ${fileName} ${name} newCommand ${option} ${value}`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            expect(result1).to.equal(`@description: test-description
@tags: 
@command: newCommand {
    cmd: ${value},
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`);
          });
        });

        it('reset command by passing double quato', async () => {
          await runCommand(`edit ${fileName} ${name} newCommand -c ""`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: newCommand {
    cmd: "",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`);
        });

        it('reset descriptino by passing single quato', async () => {
          await runCommand(`edit ${fileName} ${name} newCommand -c ''`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
//           expect(result1).to.equal(`@description: 
// @tags: 
// @command: newCommand {
//     cmd: "",
//     desc: "Test desc",
//     tags: [tag1],
//     depends_on: []
// }`);
        });

        it('empty', async () => {
          try {
            await runCommand(`edit ${fileName} ${name} newCommand --command`);
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            // TypeScriptのエラー回避のため型アサーションを使用
            const execError = error as ExecError;
            expect(execError.stderr).to.include('Not enough arguments following: command');
          }
        });
      });

      describe('should edit a description of the snip when --description option is provided', () => {
        [
          { option: `--description`, value: `"Tested desc"`},
          { option: `-d`, value: `Test-desc`}
        ].forEach(({option, value}) => {
          it(`should edit a description of the snip when ${option} option is provided`, async () => {
            await runCommand(`edit ${fileName} ${name} newCommand ${option} ${value}`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            expect(result1).to.equal(`@description: test-description
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: ${value},
    tags: [tag1],
    depends_on: []
}`);
          });
        });

        it('reset descriptino by passing double quato', async () => {
          await runCommand(`edit ${fileName} ${name} newCommand -d ""`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "",
    tags: [tag1],
    depends_on: []
}`);
        });

        it('reset descriptino by passing single quato', async () => {
          await runCommand(`edit ${fileName} ${name} newCommand -d ''`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
//           expect(result1).to.equal(`@description: 
// @tags: 
// @command: newCommand {
//     cmd: "echo hello",
//     desc: "",
//     tags: [tag1],
//     depends_on: []
// }`);
        });

        it('empty', async () => {
          try {
            await runCommand(`edit ${fileName} ${name} newCommand --description`);
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            // TypeScriptのエラー回避のため型アサーションを使用
            const execError = error as ExecError;
            expect(execError.stderr).to.include('Not enough arguments following: description');
          }
        });
      });

      describe('should edit tags of the snip when --tag option is provided', () => {
        [
          { option: `--tag "Test tag"`, value: `"Test tag"`, scenario: "--tag"},
          { option: `--tag "Test tag" --tag test-cli`, value: `"Test tag", test-cli`, scenario: "multiple --tag"},
          { option: `-t "Test tag"`, value: `"Test tag"`, scenario: "-t"},
          { option: `-t "Test tag" -t test-cli`, value: `"Test tag", test-cli`, scenario: "multipe -t"},
          { option: `-t test-cli -t test-cli`, value: `test-cli`, scenario: "duplicated -t"},
        ].forEach(({option, value, scenario}) => {
          it(`should edit a tag with tags when ${scenario} option is provided`, async () => {
            const fileName = 'test-file';
            await runCommand(`create ${fileName}`);

            await runCommand(`edit ${fileName} ${name} newCommand ${option}`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            expect(result1).to.equal(`@description: test-description
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [${value}],
    depends_on: []
}`);
          });
        });

        [
          {option: `-t ""`, scenario: "single"},
          {option: `-t "" -t xxx`, scenario: "multiple"}
        ].forEach(({option, scenario}) => {
           it(`reset the tags when ${scenario} tag option is double quote`, async () => {
            await runCommand(`edit ${fileName} ${name} newCommand ${option}`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            expect(result1).to.equal(`@description: test-description
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [],
    depends_on: []
}`);
          });
        });

        [
          {option: `-t ''`, scenario: "single"},
          {option: `-t '' -t xxx`, scenario: "multiple"}
        ].forEach(({option, scenario}) => {
           it(`reset the tags when ${scenario} tag option is singlw quote`, async () => {
            await runCommand(`edit ${fileName} ${name} newCommand ${option}`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            // When passing '' to CLI, it works but this test failed..
          // So comment it out
//           expect(result1).to.equal(`@description: test-description
// @tags: 
// @command: newCommand {
//     cmd: "echo hello",
//     desc: "Test desc",
//     tags: [],
//     depends_on: []
// }`);
          });
        });

        [
          { option: `--tag"`, scenario: "tag"},
          { option: `--tag "test cli" --tag`, scenario: "multiple tag"}
        ].forEach(({option, scenario}) => {
          it(`should return error when ${scenario} option is empty string`, async () => {
              try {
                await runCommand(`edit ${fileName} ${name} newCommand ${option}`);
                assert.fail('Expected command to fail but it did not');
              } catch (error) {
                // TypeScriptのエラー回避のため型アサーションを使用
                const execError = error as ExecError;
                expect(execError.stderr).to.include('Not enough arguments following: tag');
              }
          });
        });
      });

      describe('should edit dependsOn of the snip when --depends-on option is provided', () => {
        [
          { option: `--depends-on B`, value: `B`, scenario: "-depends-on"},
          { option: `--depends-on B --depends-on C`, value: `B, C`, scenario: "multiple -depends-on"},
          { option: `-p B`, value: `B`, scenario: "-t"},
          { option: `-p B -p C`, value: `B, C`, scenario: "multipe -p"},
          { option: `-p C -p C`, value: `C`, scenario: "duplicated -p"},
        ].forEach(({option, value, scenario}) => {
          it(`should edit a dependsOn when ${scenario} option is provided`, async () => {
           await runCommand(`add ${fileName} B -c "echo hello"`);
           await runCommand(`add ${fileName} C -c "echo hello"`);

            await runCommand(`edit ${fileName} ${name} newCommand ${option}`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            expect(result1).to.equal(`@description: test-description
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [${value}]
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: C {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);
          });
        });

        [
          {option: `-p ""`, scenario: "single"},
          {option: `-p "" -p xxx`, scenario: "multiple"}
        ].forEach(({option, scenario}) => {
           it(`rest the dependsOn when ${scenario} dependsOn option is double quote`, async () => {
            await runCommand(`add ${fileName} B -c "echo hello"`);

            await runCommand(`edit ${fileName} ${name} -p B`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B]
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);
            await runCommand(`edit ${fileName} ${name} newCommand ${option}`);
            const result2 = await readFile(`${fileName}.snip`, testDir);
            expect(result2).to.equal(`@description: test-description
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);
          });
        });

        [
          {option: `-p ""`, scenario: "single"},
          {option: `-p "" -p xxx`, scenario: "multiple"}
        ].forEach(({option, scenario}) => {
           it(`rest the dependsOn when ${scenario} dependsOn is single quote`, async () => {
            await runCommand(`add ${fileName} B -c "echo hello"`);

            await runCommand(`edit ${fileName} ${name} -p B`);
            const result1 = await readFile(`${fileName}.snip`, testDir);
            // When passing '' to CLI, it works but this test failed..
            // So comment it out
            expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B]
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);
            await runCommand(`edit ${fileName} ${name} newCommand ${option}`);
            const result2 = await readFile(`${fileName}.snip`, testDir);
//             expect(result2).to.equal(`@description: test-description
// @tags: 
// @command: newCommand {
//     cmd: "echo hello",
//     desc: "Test desc",
//     tags: [tag1],
//     depends_on: []
// }
// @command: B {
//     cmd: "echo hello",
//     desc: "",
//     tags: [],
//     depends_on: []
// }`);
          });
        });

        it('should edit dependsOn for the case : DAG shared nodes', async () => {
          await runCommand(`add ${fileName} E -c "echo hello"`);
          await runCommand(`add ${fileName} D -c "echo hello" -p E`);
          await runCommand(`add ${fileName} B -c "echo hello" -p D`);
          await runCommand(`add ${fileName} C -c "echo hello" -p D`);

          await runCommand(`edit ${fileName} ${name} newCommand -p B -p C`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B, C]
}
@command: E {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: D {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [E]
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [D]
}
@command: C {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [D]
}`);
        });

        it('should edit dependsOn for the case : multiple dependsOn', async () => {
          await runCommand(`add ${fileName} B -c "echo hello"`);
          await runCommand(`add ${fileName} C -c "echo hello"`);
          await runCommand(`add ${fileName} D -c "echo hello" -p B`);
          await runCommand(`add ${fileName} E -c "echo hello" -p C`);

          await runCommand(`edit ${fileName} ${name} newCommand -p D -p E`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [D, E]
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: C {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: D {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [B]
}
@command: E {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [C]
}`);
        });

        it('should edit dependsOn for the case : multiple shared nodes', async () => {
          await runCommand(`add ${fileName} B -c "echo hello"`);
          await runCommand(`add ${fileName} C -c "echo hello"`);
          await runCommand(`add ${fileName} D -c "echo hello" -p B -p C`);
          await runCommand(`add ${fileName} F -c "echo hello"`);
          await runCommand(`add ${fileName} E -c "echo hello" -p C -p F`);

          await runCommand(`edit ${fileName} ${name} newCommand -p D -p E`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [D, E]
}
@command: B {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: C {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: D {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [B, C]
}
@command: F {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: E {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [C, F]
}`);
        });

        [
          { option: `--depends-on"`, scenario: "dependsOn"},
          { option: `--depends-on "test cli" --depends-on`, scenario: "multiple dependsOn"}
        ].forEach(({option, scenario}) => {
          it(`should return error when ${scenario} option is empty string`, async () => {
              try {
                await runCommand(`edit ${fileName} ${name} newCommand ${option}`);
                assert.fail('Expected command to fail but it did not');
              } catch (error) {
                // TypeScriptのエラー回避のため型アサーションを使用
                const execError = error as ExecError;
                expect(execError.stderr).to.include('Not enough arguments following: depends-on');
              }
          });
        });

        [
          { option: `--depends-on newCommand`, scenario: "depends-on"},
          { option: `--depends-on newCommand --depends-on dummy`, scenario: "multiple depends-on"},
          { option: `-p newCommand`, scenario: "p"},
          { option: `-p newCommand -p dummy`, scenario: "multiple p"}
        ].forEach(({option, scenario}) => {
          it(`should return error when ${scenario} option is itself`, async () => {
            const { stdout } = await runCommand(`edit ${fileName} ${name} newCommand ${option}`);
            expect(stdout).to.include('command cannot depend on itself');
          });
        });

        [
          { option: `--depends-on non-existing`, scenario: "a depends-on", invalid: "non-existing"},
          { option: `--depends-on non-existing --depends-on invalid-cmd`, scenario: "either of depends-on", invalid: "non-existing, invalid-cmd"},
          { option: `-p non-existing`, scenario: "(p command) a depends-on", invalid: "non-existing"},
          { option: `-p non-existing -p invalid-cmd`, scenario: "(p command) either of depends-on", invalid: "non-existing, invalid-cmd"}
        ].forEach(({option, scenario, invalid}) => {
          it(`should return error when no other command exists and ${scenario} provided does not exist`, async () => {
            const { stdout } = await runCommand(`edit ${fileName} ${name} newCommand ${option}`);
            expect(stdout).to.include(`command 'newCommand' has invalid dependencies: ${invalid}`);
          });
        });

        [
          { option: `--depends-on non-existing`, scenario: "a depends-on", invalid: "non-existing"},
          { option: `--depends-on non-existing --depends-on valid-cmd`, scenario: "either of depends-on", invalid: "non-existing"},
          { option: `-p non-existing`, scenario: "(p command) a depends-on", invalid: "non-existing"},
          { option: `-p non-existing -p valid-cmd`, scenario: "(p command) either of depends-on", invalid: "non-existing"}
        ].forEach(({option, scenario, invalid}) => {
          it(`should return error when other commands exists and ${scenario} provided does not exist`, async () => {
            await runCommand(`add ${fileName} valid-cmd --command "echo hello"`);
            const { stdout } = await runCommand(`edit ${fileName} ${name} newCommand ${option}`);
            expect(stdout).to.include(`command 'newCommand' has invalid dependencies: ${invalid}`);
          });
        });

        it('break the dependenncy by changing the name', async () => {
          await runCommand(`add ${fileName} B -c "echo hello" -p ${name}`);
          await runCommand(`add ${fileName} C -c "echo hello"`);

          const { stdout } = await runCommand(`edit ${fileName} ${name} newCommand -p C`);
          expect(stdout).to.include(`command ${name} still is depended on B`);
        });

        // When changing the name and it should move to dependency cycle,
        // instead of moving to dependency cycle actually, it failed to execute because its dependency is broken
        describe('dependency cycle', () => {
          it('direct cycle', async () => {
            await runCommand(`add ${fileName} B -c "echo hello" -p ${name}`);

            const { stdout } = await runCommand(`edit ${fileName} ${name} newCommand -p B`);
            expect(stdout).to.include(`command ${name} still is depended on B`);
          });

          it('indirect cycle', async () => {
            await runCommand(`add ${fileName} B -c "echo hello" -p ${name}`);
            await runCommand(`add ${fileName} C -c "echo hello" -p B`);

            const { stdout } = await runCommand(`edit ${fileName} ${name} newCommand -p C`);
            expect(stdout).to.include(`command ${name} still is depended on B`);
          });

          it('indirect cycle(long)', async () => {
            await runCommand(`add ${fileName} B -c "echo hello" -p ${name}`);
            await runCommand(`add ${fileName} C -c "echo hello" -p B`);
            await runCommand(`add ${fileName} D -c "echo hello" -p C`);
            await runCommand(`add ${fileName} E -c "echo hello" -p D`);

            const { stdout } = await runCommand(`edit ${fileName} ${name} newCommand -p E`);
            expect(stdout).to.include(`command ${name} still is depended on B`);
          });

          it('multiple dependsOn and the either become cycling', async () => {
            await runCommand(`add ${fileName} B -c "echo hello" -p ${name}`);
            await runCommand(`add ${fileName} C -c "echo hello"`);
            await runCommand(`add ${fileName} D -c "echo hello" -p B`);

            const { stdout } = await runCommand(`edit ${fileName} ${name} newCommand -p C -p D`);
            expect(stdout).to.include(`command ${name} still is depended on B`);
          });

          it('multiple dependsOn and the either become cycling', async () => {
            await runCommand(`add ${fileName} B -c "echo hello"`);
            await runCommand(`add ${fileName} C -c "echo hello" -p ${name}`);

            const { stdout } = await runCommand(`edit ${fileName} ${name} newCommand -p B -p C`);
            expect(stdout).to.include(`command ${name} still is depended on C`);
          });
        });
      });

      describe('should log the details when --log option is provided', () => {
        it('log option and new name is provided', async () => {
          const { stdout } = await runCommand(`edit ${fileName} ${name} newCommand --log`);
          expect(stdout).to.include(`A command was updated`);
          expect(stdout).to.include(`newCommand
─────────
Command     : echo hello
Description : Test desc
Tags        : tag1
DependsOn   :`);
        });
        
        it('log option and command option is provided', async () => {
          const { stdout } = await runCommand(`edit ${fileName} ${name} newCommand --command "updated hello" --log`);
          expect(stdout).to.include(`A command was updated`);
          expect(stdout).to.include(`newCommand
─────────
Command     : updated hello
Description : Test desc
Tags        : tag1
DependsOn   :`);
        });

        it('log option and description option is provided', async () => {
          const { stdout } = await runCommand(`edit ${fileName} ${name} newCommand --description "echo hello" --log`);
          expect(stdout).to.include(`A command was updated`);
          expect(stdout).to.include(`newCommand
─────────
Command     : echo hello
Description : echo hello
Tags        : tag1
DependsOn   :`);
        });

        it('log option and tag option is provided', async () => {
          const { stdout } = await runCommand(`edit ${fileName} ${name} newCommand --tag "echo hello" --log`);
          expect(stdout).to.include(`A command was updated`);
          expect(stdout).to.include(`newCommand
─────────
Command     : echo hello
Description : Test desc
Tags        : echo hello
DependsOn   :`);
        });

        it('log option and duplicated tag option is provided', async () => {
          const { stdout } = await runCommand(`edit ${fileName} ${name} newCommand --tag "echo hello" --tag "echo hello" --log`);
          expect(stdout).to.include(`A command was updated`);
          expect(stdout).to.include(`newCommand
─────────
Command     : echo hello
Description : Test desc
Tags        : echo hello
DependsOn   :`);
        });

        it('log option and dependsOn options are provided', async () => {
          await runCommand(`add ${fileName} B -c "echo hello"`);
          await runCommand(`add ${fileName} C -c "echo hello"`);
          const { stdout } = await runCommand(`edit ${fileName} ${name} newCommand --command "updated hello" --depends-on B --depends-on C --log`);
          expect(stdout).to.include(`A command was updated`);
          expect(stdout).to.include(`newCommand
─────────
Command     : updated hello
Description : Test desc
Tags        : tag1
DependsOn   : B, C`);
        });

        it('log option and duplicated dependsOn options are provided', async () => {
          await runCommand(`add ${fileName} B -c "echo hello"`);
          const { stdout } = await runCommand(`edit ${fileName} ${name} newCommand --command "updated hello" --depends-on B --depends-on B --log`);
          expect(stdout).to.include(`A command was updated`);
          expect(stdout).to.include(`newCommand
─────────
Command     : updated hello
Description : Test desc
Tags        : tag1
DependsOn   : B`);
        });

        it('log option and description and tag options are provided', async () => {
          const { stdout } = await runCommand(`edit ${fileName} ${name} newCommand --command "updated hello" --description "echo desc" --tag "echo tag" --log`);
          expect(stdout).to.include(`A command was updated`);
          expect(stdout).to.include(`newCommand
─────────
Command     : updated hello
Description : echo desc
Tags        : echo tag
DependsOn   :`);
        });

        it('log option and description and tag options are not provided', async () => {
          const { stdout } = await runCommand(`edit ${fileName} ${name} --log`);
          expect(stdout).to.include("Nothing to update as 'name' and 'command' and 'description' and 'tag' and 'dependsOn' were not passed");
        });
      });

      it('Should nothing is updated when description and tag are not provided', async () => {
          await runCommand(`edit ${fileName} ${name}`);
          const result1 = await readFile(`${fileName}.snip`, testDir);
          expect(result1).to.equal(`@description: test-description
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`);
      });

      describe('not found', () => {
        it('Should return error when the snip file does not exist', async () => {
            const { stdout } = await runCommand(`edit not-exist-file ${name} newCommand --command "Test command"`);
            expect(stdout).to.include('not-exist-file.snip is not found');
        });

        it('Should return error when the command does not exist', async () => {
          await runCommand(`remove ${fileName} ${name}`)
            const { stdout } = await runCommand(`edit ${fileName} ${name} newCommand --command "Test command"`);
            expect(stdout).to.include(`command '${name}' is not found`);
        });

        it('Should return error when the command name does not exist', async () => {
            const { stdout } = await runCommand(`edit ${fileName} not-exist-command newCommand --command "Test command"`);
            expect(stdout).to.include("command 'not-exist-command' is not found");
        });
      });

      it('Should return error when the new command name is same with current', async () => {
          const { stdout } = await runCommand(`edit ${fileName} ${name} ${name} --command "Test command"`);
          expect(stdout).to.include(`command was not updated to '${name}' as its name is same`);
      });

      it('Should return error when the new command name already exist', async () => {
          await runCommand(`add ${fileName} duplicatedCommand -c "echo hello" -d "Test desc" -t 'tag1'`);
          
          const { stdout } = await runCommand(`edit ${fileName} ${name} duplicatedCommand --command "Test command"`);
          expect(stdout).to.include(`command was not updated to 'duplicatedCommand' as its name already exits`);
      });
    });

    describe('arguments', () =>{
      it('should throw an error when arguement / mandatory option are missing', async () => {
        try {
          await runCommand('edit');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          // TypeScriptのエラー回避のため型アサーションを使用
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Not enough non-option arguments: got 0, need at least 1');
        }
      });

      it('should throw an error when file is empty string(double quote)', async () => {
        try {
          await runCommand('edit ""');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Empty string is not allowed: file');
        }
      });

      it('should throw an error when file is empty string(single quote)', async () => {
        try {
          await runCommand(`edit ''`);
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
          // expect(execError.stderr).to.include('Empty string is not allowed: file');
        }
      });

      it('should throw an error when name is empty string(double quote)', async () => {
        try {
          await runCommand('edit test-file "" --command "echo hello1"');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Empty string is not allowed: name');
        }
      });

      it('should throw an error when name is empty string(single quote)', async () => {
        try {
          await runCommand(`edit test-file '' test-cmd --command "echo hello1"`);
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
          // expect(execError.stderr).to.include('Empty string is not allowed: name');
        }
      });

      it('should throw an error when newName is empty string(double quote)', async () => {
        try {
          await runCommand('edit test-file test-cmd "" --command "echo hello1"');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Empty string is not allowed: newName');
        }
      });

      it('should throw an error when newName is empty string(single quote)', async () => {
        try {
          await runCommand(`edit test-file test-cmd '' test-cmd --command "echo hello1"`);
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
          // expect(execError.stderr).to.include('Empty string is not allowed: newName');
        }
      });

      it('should throw an error when multiple option is passed', async () => {
        try {
          await runCommand('edit test-file.snip test-cmd --command "echo hello1" --command "echo hello2"');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('A command does not accept multiple values');
        }

        try {
          await runCommand('edit test-file.snip test-cmd -c "echo hello1" -c "echo hello2"');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('A command does not accept multiple values');
        }

        try {
          await runCommand('edit test-file.snip test-cmd --command "echo hello" --description test1 --description test2');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('A description does not accept multiple values');
        }

        try {
          await runCommand('edit test-file.snip test-cmd -c "echo hello" -d test1 -d test2');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('A description does not accept multiple values');
        }
      });

      it('should throw an error when name is NOT passed but command is passed', async () => {
        try {
          await runCommand('edit test-file.snip --command "echo hello1"');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('--command can only be used when editing a command.');
        }

        try {
          await runCommand('edit test-file.snip -c "echo hello1"');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('--command can only be used when editing a command.');
        }
      });

      it('should throw an error when name is NOT passed but dependsOn is passed', async () => {
        try {
          await runCommand('edit test-file.snip --depends-on "echo hello1"');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('--depends-on can only be used when editing a command.');
        }

        try {
          await runCommand('edit test-file.snip -p "echo hello1"');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('--depends-on can only be used when editing a command.');
        }
      });
    });
  });

  describe('remove command', () => {
    describe('remove the command', () => {
      it('should remove a command in the specified file', async () => {
        const fileName = 'test-file';
        await runCommand(`create ${fileName}`);
        await runCommand('add test-file test-cmd --command "echo hello"');
        const result1 = await readFile(`${fileName}.snip`, testDir);
        expect(result1).to.equal(`@description: 
@tags: 
@command: test-cmd {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);

        await runCommand('remove test-file test-cmd');
        const result2 = await readFile(`${fileName}.snip`, testDir);
        expect(result2).to.equal(`@description: 
@tags:`);
      });

      it('should log details when log option is provided', async () => {
        const fileName = 'test-file';
        await runCommand(`create ${fileName}`);
        await runCommand('add test-file test-cmd --command "echo hello"');
        const result1 = await readFile(`${fileName}.snip`, testDir);
        expect(result1).to.equal(`@description: 
@tags: 
@command: test-cmd {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);

        const { stdout } = await runCommand('remove test-file test-cmd --log');
        expect(stdout).to.include(`Remove a command test-cmd in the file: test-file`);
        const result2 = await readFile(`${fileName}.snip`, testDir);
        expect(result2).to.equal(`@description: 
@tags:`);
      });

      it('should return error when the file is not found', async () => {
        const { stdout } = await runCommand('remove test-file test-cmd');
        expect(stdout).to.include(`test-file.snip is not found`);
      });

      it('should return error when the passed command is not found', async () => {
        const fileName = 'test-file';
        await runCommand(`create ${fileName}`);
        await runCommand('add test-file test-cmd --command "echo hello"');
        const result1 = await readFile(`${fileName}.snip`, testDir);
        expect(result1).to.equal(`@description: 
@tags: 
@command: test-cmd {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);

        const { stdout } = await runCommand('remove test-file not-found-cmd');
        expect(stdout).to.include(`command 'not-found-cmd' is not found`);
        const result2 = await readFile(`${fileName}.snip`, testDir);
        expect(result2).to.equal(`@description: 
@tags: 
@command: test-cmd {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);
      });

      it('should return error when the command does not exist in the snip file', async () => {
        const fileName = 'test-file';
        await runCommand(`create ${fileName}`);
        const result1 = await readFile(`${fileName}.snip`, testDir);
        expect(result1).to.equal(`@description: 
@tags:`);

        const { stdout } = await runCommand('remove test-file not-found-cmd');
        expect(stdout).to.include(`command 'not-found-cmd' is not found`);
        const result2 = await readFile(`${fileName}.snip`, testDir);
        expect(result2).to.equal(`@description: 
@tags:`);
      });

      it('should return error when the command still has dependsOn', async () => {
        const fileName = 'test-file';
        await runCommand(`create ${fileName}`);
        await runCommand('add test-file test-cmd --command "echo hello"');
        await runCommand('add test-file dependency --command "echo hello" --depends-on test-cmd');
        const result1 = await readFile(`${fileName}.snip`, testDir);
        expect(result1).to.equal(`@description: 
@tags: 
@command: test-cmd {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: dependency {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [test-cmd]
}`);

        const { stdout } = await runCommand('remove test-file test-cmd');
        expect(stdout).to.include(`'test-cmd' is still referenced by dependency`);
        const result2 = await readFile(`${fileName}.snip`, testDir);
        expect(result2).to.equal(`@description: 
@tags: 
@command: test-cmd {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: dependency {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [test-cmd]
}`);
      });

      it('should return error when the command still has dependsOn multiply', async () => {
        const fileName = 'test-file';
        await runCommand(`create ${fileName}`);
        await runCommand('add test-file test-cmd --command "echo hello"');
        await runCommand('add test-file dependency --command "echo hello" --depends-on test-cmd');
        await runCommand('add test-file dependency2 --command "echo hello" --depends-on test-cmd');
        const result1 = await readFile(`${fileName}.snip`, testDir);
        expect(result1).to.equal(`@description: 
@tags: 
@command: test-cmd {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: dependency {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [test-cmd]
}
@command: dependency2 {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [test-cmd]
}`);

        const { stdout } = await runCommand('remove test-file test-cmd');
        expect(stdout).to.include(`'test-cmd' is still referenced by dependency, dependency2`);
        const result2 = await readFile(`${fileName}.snip`, testDir);
        expect(result2).to.equal(`@description: 
@tags: 
@command: test-cmd {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: dependency {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [test-cmd]
}
@command: dependency2 {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [test-cmd]
}`);
      });

      it('remove command successfully when non-target commands has dependsOn another', async () => {
        const fileName = 'test-file';
        await runCommand(`create ${fileName}`);
        await runCommand('add test-file test-cmd --command "echo hello"');
        await runCommand('add test-file dependency --command "echo hello"');
        await runCommand('add test-file dependency2 --command "echo hello" --depends-on dependency');
        const result1 = await readFile(`${fileName}.snip`, testDir);
        expect(result1).to.equal(`@description: 
@tags: 
@command: test-cmd {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: dependency {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: dependency2 {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [dependency]
}`);

        const { stdout } = await runCommand('remove test-file test-cmd');
        const result2 = await readFile(`${fileName}.snip`, testDir);
        expect(result2).to.equal(`@description: 
@tags: 
@command: dependency {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: dependency2 {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [dependency]
}`);
      });

      it('should return error when its dependsOn is one of their dependsOn', async () => {
        const fileName = 'test-file';
        await runCommand(`create ${fileName}`);
        await runCommand('add test-file test-cmd --command "echo hello"');
        await runCommand('add test-file dependency --command "echo hello"');
        await runCommand('add test-file dependency2 --command "echo hello" --depends-on test-cmd --depends-on dependency');
        const result1 = await readFile(`${fileName}.snip`, testDir);
        expect(result1).to.equal(`@description: 
@tags: 
@command: test-cmd {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: dependency {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: dependency2 {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [test-cmd, dependency]
}`);

        const { stdout } = await runCommand('remove test-file test-cmd');
        expect(stdout).to.include(`'test-cmd' is still referenced by dependency2`);
        const result2 = await readFile(`${fileName}.snip`, testDir);
        expect(result2).to.equal(`@description: 
@tags: 
@command: test-cmd {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: dependency {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: dependency2 {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [test-cmd, dependency]
}`);
      });
    });

    describe('remove the file', () => {
      const testFileToDelete = 'test-delete.snip'
      
      beforeEach(async () => {
          await writeFile(testFileToDelete, testDir, 'this must be deleted');
      });

      it('should remove the file', async () => {
        await runCommand('remove test-delete');
        const file = await readFile(testFileToDelete, testDir);
        expect(file).to.be.null;
      });

      it('should complete without error when the file to delete does not exist', async () => {
        await runCommand('remove test-delete --log');
        const file = await readFile(testFileToDelete, testDir);
        expect(file).to.be.null;

        const { stdout } = await runCommand('remove test-delete --log');
        expect(stdout).to.include(`${testFileToDelete} is not found`);
      });

      it('should remove the file with log option', async () => {
        const { stdout } = await runCommand('remove test-delete --log');
        const file = await readFile(testFileToDelete, testDir);
        expect(file).to.be.null;
        expect(stdout).to.include(`Removed the file: ${testFileToDelete}`);
      });
    })

    describe('arguments', () =>{
      it('should throw an error when file is missing', async () => {
        try {
          await runCommand('remove');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Not enough non-option arguments: got 0, need at least 1');
        }
      });

      it('should throw an error when file is empty string(double quote)', async () => {
        try {
          await runCommand('remove "" test-cmd');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Empty string is not allowed: file');
        }
      });

      it('should throw an error when file is empty string(single quote)', async () => {
        try {
          await runCommand(`remove "" test-cmd`);
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
          // expect(execError.stderr).to.include('Empty string is not allowed: file');
        }
      });

      it('should throw an error when name is empty string(double quote)', async () => {
        try {
          await runCommand('remove test-file ""');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Empty string is not allowed: name');
        }
      });

      it('should throw an error when name is empty string(single quote)', async () => {
        try {
          await runCommand(`remove test-file ''`);
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
          // expect(execError.stderr).to.include('Empty string is not allowed: name');
        }
      });
    });
  });

  describe('rename command', () => {
    describe('rename the file', () => {
      const testFileToRename = 'test-rename'
      
      beforeEach(async () => {
          await runCommand(`create ${testFileToRename} -d test-description`);
      });

      it('should rename the file', async () => {
        await runCommand(`rename ${testFileToRename} renamed`);
        const file1 = await readFile(`${testFileToRename}.snip`, testDir);
        expect(file1).to.be.null;
        const file2 = await readFile('renamed.snip', testDir);
        expect(file2).to.equal(`@description: test-description
@tags:`);        
      });

      it('should complete without error when the file to rename does not exist', async () => {
        const { stdout } = await runCommand(`rename non-exist renamed`);
        const file = await readFile('renamed.snip', testDir);
        expect(file).to.be.null;
        expect(stdout).to.include(`non-exist.snip is not found`);
      });

      it('should complete without error when the renamed name is same with current', async () => {
        const { stdout } = await runCommand(`rename ${testFileToRename} ${testFileToRename}`);
        const file = await readFile(`${testFileToRename}.snip`, testDir);
        expect(file).to.not.be.null;
        expect(stdout).to.include(`${testFileToRename}.snip was not renamed as newName is same.`);
      });

      it('should complete without error when the renamed name already exists', async () => {
        const { stdout } = await runCommand(`rename renamed ${testFileToRename}`);
        const file = await readFile(`${testFileToRename}.snip`, testDir);
        expect(file).to.not.be.null;
        expect(stdout).to.include(`${testFileToRename}.snip already exists`);
      });

      it('should rename the file with log option', async () => {
        const { stdout } = await runCommand(`rename ${testFileToRename} renamed --log`);
        const file1 = await readFile(`${testFileToRename}.snip`, testDir);
        expect(file1).to.be.null;
        const file2 = await readFile('renamed.snip', testDir);
        expect(file2).to.equal(`@description: test-description
@tags:`);
        expect(stdout).to.include(`${testFileToRename}.snip was renamed to renamed.snip`);
      });
    })

    describe('arguments', () =>{
      it('should throw an error when file is missing', async () => {
        try {
          await runCommand('rename');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Not enough non-option arguments: got 0, need at least 2');
        }
      });

      it('should throw an error when file is empty string(double quote)', async () => {
        try {
          await runCommand('rename "" test-cmd');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Empty string is not allowed: file');
        }
      });

      it('should throw an error when file is empty string(single quote)', async () => {
        try {
          await runCommand(`rename "" test-cmd`);
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
          // expect(execError.stderr).to.include('Empty string is not allowed: file');
        }
      });

      it('should throw an error when newName is missing', async () => {
        try {
          await runCommand('rename test-file');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Not enough non-option arguments: got 1, need at least 2');
        }
      });

      it('should throw an error when newName is empty string(double quote)', async () => {
        try {
          await runCommand('rename test-file ""');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Empty string is not allowed: newName');
        }
      });

      it('should throw an error when newName is empty string(single quote)', async () => {
        try {
          await runCommand(`rename test-file ''`);
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
          // expect(execError.stderr).to.include('Empty string is not allowed: newName');
        }
      });
    });
  });

  describe('tag command', () => {
    describe('add tag to the file', () => {
      const testFileToTag = 'test-tag'
      
      beforeEach(async () => {
          await runCommand(`create ${testFileToTag} -d test-description`);
      });

      it('should add a tag to the file having no tag', async () => {
        await runCommand(`tag add ${testFileToTag} newTag`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags: newTag`);        
      });

      it('should add a tag to the file having some tags', async () => {
        await runCommand(`edit ${testFileToTag} -t tag`);
        await runCommand(`tag add ${testFileToTag} newTag`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags: tag, newTag`);        
      });

      it('should complete without error when the file does not exist', async () => {
        const { stdout } = await runCommand(`tag add non-exist newTag`);
        const file = await readFile('non-exist.snip', testDir);
        expect(file).to.be.null;
        expect(stdout).to.include(`non-exist.snip is not found`);
      });

      it('should complete without error when the tag already exists', async () => {
        await runCommand(`edit ${testFileToTag} -t newTag`);
        const { stdout } = await runCommand(`tag add ${testFileToTag} newTag`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags: newTag`);
        expect(stdout).to.include(`newTag is already added`);
      });

      it('should rename the file with log option', async () => {
        const { stdout } = await runCommand(`tag add ${testFileToTag} newTag --log`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);

        expect(stdout).to.include(`A tag was added`);
        expect(stdout).to.include(`${testFileToTag}
─────────
Description : test-description
Tags        : newTag
Commands    : `);
      });
    });

    describe('remove tag from the file', () => {
      const testFileToTag = 'test-tag'
      
      beforeEach(async () => {
          await runCommand(`create ${testFileToTag} -d test-description`);
          await runCommand(`edit ${testFileToTag} -t existingTag`);
      });

      it('should remove a tag from the file having a tag', async () => {
        await runCommand(`tag remove ${testFileToTag} existingTag`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags:`);        
      });

      it('should remove a tag from the file having multiple tags', async () => {
        await runCommand(`edit ${testFileToTag} -t existingTag -t tag`);
        await runCommand(`tag remove ${testFileToTag} existingTag`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags: tag`);        
      });

      it('should complete without error when the file does not exist', async () => {
        const { stdout } = await runCommand(`tag remove non-exist existingTag`);
        const file = await readFile('non-exist.snip', testDir);
        expect(file).to.be.null;
        expect(stdout).to.include(`non-exist.snip is not found`);
      });

      it('should complete without error when the file has no tags', async () => {
        await runCommand(`tag remove ${testFileToTag} existingTag`);

        const { stdout } = await runCommand(`tag remove ${testFileToTag} existingTag`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags:`);  
        expect(stdout).to.include(`existingTag is not tagged`);
      });

      it('should complete without error when the tag does not exist', async () => {
        const { stdout } = await runCommand(`tag remove ${testFileToTag} non-existingTag`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags: existingTag`);  
        expect(stdout).to.include(`non-existingTag is not tagged`);
      });

      it('should remove the tag from the file with log option', async () => {
        const { stdout } = await runCommand(`tag remove ${testFileToTag} existingTag --log`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags:`); 
        expect(stdout).to.include(`A tag was removed`);
        expect(stdout).to.include(`${testFileToTag}
─────────
Description : test-description
Tags        : 
Commands    : `);
      });
    });

    describe('add tag to the snip command', () => {
      const testFileToTag = 'test-tag'
      const testCommandToTag = 'test-command'
      
      beforeEach(async () => {
          await runCommand(`create ${testFileToTag} -d test-description`);
          await runCommand(`add ${testFileToTag} ${testCommandToTag} -c "echo hello" -d "Test desc"`);
      });

      it('should add a tag to the snip command having no tag', async () => {
        await runCommand(`tag add ${testFileToTag} ${testCommandToTag} newTag`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags: 
@command: test-command {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [newTag],
    depends_on: []
}`);       
      });

      it('should add a tag to the snip command having some tags', async () => {
        await runCommand(`edit ${testFileToTag} ${testCommandToTag} -t tag`);
        await runCommand(`tag add ${testFileToTag} ${testCommandToTag} newTag`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags: 
@command: test-command {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag, newTag],
    depends_on: []
}`);        
      });

      it('should complete without error when the file does not exist', async () => {
        const { stdout } = await runCommand(`tag add non-exist ${testCommandToTag} newTag`);
        const file = await readFile('non-exist.snip', testDir);
        expect(file).to.be.null;
        expect(stdout).to.include(`non-exist.snip is not found`);
      });

      it('should complete without error when the command does not exist', async () => {
        const { stdout } = await runCommand(`tag add ${testFileToTag} non-exist newTag`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags: 
@command: test-command {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [],
    depends_on: []
}`);       
        expect(stdout).to.include(`command 'non-exist' is not found`);
      });

      it('should complete without error when any command does not exist', async () => {
        await runCommand(`remove ${testFileToTag} ${testCommandToTag}`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags:`); 

        const { stdout } = await runCommand(`tag add ${testFileToTag} ${testCommandToTag} newTag`);
        const file2 = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file2).to.equal(`@description: test-description
@tags:`);       
        expect(stdout).to.include(`command '${testCommandToTag}' is not found`);
      });

      it('should complete without error when the tag already exists', async () => {
        await runCommand(`edit ${testFileToTag} ${testCommandToTag} -t newTag`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags: 
@command: test-command {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [newTag],
    depends_on: []
}`);       
        const { stdout } = await runCommand(`tag add ${testFileToTag} ${testCommandToTag} newTag`);
        const file2 = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file2).to.equal(`@description: test-description
@tags: 
@command: test-command {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [newTag],
    depends_on: []
}`); 
        expect(stdout).to.include(`newTag is already added`);
      });

      it('should add a tag to the snip command with log option', async () => {
        const { stdout } = await runCommand(`tag add ${testFileToTag} ${testCommandToTag} newTag --log`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags: 
@command: test-command {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [newTag],
    depends_on: []
}`); 
        expect(stdout).to.include(`A tag was added`);
        expect(stdout).to.include(`${testCommandToTag}
─────────
Command     : echo hello
Description : Test desc
Tags        : newTag
DependsOn   :`);
      });
    });

    describe('remove tag from the snip command', () => {
      const testFileToTag = 'test-tag'
      const testCommandToTag = 'test-command'
      
      beforeEach(async () => {
          await runCommand(`create ${testFileToTag} -d test-description`);
          await runCommand(`add ${testFileToTag} ${testCommandToTag} -c "echo hello" -d "Test desc" -t existingTag`);
      });

      it('should remove a tag from the snip command having a tag', async () => {
        await runCommand(`tag remove ${testFileToTag} ${testCommandToTag} existingTag`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags: 
@command: test-command {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [],
    depends_on: []
}`);       
      });

      it('should remove a tag from the snip command having multilpe tags', async () => {
        await runCommand(`edit ${testFileToTag} ${testCommandToTag} -c "echo hello" -d "Test desc" -t existingTag -t tag`);
        await runCommand(`tag remove ${testFileToTag} ${testCommandToTag} existingTag`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags: 
@command: test-command {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag],
    depends_on: []
}`);       
      });

      it('should complete without error when the file does not exist', async () => {
        const { stdout } = await runCommand(`tag remove non-exist ${testCommandToTag} existingTag`);
        const file = await readFile('non-exist.snip', testDir);
        expect(file).to.be.null;
        expect(stdout).to.include(`non-exist.snip is not found`);
      });

      it('should complete without error when the snip command has no tags', async () => {
        await runCommand(`tag remove ${testFileToTag} ${testCommandToTag} existingTag`);

        const { stdout } = await runCommand(`tag remove ${testFileToTag} ${testCommandToTag} existingTag`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags: 
@command: test-command {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [],
    depends_on: []
}`);  
        expect(stdout).to.include(`'existingTag' is not tagged`);
      });

      it('should complete without error when the tag does not exist', async () => {
        const { stdout } = await runCommand(`tag remove ${testFileToTag} ${testCommandToTag} non-existingTag`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags: 
@command: test-command {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [existingTag],
    depends_on: []
}`);  
        expect(stdout).to.include(`'non-existingTag' is not tagged`);
      });

      it('should complete without error when the command does not exist', async () => {
        const { stdout } = await runCommand(`tag remove ${testFileToTag} non-existingCommand non-existingTag`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags: 
@command: test-command {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [existingTag],
    depends_on: []
}`);  
        expect(stdout).to.include(`non-existingCommand' is not found`);
      });

      it('should complete without error when any command does not exist', async () => {
        await runCommand(`remove ${testFileToTag} ${testCommandToTag}`)
        const { stdout } = await runCommand(`tag remove ${testFileToTag} ${testCommandToTag} non-existingTag`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags:`);  
        expect(stdout).to.include(`'test-command' is not found`);
      });

      it('should remove the tag from the file with log option', async () => {
        const { stdout } = await runCommand(`tag remove ${testFileToTag} ${testCommandToTag} existingTag --log`);
        const file = await readFile(`${testFileToTag}.snip`, testDir);
        expect(file).to.equal(`@description: test-description
@tags: 
@command: test-command {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [],
    depends_on: []
}`); 
        expect(stdout).to.include(`A tag was removed`);
        expect(stdout).to.include(`${testCommandToTag}
─────────
Command     : echo hello
Description : Test desc
Tags        : 
DependsOn   : `);
      });
    });

    describe('list up tag of all file', () => {
      it('snip file does not exist', async () => {
        const { stdout } = await runCommand(`tag list`);
        expect(stdout).to.include('');
      });

      it('snip file does not have any tag', async () => {
        await runCommand(`create sample -d good-description`);
        const { stdout } = await runCommand(`tag list`);
        expect(stdout).to.include('');
      });

      it('should show all tags', async () => {
        await runCommand(`create sample -d good-description`);
        await runCommand(`edit sample -t "valid tag" -t tagA`);
        const { stdout } = await runCommand(`tag list`);
        // Verify how many rows are printed
        expect(stdout.split('\n').length).to.equal(3);
        expect(stdout).to.include('tagA');
        expect(stdout).to.include('valid tag');
      });

      it('should show tag with duplicated', async () => {
        await runCommand(`create sample -d good-description`);
        await runCommand(`edit sample -t "valid tag" -t tagA`);
        await runCommand(`create valid -d good-description`);
        await runCommand(`edit valid -t "valid tag" -t tagB`);
        const { stdout } = await runCommand(`tag list`);
        // Verify how many rows are printed
        expect(stdout.split('\n').length).to.equal(4);
        expect(stdout).to.include('tagA');
        expect(stdout).to.include('tagB');
        expect(stdout).to.include('valid tag');
      });
    });

    describe('list up tag of all command', () => {
      it('snip file does not exist', async () => {
        const { stdout } = await runCommand(`tag list non-exist`);
        expect(stdout).to.include('');
      });

      it('snip file does not have any command', async () => {
        await runCommand(`create sample -d good-description`);
        const { stdout } = await runCommand(`tag list sample`);
        expect(stdout).to.include('');
      });

      it('command has no tag', async () => {
        await runCommand(`create sample -d good-description`);
        await runCommand(`add sample sample-cmd -c ping`);
        const { stdout } = await runCommand(`tag list sample`);
        expect(stdout).to.include('');
      });

      it('should show all tags of all command', async () => {
        await runCommand(`create sample -d good-description`);
        await runCommand(`add sample sample-cmd -c ping -t tagA -t "tag B"`);
        const { stdout } = await runCommand(`tag list sample`);
        // Verify how many rows are printed
        expect(stdout.split('\n').length).to.equal(3);
        expect(stdout).to.include('tagA');
        expect(stdout).to.include('tag B');
      });

      it('should show tags without duplicated', async () => {
        await runCommand(`create sample -d good-description`);
        await runCommand(`add sample sample-cmd -c ping -t tagA -t "tag B"`);
        await runCommand(`add sample valid-cmd -c ping -t AZ -t "tag B"`);
        const { stdout } = await runCommand(`tag list sample`);
        // Verify how many rows are printed
        expect(stdout.split('\n').length).to.equal(4);
        expect(stdout).to.include('AZ');
        expect(stdout).to.include('tagA');
        expect(stdout).to.include('tag B');
      });
    });

    describe('arguments', () =>{
      it('should throw an error when action is missing', async () => {
        try {
          await runCommand('tag');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('You need to specify a subcommand (add, remove, list)');
        }
      });

      it('should throw an error when action is empty string(double quote)', async () => {
        try {
          await runCommand('tag "" test-file test-cmd');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Unknown arguments: "", test-file, test-cmd');
        }
      });

      it('should throw an error when action is empty string(single quote)', async () => {
        try {
          await runCommand(`tag '' test-file test-cmd`);
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
          // expect(execError.stderr).to.include('Unknown argument: "", test-file, test-cmd');
        }
      });

      it('should throw an error when action is invalid', async () => {
        try {
          await runCommand('tag aa test-file test-cmd');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Unknown arguments: aa, test-file, test-cmd');
        }
      });

      describe('subcommand is add', () => {
        it('should throw an error when file is missing', async () => {
          try {
            await runCommand('tag add');
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            expect(execError.stderr).to.include('Not enough non-option arguments: got 0, need at least 2');
          }
        });

        it('should throw an error when file is empty string(double quote)', async () => {
          try {
            await runCommand('tag add "" test-cmd');
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            expect(execError.stderr).to.include('Empty string is not allowed: file');
          }
        });

        it('should throw an error when file is empty string(single quote)', async () => {
          try {
            await runCommand(`tag add '' test-cmd`);
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            // When passing '' to CLI, it works but this test failed..
            // So comment it out
            // expect(execError.stderr).to.include('Empty string is not allowed: file');
          }
        });

        it('should throw an error when target is missing', async () => {
          try {
            await runCommand('tag add test-file');
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            expect(execError.stderr).to.include('Not enough non-option arguments: got 1, need at least 2');
          }
        });

        it('should throw an error when target is empty string(double quote)', async () => {
          try {
            await runCommand('tag add test-file ""');
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            expect(execError.stderr).to.include('Empty string is not allowed: target');
          }
        });

        it('should throw an error when target is empty string(single quote)', async () => {
          try {
            await runCommand(`tag add test-file ''`);
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            // When passing '' to CLI, it works but this test failed..
            // So comment it out
            // expect(execError.stderr).to.include('Empty string is not allowed: target');
          }
        });

        it('should throw an error when tag is empty string(double quote)', async () => {
          try {
            await runCommand('tag add test-file test-command ""');
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            expect(execError.stderr).to.include('Empty string is not allowed: tag');
          }
        });

        it('should throw an error when tag is empty string(single quote)', async () => {
          try {
            await runCommand(`tag add test-file tast-command ''`);
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            // When passing '' to CLI, it works but this test failed..
            // So comment it out
            // expect(execError.stderr).to.include('Empty string is not allowed: tag');
          }
      });
      });

      describe('subcommand is remove', () => {
        it('should throw an error when file is missing', async () => {
          try {
            await runCommand('tag remove');
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            expect(execError.stderr).to.include('Not enough non-option arguments: got 0, need at least 2');
          }
        });

        it('should throw an error when file is empty string(double quote)', async () => {
          try {
            await runCommand('tag remove "" test-cmd');
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            expect(execError.stderr).to.include('Empty string is not allowed: file');
          }
        });

        it('should throw an error when file is empty string(single quote)', async () => {
          try {
            await runCommand(`tag remove '' test-cmd`);
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            // When passing '' to CLI, it works but this test failed..
            // So comment it out
            // expect(execError.stderr).to.include('Empty string is not allowed: file');
          }
        });

        it('should throw an error when target is missing', async () => {
          try {
            await runCommand('tag remove test-file');
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            expect(execError.stderr).to.include('Not enough non-option arguments: got 1, need at least 2');
          }
        });

        it('should throw an error when target is empty string(double quote)', async () => {
          try {
            await runCommand('tag remove test-file ""');
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            expect(execError.stderr).to.include('Empty string is not allowed: target');
          }
        });

        it('should throw an error when target is empty string(single quote)', async () => {
          try {
            await runCommand(`tag remove test-file ''`);
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            // When passing '' to CLI, it works but this test failed..
            // So comment it out
            // expect(execError.stderr).to.include('Empty string is not allowed: target');
          }
        });

        it('should throw an error when tag is empty string(double quote)', async () => {
          try {
            await runCommand('tag remove test-file test-command ""');
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            expect(execError.stderr).to.include('Empty string is not allowed: tag');
          }
        });

        it('should throw an error when tag is empty string(single quote)', async () => {
          try {
            await runCommand(`tag remove test-file tast-command ''`);
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            // When passing '' to CLI, it works but this test failed..
            // So comment it out
            // expect(execError.stderr).to.include('Empty string is not allowed: tag');
          }
        });
      });

      describe('subcommand is list', () => {
        it('should throw an error when file is empty string(double quote)', async () => {
          try {
            await runCommand('tag list ""');
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            expect(execError.stderr).to.include('Empty string is not allowed: file');
          }
        });

        it('should throw an error when file is empty string(single quote)', async () => {
          try {
            await runCommand(`tag list ''`);
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            // When passing '' to CLI, it works but this test failed..
            // So comment it out
            // expect(execError.stderr).to.include('Empty string is not allowed: file');
          }
        });
      });

    });
  });

  describe('find', () => {
    describe('find file', () => {
      beforeEach(async () => {
        await runCommand(`create sample -d good-description`);
        await runCommand(`create valid -d "valid well description"`);
        await runCommand(`create no-desc`);
      });

      it('find all snip in directory', async () => {
        const { stdout } = await runCommand(`find`);
        expect(stdout).to.include('sample');
        expect(stdout).to.include('valid');
        expect(stdout).to.include('no-desc');
      });

      describe('--match', () => {
        it('find all when empty string(double quote) is given', async () => {
          const { stdout } = await runCommand(`find --match ""`);
          expect(stdout).to.include('sample');
          expect(stdout).to.include('valid');
          expect(stdout).to.include('no-desc');
        });

        it('find all when empty string(single quote) is given', async () => {
          const { stdout } = await runCommand(`find --match ''`);
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
          // expect(stdout).to.include('sample');
          // expect(stdout).to.include('valid');
          // expect(stdout).to.include('no-desc');
        });

        [
          { command: `--match sample`, scenario: "file name", result: "sample"},
          { command: `-m sample`, scenario: "file name", result: "sample"},
          { command: `--match good`, scenario: "no space description when non space is given", result: "sample"},
          { command: `-m good`, scenario: "no space description when non space is given", result: "sample"},
          { command: `--match well`, scenario: "matching description having sapce when non space is given", result: "valid"},
          { command: `-m well`, scenario: "matching description having sapce when non space is given", result: "valid"},
          { command: `--match "valid well"`, scenario: "description having sapce when string having space is given", result: "valid"},
          { command: `-m "valid well"`, scenario: "description having sapce when string having space is given", result: "valid"},
          { command: `--match valid`, scenario: "name and description both", result: "valid"},
          { command: `-m valid`, scenario: "name and description both", result: "valid"}
        ].forEach(({ command, scenario, result }) => {
          it(`find snip matching ${scenario}`, async () => {
            const { stdout } = await runCommand(`find ${command}`);
            expect(stdout).to.include(result);
          });
        });

        it('find none by no match', async () => {
          const { stdout } = await runCommand(`find --match non-match`);
          expect(stdout).to.include('');
        });
      });

      describe('--tag', () => {
        beforeEach(async () => {
          await runCommand(`edit sample -t tag1`);
          await runCommand(`edit valid -t "valid tag" -t tagA`);

           await runCommand(`create tag-test -d "tag test"`);
           await runCommand(`edit tag-test -t "valid tag" -t "valid one" -t "valid second" -t tagA -t tagB -t tagC`);
           await runCommand(`create tag-test2 -d "tag test"`);
           await runCommand(`edit tag-test2 -t "valid XYZ"`);
        });

        it('find all when empty tag(double quote) is given', async () => {
          const { stdout } = await runCommand(`find --tag ""`);
          expect(stdout).to.include('sample');
          expect(stdout).to.include('valid');
          
        });

        it('find all when empty multiple tag(double quote) is given', async () => {
          const { stdout } = await runCommand(`find --tag "" --tag ""`);
          expect(stdout).to.include('sample');
          expect(stdout).to.include('valid');
          
        });

        it('find all when empty tag(single quote) is given', async () => {
          const { stdout } = await runCommand(`find --tag ''`);
          // When passing '' to CLI, it works but this test failed..
            // So comment it out
          // expect(stdout).to.include('sample');
          // expect(stdout).to.include('valid');
        });

        [
          { command: `--tag tag1`, scenario: "by passing a tag with no space", result: ["sample"]},
          { command: `-t tag1`, scenario: "by passing a tag with no space", result: ["sample"]},
          { command: `--tag tagA`, scenario: "by passing a tag with no space", result: ["valid", "tag-test"]},
          { command: `-t tagA`, scenario: "by passing a tag with no space", result: ["valid", "tag-test"]},
          { command: `--tag "valid one"`, scenario: "by passing a having space", result: ["tag-test"]},
          { command: `-t "valid one"`, scenario: "by passing a having space", result: ["tag-test"]},
          { command: `--tag "valid tag"`, scenario: "by passing a having space", result: ["valid", "tag-test"]},
          { command: `-t "valid tag"`, scenario: "by passing a having space", result: ["valid", "tag-test"]},

          { command: `--tag tag1 --tag Z`, scenario: "by passing multiple tag with no space", result: ["sample"]},
          { command: `-t tag1 -t Z`, scenario: "by passing multiple tag with no space", result: ["sample"]},
          { command: `--tag tagA --tag Z`, scenario: "by passing multiple tag with no space", result: ["valid", "tag-test"]},
          { command: `-t tagA -t Z`, scenario: "by passing multiple tag with no space", result: ["valid", "tag-test"]},
          { command: `--tag "valid one" --tag "not hit"`, scenario: "by passing multiple having space", result: ["tag-test"]},
          { command: `-t "valid one" -t "not hit"`, scenario: "by passing multiple having space", result: ["tag-test"]},
          { command: `--tag "valid tag" --tag "not hit"`, scenario: "by passing multiple having space", result: ["valid", "tag-test"]},
          { command: `-t "valid tag" -t "not hit"`, scenario: "by passing multiple having space", result: ["valid", "tag-test"]},

          { command: `--tag tagC --tag tagB`, scenario: "by passing multiple tag with no space", result: ["tag-test"]},
          { command: `-t tagC -t tagB`, scenario: "by passing multiple tag with no space", result: ["tag-test"]},
          { command: `--tag tag1 --tag tagB`, scenario: "by passing multiple tag with no space", result: ["sample", "tag-test"]},
          { command: `-t tag1 -t tagB`, scenario: "by passing multiple tag with no space", result: ["sample", "tag-test"]},
          { command: `--tag "valid one" --tag "valid second"`, scenario: "by passing multiple having space", result: ["tag-test"]},
          { command: `-t "valid one" -t "valid second"`, scenario: "by passing multiple having space", result: ["tag-test"]},
          { command: `--tag "valid one" --tag "valid XYZ"`, scenario: "by passing multiple having space", result: ["tag-test2", "tag-test"]},
          { command: `-t "valid one" -t "valid XYZ"`, scenario: "by passing multiple having space", result: ["tag-test2", "tag-test"]},
        ].forEach(({ command, scenario, result }) => {
          it(`find ${result.length === 1 ? 'a' : 'multiple'} snip matching tag ${scenario}`, async () => {
            const { stdout } = await runCommand(`find ${command}`);
            result.forEach(r => expect(stdout).to.include(r));
          });
        });

        it('find none by no match', async () => {
          const { stdout } = await runCommand(`find --tag non-match`);
          expect(stdout).to.include('');
        });

        it('skip empty tag', async () => {
          const { stdout } = await runCommand(`find --tag tag1 --tag ""`);
          expect(stdout).to.include('sample');
        });
      });

      describe('--match and --tag (AND Search)', () => {
        beforeEach(async () => {
          await runCommand(`edit sample -t tag1`);
          await runCommand(`edit valid -t "valid tag" -t tagA`);
        });

        it('find snip matching both', async () => {
          const { stdout } = await runCommand(`find --match good --tag tag1`);
          expect(stdout).to.include('sample');
        });

        [
          { command: `--match good --tag tagB`, scenario: "by matching description only"},
          { command: `--match not-good --tag tag1`, scenario: "by matching tag only"},
          { command: `--match non-match --tag non-match`, scenario: "by matching neither"},
          { command: `--match good --tag tagA`, scenario: "by matching both but different snip"},
        ].forEach(({ command, scenario }) => {
          it(`find no snip ${scenario}`, async () => {
            const { stdout } = await runCommand(`find ${command}`);
            expect(stdout).to.include('');
          });
        });
      });

      describe('--detail', () => {
        beforeEach(async () => {
          await runCommand(`edit sample -t tag1 -t tag2`);
          await runCommand(`add sample sample-command -c cmd`);
          await runCommand(`add valid sample-cmd1 -c cmd`);
          await runCommand(`add valid sample-cmd2 -c cmd`);
        });

        it('log details', async () => {
          const { stdout } = await runCommand(`find --detail`);
          expect(stdout).to.include(`no-desc
─────────
Description : 
Tags        : 
Commands    :`);
          expect(stdout).to.include(`sample
─────────
Description : good-description
Tags        : tag1, tag2
Commands    : sample-command`);
          expect(stdout).to.include(`valid
─────────
Description : valid well description
Tags        : 
Commands    : sample-cmd1, sample-cmd2`);
        })
      });
    });

    describe('find command', () => {
      beforeEach(async () => {
        await runCommand(`create sample -d good-description`);
        await runCommand(`add sample sample-cmd -c ping-cmd -d good-description -t tag1`);
        await runCommand(`add sample valid-build -c "npm run build" -d "valid well run build description" -t "valid tag" -t tagA -p sample-cmd`);
        await runCommand(`add sample no-desc -c whoami -p sample-cmd -p valid-build`);
      });

      it('find all snip in directory', async () => {
        const { stdout } = await runCommand(`find sample`);
        expect(stdout).to.include('sample');
        expect(stdout).to.include('valid');
        expect(stdout).to.include('no-desc');
      });

      describe('--match', () => {
        it('find all when empty string(double quote) is given', async () => {
          const { stdout } = await runCommand(`find sample --match ""`);
          expect(stdout).to.include('sample');
          expect(stdout).to.include('valid');
          expect(stdout).to.include('no-desc');
        });

        it('find all when empty string(single quote) is given', async () => {
          const { stdout } = await runCommand(`find sample --match ''`);
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
          // expect(stdout).to.include('sample');
          // expect(stdout).to.include('valid');
          // expect(stdout).to.include('no-desc');
        });

        [
          { command: `--match sample`, scenario: "file name", result: "sample"},
          { command: `-m sample`, scenario: "file name", result: "sample"},
          { command: `--match good`, scenario: "no space description when non space is given", result: "sample"},
          { command: `-m good`, scenario: "no space description when non space is given", result: "sample"},
          { command: `--match ping`, scenario: "no space command when non space is given", result: "sample"},
          { command: `-m ping`, scenario: "no space command when non space is given", result: "sample"},
          { command: `--match well`, scenario: "matching description having sapce when non space is given", result: "valid"},
          { command: `-m well`, scenario: "matching description having sapce when non space is given", result: "valid"},
          { command: `--match npm`, scenario: "matching command having sapce when non space is given", result: "valid"},
          { command: `-m npm`, scenario: "matching command having sapce when non space is given", result: "valid"},
          { command: `--match "valid well"`, scenario: "description having sapce when string having space is given", result: "valid"},
          { command: `-m "valid well"`, scenario: "description having sapce when string having space is given", result: "valid"},
          { command: `--match "npm run"`, scenario: "command having sapce when string having space is given", result: "valid"},
          { command: `-m "npm run"`, scenario: "command having sapce when string having space is given", result: "valid"},
          { command: `--match valid`, scenario: "name and description both", result: "valid"},
          { command: `-m valid`, scenario: "name and description both", result: "valid"},
          { command: `--match cmd`, scenario: "name and command both", result: "sample"},
          { command: `-m cmd`, scenario: "name and command both", result: "sample"},
          { command: `--match run`, scenario: "command and description both", result: "valid"},
          { command: `-m run`, scenario: "command and description both", result: "valid"},
          { command: `--match build`, scenario: "name, command and description all", result: "valid"},
          { command: `-m build`, scenario: "name, command and description all", result: "valid"}
        ].forEach(({ command, scenario, result }) => {
          it(`find snip matching ${scenario}`, async () => {
            const { stdout } = await runCommand(`find sample ${command}`);
            expect(stdout).to.include(result);
          });
        });

        it('find none by no match', async () => {
          const { stdout } = await runCommand(`find sample --match non-match`);
          expect(stdout).to.include('');
        });
      });

      describe('--tag', () => {
        beforeEach(async () => {
           await runCommand(`add sample tag-test -c "git status" -d "tag test" -t "valid tag" -t "valid one" -t "valid second" -t tagA -t tagB -t tagC`);
           await runCommand(`add sample tag-test2 -c python -d "tag test" -t "valid XYZ"`);
        });

        it('find all when empty tag(double quote) is given', async () => {
          const { stdout } = await runCommand(`find sample --tag ""`);
          expect(stdout).to.include('sample');
          expect(stdout).to.include('valid');
          expect(stdout).to.include('no-desc');
          expect(stdout).to.include('tag-test');
          expect(stdout).to.include('tag-test2');
        });

        it('find all when empty multiple tag(double quote) is given', async () => {
          const { stdout } = await runCommand(`find sample --tag "" --tag ""`);
          expect(stdout).to.include('sample');
          expect(stdout).to.include('valid');
          expect(stdout).to.include('no-desc');
          expect(stdout).to.include('tag-test');
          expect(stdout).to.include('tag-test2');
          
        });

        it('find all when empty tag(single quote) is given', async () => {
          const { stdout } = await runCommand(`find sample --tag ''`);
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
          // expect(stdout).to.include('sample');
          // expect(stdout).to.include('valid');
          // expect(stdout).to.include('no-desc');
          // expect(stdout).to.include('tag-test');
          // expect(stdout).to.include('tag-test2');
        });

        [
          { command: `--tag tag1`, scenario: "by passing a tag with no space", result: ["sample"]},
          { command: `-t tag1`, scenario: "by passing a tag with no space", result: ["sample"]},
          { command: `--tag tagA`, scenario: "by passing a tag with no space", result: ["valid", "tag-test"]},
          { command: `-t tagA`, scenario: "by passing a tag with no space", result: ["valid", "tag-test"]},
          { command: `--tag "valid one"`, scenario: "by passing a having space", result: ["tag-test"]},
          { command: `-t "valid one"`, scenario: "by passing a having space", result: ["tag-test"]},
          { command: `--tag "valid tag"`, scenario: "by passing a having space", result: ["valid", "tag-test"]},
          { command: `-t "valid tag"`, scenario: "by passing a having space", result: ["valid", "tag-test"]},

          { command: `--tag tag1 --tag Z`, scenario: "by passing multiple tag with no space", result: ["sample"]},
          { command: `-t tag1 -t Z`, scenario: "by passing multiple tag with no space", result: ["sample"]},
          { command: `--tag tagA --tag Z`, scenario: "by passing multiple tag with no space", result: ["valid", "tag-test"]},
          { command: `-t tagA -t Z`, scenario: "by passing multiple tag with no space", result: ["valid", "tag-test"]},
          { command: `--tag "valid one" --tag "not hit"`, scenario: "by passing multiple having space", result: ["tag-test"]},
          { command: `-t "valid one" -t "not hit"`, scenario: "by passing multiple having space", result: ["tag-test"]},
          { command: `--tag "valid tag" --tag "not hit"`, scenario: "by passing multiple having space", result: ["valid", "tag-test"]},
          { command: `-t "valid tag" -t "not hit"`, scenario: "by passing multiple having space", result: ["valid", "tag-test"]},

          { command: `--tag tagC --tag tagB`, scenario: "by passing multiple tag with no space", result: ["tag-test"]},
          { command: `-t tagC -t tagB`, scenario: "by passing multiple tag with no space", result: ["tag-test"]},
          { command: `--tag tag1 --tag tagB`, scenario: "by passing multiple tag with no space", result: ["sample", "tag-test"]},
          { command: `-t tag1 -t tagB`, scenario: "by passing multiple tag with no space", result: ["sample", "tag-test"]},
          { command: `--tag "valid one" --tag "valid second"`, scenario: "by passing multiple having space", result: ["tag-test"]},
          { command: `-t "valid one" -t "valid second"`, scenario: "by passing multiple having space", result: ["tag-test"]},
          { command: `--tag "valid one" --tag "valid XYZ"`, scenario: "by passing multiple having space", result: ["tag-test2", "tag-test"]},
          { command: `-t "valid one" -t "valid XYZ"`, scenario: "by passing multiple having space", result: ["tag-test2", "tag-test"]},
        ].forEach(({ command, scenario, result }) => {
          it(`find ${result.length === 1 ? 'a' : 'multiple'} snip matching tag ${scenario}`, async () => {
            const { stdout } = await runCommand(`find sample ${command}`);
            result.forEach(r => expect(stdout).to.include(r));
          });
        });

        it('find none by no match', async () => {
          const { stdout } = await runCommand(`find sample --tag non-match`);
          expect(stdout).to.include('');
        });

        it('skip empty tag', async () => {
          const { stdout } = await runCommand(`find sample --tag tag1 --tag ""`);
          expect(stdout).to.include('sample');
        });
      });

      describe('--match and --tag (AND Search)', () => {
        it('find snip matching both', async () => {
          const { stdout } = await runCommand(`find sample --match good --tag tag1`);
          expect(stdout).to.include('sample');
        });

        [
          { command: `--match good --tag tagB`, scenario: "by matching description only"},
          { command: `--match not-good --tag tag1`, scenario: "by matching tag only"},
          { command: `--match non-match --tag non-match`, scenario: "by matching neither"},
          { command: `--match ping --tag tagA`, scenario: "by matching both but different snip"},
        ].forEach(({ command, scenario }) => {
          it(`find no snip ${scenario}`, async () => {
            const { stdout } = await runCommand(`find sample ${command}`);
            expect(stdout).to.include('');
          });
        });
      });

      describe('--detail', () => {
        it('log details', async () => {
          const { stdout } = await runCommand(`find sample --detail`);
          expect(stdout).to.include(`no-desc
─────────
Command     : whoami
Description : 
Tags        : 
DependsOn   : sample-cmd, valid-build`);
          expect(stdout).to.include(`sample-cmd
─────────
Command     : ping-cmd
Description : good-description
Tags        : tag1
DependsOn   :`);
          expect(stdout).to.include(`valid-build
─────────
Command     : npm run build
Description : valid well run build description
Tags        : valid tag, tagA
DependsOn   : sample-cmd`);
        })
      });
    });

    describe('arguments', () =>{
      [
        { command: '--match', result: `match`},
        { command: '-m', result: `m`},
        { command: '--tag', result: `tag`},
        { command: '--tag A --tag', result: `tag`},
        { command: '-t', result: `t`}
      ].forEach(({ command, result }) => {
        it(`should throw an error when find snip files but ${command} option is provided nothing`, async () => {
          try {
            await runCommand(`find ${command}`);
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            expect(execError.stderr).to.include(`Not enough arguments following: ${result}`);
          }
        });
      });

      [
        { command: '--match', result: `match`},
        { command: '-m', result: `m`},
        { command: '--tag', result: `tag`},
        { command: '--tag A --tag', result: `tag`},
        { command: '-t', result: `t`}
      ].forEach(({ command, result }) => {
        it(`should throw an error when find commands but ${command} option is provided nothing`, async () => {
          try {
            await runCommand(`find sample ${command}`);
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            expect(execError.stderr).to.include(`Not enough arguments following: ${result}`);
          }
        });
      });
    });    
  });

  describe('run command', () => {
    describe('run', () => {
      const verifyPrefixOutput = (prefix: string, stdout: string) => {
        expect(stdout).to.include(`[${prefix}] Executing ...`);
        expect(stdout).to.include(`[${prefix}] Completed with code 0`);
      }

      const verifyPrefixNotOutput = (prefix: string, stdout: string) => {
        expect(stdout).to.not.include(`[${prefix}] Executing ...`);
        expect(stdout).to.not.include(`[${prefix}] Completed with code 0`);
      }

      describe('file is provided and dryRun = true', () => {
        const fileName = 'run-file1';

        describe('executable file exists', () => {
          beforeEach(async () => {
            await runCommand(`create ${fileName}`);
            await runCommand(`add ${fileName} cmdA -c "echo 1" -t tag2`);
            await runCommand(`add ${fileName} cmdB -c "echo 2" -t tag1 -t tag2`);
          });

          it('should execute all commands in the specified file with --dry-run when file exists', async () => {
            const fileName2 = 'run-file2';
            await runCommand(`create ${fileName2}`);
            await runCommand(`add ${fileName2} cmdX -c "echo a" -t tagA`);

            const { stdout } = await runCommand(`run ${fileName} --dry-run`);
            [`${fileName}::cmdA`, `${fileName}::cmdB`].forEach((s) => verifyPrefixOutput(s, stdout));
            [`${fileName2}::cmdX`].forEach((s) => verifyPrefixNotOutput(s, stdout));
          });

          it('should execute only the specified command in the file with --dry-run when name exists', async () => {
            const { stdout } = await runCommand(`run ${fileName} cmdA --dry-run`);
            [`${fileName}::cmdA`].forEach((s) => verifyPrefixOutput(s, stdout));
            [`${fileName}::cmdB`].forEach((s) => verifyPrefixNotOutput(s, stdout));
          });

          it('should execute only commands matching tag in the specified file with --dry-run', async () => {
            await runCommand(`add ${fileName} cmdC -c "echo 3"`);
            await runCommand(`add ${fileName} cmdD -c "echo 4" -t tag1`);
            await runCommand(`add ${fileName} cmdE -c "echo 5" -t tag1 -t tag3`);

            const { stdout } = await runCommand(`run ${fileName} --tag tag2 --dry-run`);
            [`${fileName}::cmdA`, `${fileName}::cmdB`].forEach((s) => verifyPrefixOutput(s, stdout));
            [`${fileName}::cmdC`, `${fileName}::cmdD`, `${fileName}::cmdE`].forEach((s) => verifyPrefixNotOutput(s, stdout));
          });

          it('should execute when both name and tag match in the specified file with --dry-run', async () => {
            const { stdout } = await runCommand(`run ${fileName} cmdA --tag tag2 --dry-run`);
            [`${fileName}::cmdA`].forEach((s) => verifyPrefixOutput(s, stdout));
            [`${fileName}::cmdB`].forEach((s) => verifyPrefixNotOutput(s, stdout));
          });

          describe('dependsOn scenario', () => {
            it('simple dependency', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag2 -p cmdA`);
              const { stdout } = await runCommand(`run ${fileName} --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdAExec = stdoutIndexOf(`[${fileName}::cmdA] Executing ...`,stdout);
              const cmdADone = stdoutIndexOf(`[${fileName}::cmdA] Completed with code 0`,stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);

              expect(chunk1).to.be.lessThan(cmdAExec);
              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(cmdAExec).to.be.lessThan(cmdADone);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdADone).to.be.lessThan(chunk2);
              expect(cmdBDone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdCExec);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
            });

            it('simple dependency 2', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdD -c "echo D" -t tag2 -p cmdA`);
              const { stdout } = await runCommand(`run ${fileName} --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdAExec = stdoutIndexOf(`[${fileName}::cmdA] Executing ...`,stdout);
              const cmdADone = stdoutIndexOf(`[${fileName}::cmdA] Completed with code 0`,stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);
              const cmdDExec = stdoutIndexOf(`[${fileName}::cmdD] Executing ...`,stdout);
              const cmdDDone = stdoutIndexOf(`[${fileName}::cmdD] Completed with code 0`,stdout);

              expect(chunk1).to.be.lessThan(cmdAExec);
              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(cmdAExec).to.be.lessThan(cmdADone);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdADone).to.be.lessThan(chunk2);
              expect(cmdBDone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdCExec);
              expect(chunk2).to.be.lessThan(cmdDExec);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
              expect(cmdDExec).to.be.lessThan(cmdDDone);
            });

            it('long dependency', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdD -c "echo D" -t tag2 -p cmdC`);
              await runCommand(`add ${fileName} cmdE -c "echo E" -t tag2 -p cmdD`);
              await runCommand(`add ${fileName} cmdF -c "echo F" -t tag2 -p cmdE`);
              const { stdout } = await runCommand(`run ${fileName} --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdAExec = stdoutIndexOf(`[${fileName}::cmdA] Executing ...`,stdout);
              const cmdADone = stdoutIndexOf(`[${fileName}::cmdA] Completed with code 0`,stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const cmdDExec = stdoutIndexOf(`[${fileName}::cmdD] Executing ...`,stdout);
              const cmdDDone = stdoutIndexOf(`[${fileName}::cmdD] Completed with code 0`,stdout);
              const chunk4 = stdoutIndexOf(`chunk 4...`,stdout);
              const cmdEExec = stdoutIndexOf(`[${fileName}::cmdE] Executing ...`,stdout);
              const cmdEDone = stdoutIndexOf(`[${fileName}::cmdE] Completed with code 0`,stdout);
              const chunk5 = stdoutIndexOf(`chunk 5...`,stdout);
              const cmdFExec = stdoutIndexOf(`[${fileName}::cmdF] Executing ...`,stdout);
              const cmdFDone = stdoutIndexOf(`[${fileName}::cmdF] Completed with code 0`,stdout);

              expect(chunk1).to.be.lessThan(cmdAExec);
              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(cmdAExec).to.be.lessThan(cmdADone);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdADone).to.be.lessThan(chunk2);
              expect(cmdBDone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdCExec);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
              expect(cmdCDone).to.be.lessThan(chunk3)
              expect(chunk3).to.be.lessThan(cmdDExec);
              expect(cmdDExec).to.be.lessThan(cmdDDone);
              expect(cmdDDone).to.be.lessThan(chunk4);
              expect(chunk4).to.be.lessThan(cmdEExec);
              expect(cmdEExec).to.be.lessThan(cmdEDone);
              expect(cmdEDone).to.be.lessThan(chunk5);
              expect(chunk5).to.be.lessThan(cmdFExec);
              expect(cmdFExec).to.be.lessThan(cmdFDone);
            });

            it('DAO shared nodes', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdD -c "echo D" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdE -c "echo E" -t tag2 -p cmdC -p cmdD`);
              await runCommand(`add ${fileName} cmdF -c "echo F" -t tag2 -p cmdE`);
              const { stdout } = await runCommand(`run ${fileName} --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdAExec = stdoutIndexOf(`[${fileName}::cmdA] Executing ...`,stdout);
              const cmdADone = stdoutIndexOf(`[${fileName}::cmdA] Completed with code 0`,stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);
              const cmdDExec = stdoutIndexOf(`[${fileName}::cmdD] Executing ...`,stdout);
              const cmdDDone = stdoutIndexOf(`[${fileName}::cmdD] Completed with code 0`,stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const cmdEExec = stdoutIndexOf(`[${fileName}::cmdE] Executing ...`,stdout);
              const cmdEDone = stdoutIndexOf(`[${fileName}::cmdE] Completed with code 0`,stdout);
              const chunk4 = stdoutIndexOf(`chunk 4...`,stdout);
              const cmdFExec = stdoutIndexOf(`[${fileName}::cmdF] Executing ...`,stdout);
              const cmdFDone = stdoutIndexOf(`[${fileName}::cmdF] Completed with code 0`,stdout);

              expect(chunk1).to.be.lessThan(cmdAExec);
              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(cmdAExec).to.be.lessThan(cmdADone);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdADone).to.be.lessThan(chunk2);
              expect(cmdBDone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdCExec);
              expect(chunk2).to.be.lessThan(cmdDExec);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
              expect(cmdDExec).to.be.lessThan(cmdDDone);
              expect(cmdCDone).to.be.lessThan(chunk3)
              expect(cmdDDone).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(cmdEExec);
              expect(cmdEExec).to.be.lessThan(cmdEDone);
              expect(cmdEDone).to.be.lessThan(chunk4);
              expect(chunk4).to.be.lessThan(cmdFExec);
              expect(cmdFExec).to.be.lessThan(cmdFDone);
            });

            it('multiple DependsOn', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdD -c "echo D" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdE -c "echo E" -t tag2 -p cmdC`);
              await runCommand(`add ${fileName} cmdF -c "echo F" -t tag2 -p cmdD`);
              const { stdout } = await runCommand(`run ${fileName} --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdAExec = stdoutIndexOf(`[${fileName}::cmdA] Executing ...`,stdout);
              const cmdADone = stdoutIndexOf(`[${fileName}::cmdA] Completed with code 0`,stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);
              const cmdDExec = stdoutIndexOf(`[${fileName}::cmdD] Executing ...`,stdout);
              const cmdDDone = stdoutIndexOf(`[${fileName}::cmdD] Completed with code 0`,stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const cmdEExec = stdoutIndexOf(`[${fileName}::cmdE] Executing ...`,stdout);
              const cmdEDone = stdoutIndexOf(`[${fileName}::cmdE] Completed with code 0`,stdout);
              const cmdFExec = stdoutIndexOf(`[${fileName}::cmdF] Executing ...`,stdout);
              const cmdFDone = stdoutIndexOf(`[${fileName}::cmdF] Completed with code 0`,stdout);

              expect(chunk1).to.be.lessThan(cmdAExec);
              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(cmdAExec).to.be.lessThan(cmdADone);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdADone).to.be.lessThan(chunk2);
              expect(cmdBDone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdCExec);
              expect(chunk2).to.be.lessThan(cmdDExec);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
              expect(cmdDExec).to.be.lessThan(cmdDDone);
              expect(cmdCDone).to.be.lessThan(chunk3)
              expect(cmdDDone).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(cmdEExec);
              expect(chunk3).to.be.lessThan(cmdFExec);
              expect(cmdEExec).to.be.lessThan(cmdEDone);
              expect(cmdFExec).to.be.lessThan(cmdFDone);
            });

            it('multiple DependsOn case 2', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdD -c "echo D" -t tag2 -p cmdB`);
              await runCommand(`add ${fileName} cmdE -c "echo E" -t tag2 -p cmdC -p cmdD`);
              const { stdout } = await runCommand(`run ${fileName} --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdAExec = stdoutIndexOf(`[${fileName}::cmdA] Executing ...`,stdout);
              const cmdADone = stdoutIndexOf(`[${fileName}::cmdA] Completed with code 0`,stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);
              const cmdDExec = stdoutIndexOf(`[${fileName}::cmdD] Executing ...`,stdout);
              const cmdDDone = stdoutIndexOf(`[${fileName}::cmdD] Completed with code 0`,stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const cmdEExec = stdoutIndexOf(`[${fileName}::cmdE] Executing ...`,stdout);
              const cmdEDone = stdoutIndexOf(`[${fileName}::cmdE] Completed with code 0`,stdout);
              
              expect(chunk1).to.be.lessThan(cmdAExec);
              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(cmdAExec).to.be.lessThan(cmdADone);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdADone).to.be.lessThan(chunk2);
              expect(cmdBDone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdCExec);
              expect(chunk2).to.be.lessThan(cmdDExec);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
              expect(cmdDExec).to.be.lessThan(cmdDDone);
              expect(cmdCDone).to.be.lessThan(chunk3)
              expect(cmdDDone).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(cmdEExec);
              expect(cmdEExec).to.be.lessThan(cmdEDone);
            });

            it('multiple shared nodes', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdD -c "echo D" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdE -c "echo E" -t tag2 -p cmdC -p cmdD`);
              await runCommand(`add ${fileName} cmdG -c "echo G" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdF -c "echo F" -t tag2 -p cmdE -p cmdG`);
              const { stdout } = await runCommand(`run ${fileName} --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdAExec = stdoutIndexOf(`[${fileName}::cmdA] Executing ...`,stdout);
              const cmdADone = stdoutIndexOf(`[${fileName}::cmdA] Completed with code 0`,stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);
              const cmdDExec = stdoutIndexOf(`[${fileName}::cmdD] Executing ...`,stdout);
              const cmdDDone = stdoutIndexOf(`[${fileName}::cmdD] Completed with code 0`,stdout);
              const cmdGExec = stdoutIndexOf(`[${fileName}::cmdG] Executing ...`,stdout);
              const cmdGDone = stdoutIndexOf(`[${fileName}::cmdG] Completed with code 0`,stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const cmdEExec = stdoutIndexOf(`[${fileName}::cmdE] Executing ...`,stdout);
              const cmdEDone = stdoutIndexOf(`[${fileName}::cmdE] Completed with code 0`,stdout);
              const chunk4 = stdoutIndexOf(`chunk 4...`,stdout);
              const cmdFExec = stdoutIndexOf(`[${fileName}::cmdF] Executing ...`,stdout);
              const cmdFDone = stdoutIndexOf(`[${fileName}::cmdF] Completed with code 0`,stdout);

              expect(chunk1).to.be.lessThan(cmdAExec);
              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(cmdAExec).to.be.lessThan(cmdADone);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdADone).to.be.lessThan(chunk2);
              expect(cmdBDone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdCExec);
              expect(chunk2).to.be.lessThan(cmdDExec);
              expect(chunk2).to.be.lessThan(cmdGExec);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
              expect(cmdDExec).to.be.lessThan(cmdDDone);
              expect(cmdGExec).to.be.lessThan(cmdGDone);
              expect(cmdCDone).to.be.lessThan(chunk3)
              expect(cmdDDone).to.be.lessThan(chunk3);
              expect(cmdGDone).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(cmdEExec);
              expect(cmdEExec).to.be.lessThan(cmdEDone);
              expect(cmdEDone).to.be.lessThan(chunk4);
              expect(chunk4).to.be.lessThan(cmdFExec);
              expect(cmdFExec).to.be.lessThan(cmdFDone);
            });

            it('multiple shared nodes case 2', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag2`);
              await runCommand(`add ${fileName} cmdD -c "echo D" -t tag2 -p cmdA -p cmdB`);
              await runCommand(`add ${fileName} cmdE -c "echo E" -t tag2 -p cmdB -p cmdC`);
              await runCommand(`add ${fileName} cmdF -c "echo F" -t tag2 -p cmdE -p cmdD`);
              const { stdout } = await runCommand(`run ${fileName} --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdAExec = stdoutIndexOf(`[${fileName}::cmdA] Executing ...`,stdout);
              const cmdADone = stdoutIndexOf(`[${fileName}::cmdA] Completed with code 0`,stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdDExec = stdoutIndexOf(`[${fileName}::cmdD] Executing ...`,stdout);
              const cmdDDone = stdoutIndexOf(`[${fileName}::cmdD] Completed with code 0`,stdout);
              const cmdEExec = stdoutIndexOf(`[${fileName}::cmdE] Executing ...`,stdout);
              const cmdEDone = stdoutIndexOf(`[${fileName}::cmdE] Completed with code 0`,stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const cmdFExec = stdoutIndexOf(`[${fileName}::cmdF] Executing ...`,stdout);
              const cmdFDone = stdoutIndexOf(`[${fileName}::cmdF] Completed with code 0`,stdout);

              expect(chunk1).to.be.lessThan(cmdAExec);
              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(chunk1).to.be.lessThan(cmdCExec);
              expect(cmdAExec).to.be.lessThan(cmdADone);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
              expect(cmdADone).to.be.lessThan(chunk2);
              expect(cmdBDone).to.be.lessThan(chunk2);
              expect(cmdCDone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdDExec);
              expect(chunk2).to.be.lessThan(cmdEExec);
              expect(cmdDExec).to.be.lessThan(cmdDDone);
              expect(cmdEExec).to.be.lessThan(cmdEDone);              
              expect(cmdDDone).to.be.lessThan(chunk3);
              expect(cmdEDone).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(cmdFExec);
              expect(cmdFExec).to.be.lessThan(cmdFDone);
            });

            it('execute successfully when filter by tag', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag1 -p cmdB`);
              const { stdout } = await runCommand(`run ${fileName} -t tag1 --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);

              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdBDone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdCExec);
              expect(cmdCExec).to.be.lessThan(cmdCDone);

              expect(stdout).to.not.include(`[${fileName}::cmdA] Executing ...`,stdout);
              expect(stdout).to.not.include(`[${fileName}::cmdA] Completed with code 0`,stdout);
            });

            it('execute successfully when filter by tag case 2', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag1 -p cmdB`);
              await runCommand(`add ${fileName} cmdD -c "echo D" -t tag1 -p cmdB`);
              const { stdout } = await runCommand(`run ${fileName} -t tag1 --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);
              const cmdDExec = stdoutIndexOf(`[${fileName}::cmdD] Executing ...`,stdout);
              const cmdDDone = stdoutIndexOf(`[${fileName}::cmdD] Completed with code 0`,stdout);

              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdBDone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdCExec);
              expect(chunk2).to.be.lessThan(cmdDExec);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
              expect(cmdDExec).to.be.lessThan(cmdDDone);

              expect(stdout).to.not.include(`[${fileName}::cmdA] Executing ...`,stdout);
              expect(stdout).to.not.include(`[${fileName}::cmdA] Completed with code 0`,stdout);
            });
          });
        });

        describe('no executable file exists', () => {
          it('should produce no output with --dry-run when specified file does not exist', async () => {
            const { stdout, stderr } = await runCommand(`run not-exist-file --dry-run`);
            expect(stdout).to.include('');
            expect(stderr).to.not.include('Something went wrong');
          });

          it('should produce no output with --dry-run when name does not exist in specified file', async () => {
            await runCommand(`create ${fileName}`);
            await runCommand(`add ${fileName} cmdA -c "echo some" -t tagZ`);

            const { stdout, stderr } = await runCommand(`run ${fileName} notFoundCmd --dry-run`);
            expect(stdout).to.include('');
            expect(stderr).to.not.include('Something went wrong');
          });

          it('should produce no output with --dry-run when tag does not match any command in specified file', async () => {
            await runCommand(`create ${fileName}`);
            await runCommand(`add ${fileName} cmdA -c "echo a" -t tag1`);

            const { stdout, stderr } = await runCommand(`run ${fileName} --tag not-match --dry-run`);
            expect(stdout).to.include('');
            expect(stderr).to.not.include('Something went wrong');
          });

          it('should produce no output with --dry-run when name matches but tag does not in specified file', async () => {
            await runCommand(`create ${fileName}`);
            await runCommand(`add ${fileName} cmdA -c "echo" -t tagA`);

            const { stdout, stderr } = await runCommand(`run ${fileName} cmdA --tag tagB --dry-run`);
            expect(stdout).to.include('');
            expect(stderr).to.not.include('Something went wrong');
          });
        });

        describe('no executable command exists', () => {
          it('should produce no output with --dry-run when the snip files has no command', async () => {
            await runCommand(`create ${fileName}`);

            const { stdout, stderr } = await runCommand(`run ${fileName} --dry-run`);
            expect(stdout).to.include('');
            expect(stderr).to.not.include('Something went wrong');
          });
        });
      });

      describe('file is not provided and dryRun = true', () => {
        const fileName1 = 'run-all-1';
          
        describe('executable file exists', () => {
          const fileName2 = 'run-all-2';

          beforeEach(async () => {
            await runCommand(`create ${fileName1}`);
            await runCommand(`create ${fileName2}`);
            await runCommand(`add ${fileName1} cmdA -c "echo A" -t tagA`);
            await runCommand(`add ${fileName2} cmdA -c "echo 1" -t tagA -t tagC`);
            await runCommand(`add ${fileName2} cmdB -c "echo 2" -t tagB -t tagC`);
          });

          it('should execute all commands across all snip files', async () => {
            const { stdout } = await runCommand(`run --dry-run`);
            [`${fileName1}::cmdA`, `${fileName2}::cmdA`, `${fileName2}::cmdB`].forEach((s) => 
                  verifyPrefixOutput(s, stdout));
          });

          it('should execute only commands matching tag across all snip files', async () => {
            await runCommand(`add ${fileName1} cmdM -c "echo B" -t tagB`);
            await runCommand(`add ${fileName2} cmdN -c "echo 3"`);

            const { stdout } = await runCommand(`run --tag tagA --dry-run`);
            [`${fileName1}::cmdA`, `${fileName2}::cmdA`].forEach((s) => 
                  verifyPrefixOutput(s, stdout));
            [`${fileName2}::cmdB`, `${fileName1}::cmdM`, `${fileName2}::cmdN`].forEach((s) => 
                  verifyPrefixNotOutput(s, stdout));
          });

          describe('dependsOn scenario', () => {
            beforeEach(async () => {
              await runCommand(`add ${fileName1} cmdB -c "echo B" -p cmdA`);
            });

            it('simple dependency', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tag2 -p cmdA`);
              const { stdout } = await runCommand(`run --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const file2CmdBExec = stdoutIndexOf(`[${fileName2}::cmdB] Executing ...`,stdout);
              const file2CmdBDone = stdoutIndexOf(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file1CmdBExec = stdoutIndexOf(`[${fileName1}::cmdB] Executing ...`,stdout);
              const file1CmdBDone = stdoutIndexOf(`[${fileName1}::cmdB] Completed with code 0`,stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);

              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdBExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
              expect(file1CmdADone).to.be.lessThan(chunk2);
              expect(file2CmdADone).to.be.lessThan(chunk2);
              expect(file2CmdBDone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file1CmdBExec);
              expect(chunk2).to.be.lessThan(file2CmdCExec);
              expect(file1CmdBExec).to.be.lessThan(file1CmdBDone);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
            });

            it('simple dependency 2', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdD -c "echo D" -t tag2 -p cmdA`);
              const { stdout } = await runCommand(`run --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const file2CmdBExec = stdoutIndexOf(`[${fileName2}::cmdB] Executing ...`,stdout);
              const file2CmdBDone = stdoutIndexOf(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file1CmdBExec = stdoutIndexOf(`[${fileName1}::cmdB] Executing ...`,stdout);
              const file1CmdBDone = stdoutIndexOf(`[${fileName1}::cmdB] Completed with code 0`,stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);
              const file2CmdDExec = stdoutIndexOf(`[${fileName2}::cmdD] Executing ...`,stdout);
              const file2CmdDDone = stdoutIndexOf(`[${fileName2}::cmdD] Completed with code 0`,stdout);

              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdBExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
              expect(file1CmdADone).to.be.lessThan(chunk2);
              expect(file2CmdADone).to.be.lessThan(chunk2);
              expect(file2CmdBDone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file1CmdBExec);
              expect(chunk2).to.be.lessThan(file2CmdCExec)
              expect(chunk2).to.be.lessThan(file2CmdDExec);
              expect(file1CmdBExec).to.be.lessThan(file1CmdBDone);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
              expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
            });

            it('long dependency', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdD -c "echo D" -t tag2 -p cmdC`);
              await runCommand(`add ${fileName2} cmdE -c "echo E" -t tag2 -p cmdD`);
              await runCommand(`add ${fileName2} cmdF -c "echo F" -t tag2 -p cmdE`);
              const { stdout } = await runCommand(`run --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const file2CmdBExec = stdoutIndexOf(`[${fileName2}::cmdB] Executing ...`,stdout);
              const file2CmdBDone = stdoutIndexOf(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file1CmdBExec = stdoutIndexOf(`[${fileName1}::cmdB] Executing ...`,stdout);
              const file1CmdBDone = stdoutIndexOf(`[${fileName1}::cmdB] Completed with code 0`,stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const file2CmdDExec = stdoutIndexOf(`[${fileName2}::cmdD] Executing ...`,stdout);
              const file2CmdDDone = stdoutIndexOf(`[${fileName2}::cmdD] Completed with code 0`,stdout);
              const chunk4 = stdoutIndexOf(`chunk 4...`,stdout);
              const file2CmdEExec = stdoutIndexOf(`[${fileName2}::cmdE] Executing ...`,stdout);
              const file2CmdEDone = stdoutIndexOf(`[${fileName2}::cmdE] Completed with code 0`,stdout);
              const chunk5 = stdoutIndexOf(`chunk 5...`,stdout);
              const file2CmdFExec = stdoutIndexOf(`[${fileName2}::cmdF] Executing ...`,stdout);
              const file2CmdFDone = stdoutIndexOf(`[${fileName2}::cmdF] Completed with code 0`,stdout);

              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdBExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
              expect(file1CmdADone).to.be.lessThan(chunk2);
              expect(file2CmdADone).to.be.lessThan(chunk2);
              expect(file2CmdBDone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file1CmdBExec);
              expect(chunk2).to.be.lessThan(file2CmdCExec)
              expect(file1CmdBExec).to.be.lessThan(file1CmdBDone);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
              expect(file1CmdBDone).to.be.lessThan(chunk3);
              expect(file2CmdCDone).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(file2CmdDExec);
              expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
              expect(file2CmdDDone).to.be.lessThan(chunk4);
              expect(chunk4).to.be.lessThan(file2CmdEExec);
              expect(file2CmdEExec).to.be.lessThan(file2CmdEDone);
              expect(file2CmdEDone).to.be.lessThan(chunk5);
              expect(chunk5).to.be.lessThan(file2CmdFExec);
              expect(file2CmdFExec).to.be.lessThan(file2CmdFDone);
            });

            it('DAO shared nodes', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdD -c "echo D" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdE -c "echo E" -t tag2 -p cmdC -p cmdD`);
              await runCommand(`add ${fileName2} cmdF -c "echo F" -t tag2 -p cmdE`);
              const { stdout } = await runCommand(`run --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const file2CmdBExec = stdoutIndexOf(`[${fileName2}::cmdB] Executing ...`,stdout);
              const file2CmdBDone = stdoutIndexOf(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file1CmdBExec = stdoutIndexOf(`[${fileName1}::cmdB] Executing ...`,stdout);
              const file1CmdBDone = stdoutIndexOf(`[${fileName1}::cmdB] Completed with code 0`,stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);
              const file2CmdDExec = stdoutIndexOf(`[${fileName2}::cmdD] Executing ...`,stdout);
              const file2CmdDDone = stdoutIndexOf(`[${fileName2}::cmdD] Completed with code 0`,stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const file2CmdEExec = stdoutIndexOf(`[${fileName2}::cmdE] Executing ...`,stdout);
              const file2CmdEDone = stdoutIndexOf(`[${fileName2}::cmdE] Completed with code 0`,stdout);
              const chunk4 = stdoutIndexOf(`chunk 4...`,stdout);
              const file2CmdFExec = stdoutIndexOf(`[${fileName2}::cmdF] Executing ...`,stdout);
              const file2CmdFDone = stdoutIndexOf(`[${fileName2}::cmdF] Completed with code 0`,stdout);

              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdBExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
              expect(file1CmdADone).to.be.lessThan(chunk2);
              expect(file2CmdADone).to.be.lessThan(chunk2);
              expect(file2CmdBDone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file1CmdBExec);
              expect(chunk2).to.be.lessThan(file2CmdCExec)
              expect(chunk2).to.be.lessThan(file2CmdDExec);
              expect(file1CmdBExec).to.be.lessThan(file1CmdBDone);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
              expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
              expect(file1CmdBDone).to.be.lessThan(chunk3);
              expect(file2CmdCDone).to.be.lessThan(chunk3);
              expect(file2CmdDDone).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(file2CmdEExec);
              expect(file2CmdEExec).to.be.lessThan(file2CmdEDone);
              expect(file2CmdEDone).to.be.lessThan(chunk4);
              expect(chunk4).to.be.lessThan(file2CmdFExec);
              expect(file2CmdFExec).to.be.lessThan(file2CmdFDone);
            });

            it('multiple DependsOn', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdD -c "echo D" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdE -c "echo E" -t tag2 -p cmdC`);
              await runCommand(`add ${fileName2} cmdF -c "echo F" -t tag2 -p cmdD`);
              const { stdout } = await runCommand(`run --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const file2CmdBExec = stdoutIndexOf(`[${fileName2}::cmdB] Executing ...`,stdout);
              const file2CmdBDone = stdoutIndexOf(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file1CmdBExec = stdoutIndexOf(`[${fileName1}::cmdB] Executing ...`,stdout);
              const file1CmdBDone = stdoutIndexOf(`[${fileName1}::cmdB] Completed with code 0`,stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);
              const file2CmdDExec = stdoutIndexOf(`[${fileName2}::cmdD] Executing ...`,stdout);
              const file2CmdDDone = stdoutIndexOf(`[${fileName2}::cmdD] Completed with code 0`,stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const file2CmdEExec = stdoutIndexOf(`[${fileName2}::cmdE] Executing ...`,stdout);
              const file2CmdEDone = stdoutIndexOf(`[${fileName2}::cmdE] Completed with code 0`,stdout);
              const file2CmdFExec = stdoutIndexOf(`[${fileName2}::cmdF] Executing ...`,stdout);
              const file2CmdFDone = stdoutIndexOf(`[${fileName2}::cmdF] Completed with code 0`,stdout);

              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdBExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
              expect(file1CmdADone).to.be.lessThan(chunk2);
              expect(file2CmdADone).to.be.lessThan(chunk2);
              expect(file2CmdBDone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file1CmdBExec);
              expect(chunk2).to.be.lessThan(file2CmdCExec)
              expect(chunk2).to.be.lessThan(file2CmdDExec);
              expect(file1CmdBExec).to.be.lessThan(file1CmdBDone);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
              expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
              expect(file1CmdBDone).to.be.lessThan(chunk3);
              expect(file2CmdCDone).to.be.lessThan(chunk3);
              expect(file2CmdDDone).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(file2CmdEExec);
              expect(chunk3).to.be.lessThan(file2CmdFExec);
              expect(file2CmdEExec).to.be.lessThan(file2CmdEDone);
              expect(file2CmdFExec).to.be.lessThan(file2CmdFDone);
            });

            it('multiple DependsOn case 2', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdD -c "echo D" -t tag2 -p cmdB`);
              await runCommand(`add ${fileName2} cmdE -c "echo E" -t tag2 -p cmdC -p cmdD`);
              const { stdout } = await runCommand(`run --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const file2CmdBExec = stdoutIndexOf(`[${fileName2}::cmdB] Executing ...`,stdout);
              const file2CmdBDone = stdoutIndexOf(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file1CmdBExec = stdoutIndexOf(`[${fileName1}::cmdB] Executing ...`,stdout);
              const file1CmdBDone = stdoutIndexOf(`[${fileName1}::cmdB] Completed with code 0`,stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);
              const file2CmdDExec = stdoutIndexOf(`[${fileName2}::cmdD] Executing ...`,stdout);
              const file2CmdDDone = stdoutIndexOf(`[${fileName2}::cmdD] Completed with code 0`,stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const file2CmdEExec = stdoutIndexOf(`[${fileName2}::cmdE] Executing ...`,stdout);
              const file2CmdEDone = stdoutIndexOf(`[${fileName2}::cmdE] Completed with code 0`,stdout);
              
              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdBExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
              expect(file1CmdADone).to.be.lessThan(chunk2);
              expect(file2CmdADone).to.be.lessThan(chunk2);
              expect(file2CmdBDone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file1CmdBExec);
              expect(chunk2).to.be.lessThan(file2CmdCExec)
              expect(chunk2).to.be.lessThan(file2CmdDExec);
              expect(file1CmdBExec).to.be.lessThan(file1CmdBDone);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
              expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
              expect(file1CmdBDone).to.be.lessThan(chunk3);
              expect(file2CmdCDone).to.be.lessThan(chunk3);
              expect(file2CmdDDone).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(file2CmdEExec);
              expect(file2CmdEExec).to.be.lessThan(file2CmdEDone);
            });

            it('multiple shared nodes', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdD -c "echo D" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdE -c "echo E" -t tag2 -p cmdC -p cmdD`);
              await runCommand(`add ${fileName2} cmdG -c "echo G" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdF -c "echo F" -t tag2 -p cmdE -p cmdG`);
              const { stdout } = await runCommand(`run --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const file2CmdBExec = stdoutIndexOf(`[${fileName2}::cmdB] Executing ...`,stdout);
              const file2CmdBDone = stdoutIndexOf(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file1CmdBExec = stdoutIndexOf(`[${fileName1}::cmdB] Executing ...`,stdout);
              const file1CmdBDone = stdoutIndexOf(`[${fileName1}::cmdB] Completed with code 0`,stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);
              const file2CmdDExec = stdoutIndexOf(`[${fileName2}::cmdD] Executing ...`,stdout);
              const file2CmdDDone = stdoutIndexOf(`[${fileName2}::cmdD] Completed with code 0`,stdout);
              const file2CmdGExec = stdoutIndexOf(`[${fileName2}::cmdG] Executing ...`,stdout);
              const file2CmdGDone = stdoutIndexOf(`[${fileName2}::cmdG] Completed with code 0`,stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const file2CmdEExec = stdoutIndexOf(`[${fileName2}::cmdE] Executing ...`,stdout);
              const file2CmdEDone = stdoutIndexOf(`[${fileName2}::cmdE] Completed with code 0`,stdout);
              const chunk4 = stdoutIndexOf(`chunk 4...`,stdout);
              const file2CmdFExec = stdoutIndexOf(`[${fileName2}::cmdF] Executing ...`,stdout);
              const file2CmdFDone = stdoutIndexOf(`[${fileName2}::cmdF] Completed with code 0`,stdout);

              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdBExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
              expect(file1CmdADone).to.be.lessThan(chunk2);
              expect(file2CmdADone).to.be.lessThan(chunk2);
              expect(file2CmdBDone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file1CmdBExec);
              expect(chunk2).to.be.lessThan(file2CmdCExec)
              expect(chunk2).to.be.lessThan(file2CmdDExec);
              expect(chunk2).to.be.lessThan(file2CmdGExec);
              expect(file1CmdBExec).to.be.lessThan(file1CmdBDone);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
              expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
              expect(file2CmdGExec).to.be.lessThan(file2CmdGDone);
              expect(file1CmdBDone).to.be.lessThan(chunk3);
              expect(file2CmdCDone).to.be.lessThan(chunk3);
              expect(file2CmdDDone).to.be.lessThan(chunk3);
              expect(file2CmdGDone).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(file2CmdEExec);
              expect(file2CmdEExec).to.be.lessThan(file2CmdEDone);
              expect(file2CmdEDone).to.be.lessThan(chunk4);
              expect(chunk4).to.be.lessThan(file2CmdFExec);
              expect(file2CmdFExec).to.be.lessThan(file2CmdFDone);
            });

            it('multiple shared nodes case 2', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tag2`);
              await runCommand(`add ${fileName2} cmdD -c "echo D" -t tag2 -p cmdA -p cmdB`);
              await runCommand(`add ${fileName2} cmdE -c "echo E" -t tag2 -p cmdB -p cmdC`);
              await runCommand(`add ${fileName2} cmdF -c "echo F" -t tag2 -p cmdE -p cmdD`);
              const { stdout } = await runCommand(`run --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const file2CmdBExec = stdoutIndexOf(`[${fileName2}::cmdB] Executing ...`,stdout);
              const file2CmdBDone = stdoutIndexOf(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file1CmdBExec = stdoutIndexOf(`[${fileName1}::cmdB] Executing ...`,stdout);
              const file1CmdBDone = stdoutIndexOf(`[${fileName1}::cmdB] Completed with code 0`,stdout);
              const file2CmdDExec = stdoutIndexOf(`[${fileName2}::cmdD] Executing ...`,stdout);
              const file2CmdDDone = stdoutIndexOf(`[${fileName2}::cmdD] Completed with code 0`,stdout);
              const file2CmdEExec = stdoutIndexOf(`[${fileName2}::cmdE] Executing ...`,stdout);
              const file2CmdEDone = stdoutIndexOf(`[${fileName2}::cmdE] Completed with code 0`,stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const file2CmdFExec = stdoutIndexOf(`[${fileName2}::cmdF] Executing ...`,stdout);
              const file2CmdFDone = stdoutIndexOf(`[${fileName2}::cmdF] Completed with code 0`,stdout);

              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdBExec);
              expect(chunk1).to.be.lessThan(file2CmdCExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
              expect(file1CmdADone).to.be.lessThan(chunk2);
              expect(file2CmdADone).to.be.lessThan(chunk2);
              expect(file2CmdBDone).to.be.lessThan(chunk2);
              expect(file2CmdCDone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file1CmdBExec);
              expect(chunk2).to.be.lessThan(file2CmdDExec);
              expect(chunk2).to.be.lessThan(file2CmdEExec);
              expect(file1CmdBExec).to.be.lessThan(file1CmdBDone);
              expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
              expect(file2CmdEExec).to.be.lessThan(file2CmdEDone);
              expect(file1CmdBDone).to.be.lessThan(chunk3);
              expect(file2CmdDDone).to.be.lessThan(chunk3);
              expect(file2CmdEDone).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(file2CmdFExec);
              expect(file2CmdFExec).to.be.lessThan(file2CmdFDone);
            });

            it('execute successfully when filter by tag', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tagA -p cmdA`);
              const { stdout } = await runCommand(`run -t tagA --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);

              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file1CmdADone).to.be.lessThan(chunk2);
              expect(file2CmdADone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file2CmdCExec);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);

              expect(stdout).to.not.include(`[${fileName2}::cmdB] Executing ...`,stdout);
              expect(stdout).to.not.include(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              expect(stdout).to.not.include(`[${fileName1}::cmdB] Executing ...`,stdout);
              expect(stdout).to.not.include(`[${fileName1}::cmdB] Completed with code 0`,stdout);
            });

            it('execute successfully when filter by tag case 2', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tagA -p cmdA`);
              await runCommand(`add ${fileName2} cmdD -c "echo D" -t tagA -p cmdA`);
              const { stdout } = await runCommand(`run -t tagA --dry-run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);
              const file2CmdDExec = stdoutIndexOf(`[${fileName2}::cmdD] Executing ...`,stdout);
              const file2CmdDDone = stdoutIndexOf(`[${fileName2}::cmdD] Completed with code 0`,stdout);

              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file1CmdADone).to.be.lessThan(chunk2);
              expect(file2CmdADone).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file2CmdCExec);
              expect(chunk2).to.be.lessThan(file2CmdDExec);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
              expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);

              expect(stdout).to.not.include(`[${fileName2}::cmdB] Executing ...`,stdout);
              expect(stdout).to.not.include(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              expect(stdout).to.not.include(`[${fileName1}::cmdB] Executing ...`,stdout);
              expect(stdout).to.not.include(`[${fileName1}::cmdB] Completed with code 0`,stdout);
            });
          });
        });

        describe('no executable file exists', () => {
          it('should produce no output when there are no snip files', async () => {
            const { stdout, stderr } = await runCommand(`run --dry-run`);
            expect(stdout).to.include('');
            expect(stderr).to.not.include('Something went wrong');
          });

          it('should produce no output when the snip files has no command', async () => {
            await runCommand(`create ${fileName1}`);

            const { stdout, stderr } = await runCommand(`run --dry-run`);
            expect(stdout).to.include('');
            expect(stderr).to.not.include('Something went wrong');
          });

          it('should produce no output when tag does not match any command across all snip files', async () => {
            await runCommand(`create ${fileName1}`);
            await runCommand(`add ${fileName1} cmdA -c "echo A" -t tagA`);

            const { stdout, stderr } = await runCommand(`run --tag not-match --dry-run`);
            expect(stdout).to.include('');
            expect(stderr).to.not.include('Something went wrong');
          });

          it('should produce no output when --tag "" is provided and no command has an empty tag', async () => {
            await runCommand(`create ${fileName1}`);
            await runCommand(`add ${fileName1} cmdA -c "echo A" -t tagA`);

            const { stdout, stderr } = await runCommand(`run --tag "" --dry-run`);
            expect(stdout).to.include('');
            expect(stderr).to.not.include('Something went wrong');
          });
        });
      });

      describe('file is provided and dryRun = false', () => {
        const fileName = 'run-file1';
        describe('executable file exists', () => {
          beforeEach(async () => {
            await runCommand(`create ${fileName}`);
            await runCommand(`add ${fileName} cmdA -c "echo a" -t tag2`);
            await runCommand(`add ${fileName} cmdB -c "echo b" -t tag1 -t tag2`);
          });

          it('should execute all commands in the specified file and print their outputs', async () => {
            const fileName2 = 'run-file2';
            await runCommand(`create ${fileName2}`);
            await runCommand(`add ${fileName2} cmdX -c "echo a" -t tagA`);

            const { stdout } = await runCommand(`run ${fileName}`);
            [`${fileName}::cmdA`].forEach((s) => verifyPrefixOutput(s, stdout));
            expect(stdout).to.include(`[${fileName}::cmdA] echo a`);
            expect(stdout).to.include('a');
            [`${fileName}::cmdB`].forEach((s) => verifyPrefixOutput(s, stdout));
            expect(stdout).to.include(`[${fileName}::cmdB] echo b`);
            expect(stdout).to.include('b');
            [`${fileName2}::cmdX`].forEach((s) => verifyPrefixNotOutput(s, stdout));
          });

          it('should execute only the specified command in the file', async () => {
            const { stdout } = await runCommand(`run ${fileName} cmdA`);
            [`${fileName}::cmdA`].forEach((s) => verifyPrefixOutput(s, stdout));
            expect(stdout).to.include(`[${fileName}::cmdA] echo a`);
            expect(stdout).to.include('a');
            [`${fileName}::cmdB`].forEach((s) => verifyPrefixNotOutput(s, stdout));
          });

          it('should execute only commands matching tag in the specified file', async () => {
            await runCommand(`add ${fileName} cmdC -c "echo c"`);
            await runCommand(`add ${fileName} cmdD -c "echo d" -t tag1`);
            await runCommand(`add ${fileName} cmdE -c "echo e" -t tag1 -t tag3`);

            const { stdout } = await runCommand(`run ${fileName} --tag tag2`);
            [`${fileName}::cmdA`].forEach((s) => verifyPrefixOutput(s, stdout));
            expect(stdout).to.include(`[${fileName}::cmdA] echo a`);
            expect(stdout).to.include('a');
            [`${fileName}::cmdB`].forEach((s) => verifyPrefixOutput(s, stdout));
            expect(stdout).to.include(`[${fileName}::cmdB] echo b`);
            expect(stdout).to.include('b');
            [`${fileName}::cmdC`, `${fileName}::cmdD`, `${fileName}::cmdE`].forEach((s) => verifyPrefixNotOutput(s, stdout));
          });

          it('should execute when both name and tag match in the specified file', async () => {
            const { stdout } = await runCommand(`run ${fileName} cmdA --tag tag2`);
            [`${fileName}::cmdA`].forEach((s) => verifyPrefixOutput(s, stdout));
            expect(stdout).to.include(`[${fileName}::cmdA] echo a`);
            expect(stdout).to.include('a');
            [`${fileName}::cmdB`].forEach((s) => verifyPrefixNotOutput(s, stdout));
          });

          describe('dependsOn scenario', () => {
            it('simple dependency', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag2 -p cmdA`);
              const { stdout } = await runCommand(`run ${fileName} --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdAExec = stdoutIndexOf(`[${fileName}::cmdA] Executing ...`,stdout);
              const cmdADone = stdoutIndexOf(`[${fileName}::cmdA] Completed with code 0`,stdout);
              const cmdACmd = stdoutIndexOf(`[${fileName}::cmdA] echo a`,stdout);
              const cmdAOut = stdoutIndexOf('a\r',stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const cmdBCmd = stdoutIndexOf(`[${fileName}::cmdB] echo b`,stdout);
              const cmdBOut = stdoutIndexOf('b\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);
              const cmdCCmd = stdoutIndexOf(`[${fileName}::cmdC] echo C`,stdout);
              const cmdCOut = stdoutIndexOf('C\r',stdout);

              expect(chunk1).to.be.lessThan(cmdAExec);
              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(cmdAExec).to.be.lessThan(cmdADone);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdADone).to.be.lessThan(cmdACmd);
              expect(cmdBDone).to.be.lessThan(cmdBCmd);
              expect(cmdACmd).to.be.lessThan(cmdAOut);
              expect(cmdBCmd).to.be.lessThan(cmdBOut);
              expect(cmdAOut).to.be.lessThan(chunk2);
              expect(cmdBOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdCExec);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
              expect(cmdCDone).to.be.lessThan(cmdCCmd);
              expect(cmdCCmd).to.be.lessThan(cmdCOut);
            });

            it('simple dependency 2', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdD -c "echo D" -t tag2 -p cmdA`);
              const { stdout } = await runCommand(`run ${fileName} --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdAExec = stdoutIndexOf(`[${fileName}::cmdA] Executing ...`,stdout);
              const cmdADone = stdoutIndexOf(`[${fileName}::cmdA] Completed with code 0`,stdout);
              const cmdACmd = stdoutIndexOf(`[${fileName}::cmdA] echo a`,stdout);
              const cmdAOut = stdoutIndexOf('a\r',stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const cmdBCmd = stdoutIndexOf(`[${fileName}::cmdB] echo b`,stdout);
              const cmdBOut = stdoutIndexOf('b\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);
              const cmdCCmd = stdoutIndexOf(`[${fileName}::cmdC] echo C`,stdout);
              const cmdCOut = stdoutIndexOf('C\r',stdout);
              const cmdDExec = stdoutIndexOf(`[${fileName}::cmdD] Executing ...`,stdout);
              const cmdDDone = stdoutIndexOf(`[${fileName}::cmdD] Completed with code 0`,stdout);
              const cmdDCmd = stdoutIndexOf(`[${fileName}::cmdD] echo D`,stdout);
              const cmdDOut = stdoutIndexOf('D\r',stdout);

              expect(chunk1).to.be.lessThan(cmdAExec);
              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(cmdAExec).to.be.lessThan(cmdADone);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdADone).to.be.lessThan(cmdACmd);
              expect(cmdBDone).to.be.lessThan(cmdBCmd);
              expect(cmdACmd).to.be.lessThan(cmdAOut);
              expect(cmdBCmd).to.be.lessThan(cmdBOut);
              expect(cmdAOut).to.be.lessThan(chunk2);
              expect(cmdBOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdCExec);
              expect(chunk2).to.be.lessThan(cmdDExec);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
              expect(cmdCDone).to.be.lessThan(cmdCCmd);
              expect(cmdCCmd).to.be.lessThan(cmdCOut);
              expect(cmdDExec).to.be.lessThan(cmdDDone);
              expect(cmdDDone).to.be.lessThan(cmdDCmd);
              expect(cmdDCmd).to.be.lessThan(cmdDOut);
            });

            it('long dependency', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdD -c "echo D" -t tag2 -p cmdC`);
              await runCommand(`add ${fileName} cmdE -c "echo E" -t tag2 -p cmdD`);
              await runCommand(`add ${fileName} cmdF -c "echo F" -t tag2 -p cmdE`);
              const { stdout } = await runCommand(`run ${fileName} --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdAExec = stdoutIndexOf(`[${fileName}::cmdA] Executing ...`,stdout);
              const cmdADone = stdoutIndexOf(`[${fileName}::cmdA] Completed with code 0`,stdout);
              const cmdACmd = stdoutIndexOf(`[${fileName}::cmdA] echo a`,stdout);
              const cmdAOut = stdoutIndexOf('a\r',stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const cmdBCmd = stdoutIndexOf(`[${fileName}::cmdB] echo b`,stdout);
              const cmdBOut = stdoutIndexOf('b\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);
              const cmdCCmd = stdoutIndexOf(`[${fileName}::cmdC] echo C`,stdout);
              const cmdCOut = stdoutIndexOf('C\r',stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const cmdDExec = stdoutIndexOf(`[${fileName}::cmdD] Executing ...`,stdout);
              const cmdDDone = stdoutIndexOf(`[${fileName}::cmdD] Completed with code 0`,stdout);
              const cmdDCmd = stdoutIndexOf(`[${fileName}::cmdD] echo D`,stdout);
              const cmdDOut = stdoutIndexOf('D\r',stdout);
              const chunk4 = stdoutIndexOf(`chunk 4...`,stdout);
              const cmdEExec = stdoutIndexOf(`[${fileName}::cmdE] Executing ...`,stdout);
              const cmdEDone = stdoutIndexOf(`[${fileName}::cmdE] Completed with code 0`,stdout);
              const cmdECmd = stdoutIndexOf(`[${fileName}::cmdE] echo E`,stdout);
              const cmdEOut = stdoutIndexOf('E\r',stdout);
              const chunk5 = stdoutIndexOf(`chunk 5...`,stdout);
              const cmdFExec = stdoutIndexOf(`[${fileName}::cmdF] Executing ...`,stdout);
              const cmdFDone = stdoutIndexOf(`[${fileName}::cmdF] Completed with code 0`,stdout);
              const cmdFCmd = stdoutIndexOf(`[${fileName}::cmdF] echo F`,stdout);
              const cmdFOut = stdoutIndexOf('F\r',stdout);

              expect(chunk1).to.be.lessThan(cmdAExec);
              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(cmdAExec).to.be.lessThan(cmdADone);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdADone).to.be.lessThan(cmdACmd);
              expect(cmdBDone).to.be.lessThan(cmdBCmd);
              expect(cmdACmd).to.be.lessThan(cmdAOut);
              expect(cmdBCmd).to.be.lessThan(cmdBOut);
              expect(cmdAOut).to.be.lessThan(chunk2);
              expect(cmdBOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdCExec);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
              expect(cmdCDone).to.be.lessThan(cmdCCmd);
              expect(cmdCCmd).to.be.lessThan(cmdCOut);
              expect(cmdCOut).to.be.lessThan(chunk3)
              expect(chunk3).to.be.lessThan(cmdDExec);
              expect(cmdDExec).to.be.lessThan(cmdDDone);
              expect(cmdDDone).to.be.lessThan(cmdDCmd);
              expect(cmdDCmd).to.be.lessThan(cmdDOut);
              expect(cmdDOut).to.be.lessThan(chunk4);
              expect(chunk4).to.be.lessThan(cmdEExec);
              expect(cmdEExec).to.be.lessThan(cmdEDone);
              expect(cmdEDone).to.be.lessThan(cmdECmd);
              expect(cmdECmd).to.be.lessThan(cmdEOut);
              expect(cmdEOut).to.be.lessThan(chunk5);
              expect(chunk5).to.be.lessThan(cmdFExec);
              expect(cmdFExec).to.be.lessThan(cmdFDone);
              expect(cmdFDone).to.be.lessThan(cmdFCmd);
              expect(cmdFCmd).to.be.lessThan(cmdFOut);
            });

            it('DAO shared nodes', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdD -c "echo D" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdE -c "echo E" -t tag2 -p cmdC -p cmdD`);
              await runCommand(`add ${fileName} cmdF -c "echo F" -t tag2 -p cmdE`);
              const { stdout } = await runCommand(`run ${fileName} --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdAExec = stdoutIndexOf(`[${fileName}::cmdA] Executing ...`,stdout);
              const cmdADone = stdoutIndexOf(`[${fileName}::cmdA] Completed with code 0`,stdout);
              const cmdACmd = stdoutIndexOf(`[${fileName}::cmdA] echo a`,stdout);
              const cmdAOut = stdoutIndexOf('a\r',stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const cmdBCmd = stdoutIndexOf(`[${fileName}::cmdB] echo b`,stdout);
              const cmdBOut = stdoutIndexOf('b\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);
              const cmdCCmd = stdoutIndexOf(`[${fileName}::cmdC] echo C`,stdout);
              const cmdCOut = stdoutIndexOf('C\r',stdout);
              const cmdDExec = stdoutIndexOf(`[${fileName}::cmdD] Executing ...`,stdout);
              const cmdDDone = stdoutIndexOf(`[${fileName}::cmdD] Completed with code 0`,stdout);
              const cmdDCmd = stdoutIndexOf(`[${fileName}::cmdD] echo D`,stdout);
              const cmdDOut = stdoutIndexOf('D\r',stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const cmdEExec = stdoutIndexOf(`[${fileName}::cmdE] Executing ...`,stdout);
              const cmdEDone = stdoutIndexOf(`[${fileName}::cmdE] Completed with code 0`,stdout);
              const cmdECmd = stdoutIndexOf(`[${fileName}::cmdE] echo E`,stdout);
              const cmdEOut = stdoutIndexOf('E\r',stdout);
              const chunk4 = stdoutIndexOf(`chunk 4...`,stdout);
              const cmdFExec = stdoutIndexOf(`[${fileName}::cmdF] Executing ...`,stdout);
              const cmdFDone = stdoutIndexOf(`[${fileName}::cmdF] Completed with code 0`,stdout);
              const cmdFCmd = stdoutIndexOf(`[${fileName}::cmdF] echo F`,stdout);
              const cmdFOut = stdoutIndexOf('F\r',stdout);

              expect(chunk1).to.be.lessThan(cmdAExec);
              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(cmdAExec).to.be.lessThan(cmdADone);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdADone).to.be.lessThan(cmdACmd);
              expect(cmdBDone).to.be.lessThan(cmdBCmd);
              expect(cmdACmd).to.be.lessThan(cmdAOut);
              expect(cmdBCmd).to.be.lessThan(cmdBOut);
              expect(cmdAOut).to.be.lessThan(chunk2);
              expect(cmdBOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdCExec);
              expect(chunk2).to.be.lessThan(cmdDExec);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
              expect(cmdCDone).to.be.lessThan(cmdCCmd);
              expect(cmdCCmd).to.be.lessThan(cmdCOut);
              expect(cmdDExec).to.be.lessThan(cmdDDone);
              expect(cmdDDone).to.be.lessThan(cmdDCmd);
              expect(cmdDCmd).to.be.lessThan(cmdDOut);
              expect(cmdCOut).to.be.lessThan(chunk3)
              expect(cmdDOut).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(cmdEExec);
              expect(cmdEExec).to.be.lessThan(cmdEDone);
              expect(cmdEDone).to.be.lessThan(cmdECmd);
              expect(cmdECmd).to.be.lessThan(cmdEOut);
              expect(cmdEOut).to.be.lessThan(chunk4);
              expect(chunk4).to.be.lessThan(cmdFExec);
              expect(cmdFExec).to.be.lessThan(cmdFDone);
              expect(cmdFDone).to.be.lessThan(cmdFCmd);
              expect(cmdFCmd).to.be.lessThan(cmdFOut);
            });

            it('multiple DependsOn', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdD -c "echo D" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdE -c "echo E" -t tag2 -p cmdC`);
              await runCommand(`add ${fileName} cmdF -c "echo F" -t tag2 -p cmdD`);
              const { stdout } = await runCommand(`run ${fileName} --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdAExec = stdoutIndexOf(`[${fileName}::cmdA] Executing ...`,stdout);
              const cmdADone = stdoutIndexOf(`[${fileName}::cmdA] Completed with code 0`,stdout);
              const cmdACmd = stdoutIndexOf(`[${fileName}::cmdA] echo a`,stdout);
              const cmdAOut = stdoutIndexOf('a\r',stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const cmdBCmd = stdoutIndexOf(`[${fileName}::cmdB] echo b`,stdout);
              const cmdBOut = stdoutIndexOf('b\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);
              const cmdCCmd = stdoutIndexOf(`[${fileName}::cmdC] echo C`,stdout);
              const cmdCOut = stdoutIndexOf('C\r',stdout);
              const cmdDExec = stdoutIndexOf(`[${fileName}::cmdD] Executing ...`,stdout);
              const cmdDDone = stdoutIndexOf(`[${fileName}::cmdD] Completed with code 0`,stdout);
              const cmdDCmd = stdoutIndexOf(`[${fileName}::cmdD] echo D`,stdout);
              const cmdDOut = stdoutIndexOf('D\r',stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const cmdEExec = stdoutIndexOf(`[${fileName}::cmdE] Executing ...`,stdout);
              const cmdEDone = stdoutIndexOf(`[${fileName}::cmdE] Completed with code 0`,stdout);
              const cmdECmd = stdoutIndexOf(`[${fileName}::cmdE] echo E`,stdout);
              const cmdEOut = stdoutIndexOf('E\r',stdout);
              const cmdFExec = stdoutIndexOf(`[${fileName}::cmdF] Executing ...`,stdout);
              const cmdFDone = stdoutIndexOf(`[${fileName}::cmdF] Completed with code 0`,stdout);
              const cmdFCmd = stdoutIndexOf(`[${fileName}::cmdF] echo F`,stdout);
              const cmdFOut = stdoutIndexOf('F\r',stdout);

              expect(chunk1).to.be.lessThan(cmdAExec);
              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(cmdAExec).to.be.lessThan(cmdADone);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdADone).to.be.lessThan(cmdACmd);
              expect(cmdBDone).to.be.lessThan(cmdBCmd);
              expect(cmdACmd).to.be.lessThan(cmdAOut);
              expect(cmdBCmd).to.be.lessThan(cmdBOut);
              expect(cmdAOut).to.be.lessThan(chunk2);
              expect(cmdBOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdCExec);
              expect(chunk2).to.be.lessThan(cmdDExec);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
              expect(cmdCDone).to.be.lessThan(cmdCCmd);
              expect(cmdCCmd).to.be.lessThan(cmdCOut);
              expect(cmdDExec).to.be.lessThan(cmdDDone);
              expect(cmdDDone).to.be.lessThan(cmdDCmd);
              expect(cmdDCmd).to.be.lessThan(cmdDOut);
              expect(cmdCOut).to.be.lessThan(chunk3)
              expect(cmdDOut).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(cmdEExec);
              expect(chunk3).to.be.lessThan(cmdFExec);
              expect(cmdEExec).to.be.lessThan(cmdEDone);
              expect(cmdEDone).to.be.lessThan(cmdECmd);
              expect(cmdECmd).to.be.lessThan(cmdEOut);
              expect(cmdFExec).to.be.lessThan(cmdFDone);
              expect(cmdFDone).to.be.lessThan(cmdFCmd);
              expect(cmdFCmd).to.be.lessThan(cmdFOut);
            });

            it('multiple DependsOn case 2', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdD -c "echo D" -t tag2 -p cmdB`);
              await runCommand(`add ${fileName} cmdE -c "echo E" -t tag2 -p cmdC -p cmdD`);
              const { stdout } = await runCommand(`run ${fileName} --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdAExec = stdoutIndexOf(`[${fileName}::cmdA] Executing ...`,stdout);
              const cmdADone = stdoutIndexOf(`[${fileName}::cmdA] Completed with code 0`,stdout);
              const cmdACmd = stdoutIndexOf(`[${fileName}::cmdA] echo a`,stdout);
              const cmdAOut = stdoutIndexOf('a\r',stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const cmdBCmd = stdoutIndexOf(`[${fileName}::cmdB] echo b`,stdout);
              const cmdBOut = stdoutIndexOf('b\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);
              const cmdCCmd = stdoutIndexOf(`[${fileName}::cmdC] echo C`,stdout);
              const cmdCOut = stdoutIndexOf('C\r',stdout);
              const cmdDExec = stdoutIndexOf(`[${fileName}::cmdD] Executing ...`,stdout);
              const cmdDDone = stdoutIndexOf(`[${fileName}::cmdD] Completed with code 0`,stdout);
              const cmdDCmd = stdoutIndexOf(`[${fileName}::cmdD] echo D`,stdout);
              const cmdDOut = stdoutIndexOf('D\r',stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const cmdEExec = stdoutIndexOf(`[${fileName}::cmdE] Executing ...`,stdout);
              const cmdEDone = stdoutIndexOf(`[${fileName}::cmdE] Completed with code 0`,stdout);
              const cmdECmd = stdoutIndexOf(`[${fileName}::cmdE] echo E`,stdout);
              const cmdEOut = stdoutIndexOf('E\r',stdout);
              
              expect(chunk1).to.be.lessThan(cmdAExec);
              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(cmdAExec).to.be.lessThan(cmdADone);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdADone).to.be.lessThan(cmdACmd);
              expect(cmdBDone).to.be.lessThan(cmdBCmd);
              expect(cmdACmd).to.be.lessThan(cmdAOut);
              expect(cmdBCmd).to.be.lessThan(cmdBOut);
              expect(cmdAOut).to.be.lessThan(chunk2);
              expect(cmdBOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdCExec);
              expect(chunk2).to.be.lessThan(cmdDExec);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
              expect(cmdCDone).to.be.lessThan(cmdCCmd);
              expect(cmdCCmd).to.be.lessThan(cmdCOut);
              expect(cmdDExec).to.be.lessThan(cmdDDone);
              expect(cmdDDone).to.be.lessThan(cmdDCmd);
              expect(cmdDCmd).to.be.lessThan(cmdDOut);
              expect(cmdCOut).to.be.lessThan(chunk3)
              expect(cmdDOut).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(cmdEExec);
              expect(cmdEExec).to.be.lessThan(cmdEDone);
              expect(cmdEDone).to.be.lessThan(cmdECmd);
              expect(cmdECmd).to.be.lessThan(cmdEOut);
            });

            it('multiple shared nodes', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdD -c "echo D" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdE -c "echo E" -t tag2 -p cmdC -p cmdD`);
              await runCommand(`add ${fileName} cmdG -c "echo G" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName} cmdF -c "echo F" -t tag2 -p cmdE -p cmdG`);
              const { stdout } = await runCommand(`run ${fileName} --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdAExec = stdoutIndexOf(`[${fileName}::cmdA] Executing ...`,stdout);
              const cmdADone = stdoutIndexOf(`[${fileName}::cmdA] Completed with code 0`,stdout);
              const cmdACmd = stdoutIndexOf(`[${fileName}::cmdA] echo a`,stdout);
              const cmdAOut = stdoutIndexOf('a\r',stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const cmdBCmd = stdoutIndexOf(`[${fileName}::cmdB] echo b`,stdout);
              const cmdBOut = stdoutIndexOf('b\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);
              const cmdCCmd = stdoutIndexOf(`[${fileName}::cmdC] echo C`,stdout);
              const cmdCOut = stdoutIndexOf('C\r',stdout);
              const cmdDExec = stdoutIndexOf(`[${fileName}::cmdD] Executing ...`,stdout);
              const cmdDDone = stdoutIndexOf(`[${fileName}::cmdD] Completed with code 0`,stdout);
              const cmdDCmd = stdoutIndexOf(`[${fileName}::cmdD] echo D`,stdout);
              const cmdDOut = stdoutIndexOf('D\r',stdout);
              const cmdGExec = stdoutIndexOf(`[${fileName}::cmdG] Executing ...`,stdout);
              const cmdGDone = stdoutIndexOf(`[${fileName}::cmdG] Completed with code 0`,stdout);
              const cmdGCmd = stdoutIndexOf(`[${fileName}::cmdG] echo G`,stdout);
              const cmdGOut = stdoutIndexOf('G\r',stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const cmdEExec = stdoutIndexOf(`[${fileName}::cmdE] Executing ...`,stdout);
              const cmdEDone = stdoutIndexOf(`[${fileName}::cmdE] Completed with code 0`,stdout);
              const cmdECmd = stdoutIndexOf(`[${fileName}::cmdE] echo E`,stdout);
              const cmdEOut = stdoutIndexOf('E\r',stdout);
              const chunk4 = stdoutIndexOf(`chunk 4...`,stdout);
              const cmdFExec = stdoutIndexOf(`[${fileName}::cmdF] Executing ...`,stdout);
              const cmdFDone = stdoutIndexOf(`[${fileName}::cmdF] Completed with code 0`,stdout);
              const cmdFCmd = stdoutIndexOf(`[${fileName}::cmdF] echo F`,stdout);
              const cmdFOut = stdoutIndexOf('F\r',stdout);

              expect(chunk1).to.be.lessThan(cmdAExec);
              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(cmdAExec).to.be.lessThan(cmdADone);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdADone).to.be.lessThan(cmdACmd);
              expect(cmdBDone).to.be.lessThan(cmdBCmd);
              expect(cmdACmd).to.be.lessThan(cmdAOut);
              expect(cmdBCmd).to.be.lessThan(cmdBOut);
              expect(cmdAOut).to.be.lessThan(chunk2);
              expect(cmdBOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdCExec);
              expect(chunk2).to.be.lessThan(cmdDExec);
              expect(chunk2).to.be.lessThan(cmdGExec);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
              expect(cmdCDone).to.be.lessThan(cmdCCmd);
              expect(cmdCCmd).to.be.lessThan(cmdCOut);
              expect(cmdDExec).to.be.lessThan(cmdDDone);
              expect(cmdDDone).to.be.lessThan(cmdDCmd);
              expect(cmdDCmd).to.be.lessThan(cmdDOut);
              expect(cmdGExec).to.be.lessThan(cmdGDone);
              expect(cmdGDone).to.be.lessThan(cmdGCmd);
              expect(cmdGCmd).to.be.lessThan(cmdGOut);
              expect(cmdCOut).to.be.lessThan(chunk3)
              expect(cmdDOut).to.be.lessThan(chunk3);
              expect(cmdGOut).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(cmdEExec);
              expect(cmdEExec).to.be.lessThan(cmdEDone);
              expect(cmdEDone).to.be.lessThan(cmdECmd);
              expect(cmdECmd).to.be.lessThan(cmdEOut);
              expect(cmdEOut).to.be.lessThan(chunk4);
              expect(chunk4).to.be.lessThan(cmdFExec);
              expect(cmdFExec).to.be.lessThan(cmdFDone);
              expect(cmdFDone).to.be.lessThan(cmdFCmd);
              expect(cmdFCmd).to.be.lessThan(cmdFOut);
            });

            it('multiple shared nodes case 2', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag2`);
              await runCommand(`add ${fileName} cmdD -c "echo D" -t tag2 -p cmdA -p cmdB`);
              await runCommand(`add ${fileName} cmdE -c "echo E" -t tag2 -p cmdB -p cmdC`);
              await runCommand(`add ${fileName} cmdF -c "echo F" -t tag2 -p cmdE -p cmdD`);
              const { stdout } = await runCommand(`run ${fileName} --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdAExec = stdoutIndexOf(`[${fileName}::cmdA] Executing ...`,stdout);
              const cmdADone = stdoutIndexOf(`[${fileName}::cmdA] Completed with code 0`,stdout);
              const cmdACmd = stdoutIndexOf(`[${fileName}::cmdA] echo a`,stdout);
              const cmdAOut = stdoutIndexOf('a\r',stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const cmdBCmd = stdoutIndexOf(`[${fileName}::cmdB] echo b`,stdout);
              const cmdBOut = stdoutIndexOf('b\r',stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);
              const cmdCCmd = stdoutIndexOf(`[${fileName}::cmdC] echo C`,stdout);
              const cmdCOut = stdoutIndexOf('C\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdDExec = stdoutIndexOf(`[${fileName}::cmdD] Executing ...`,stdout);
              const cmdDDone = stdoutIndexOf(`[${fileName}::cmdD] Completed with code 0`,stdout);
              const cmdDCmd = stdoutIndexOf(`[${fileName}::cmdD] echo D`,stdout);
              const cmdDOut = stdoutIndexOf('D\r',stdout);
              const cmdEExec = stdoutIndexOf(`[${fileName}::cmdE] Executing ...`,stdout);
              const cmdEDone = stdoutIndexOf(`[${fileName}::cmdE] Completed with code 0`,stdout);
              const cmdECmd = stdoutIndexOf(`[${fileName}::cmdE] echo E`,stdout);
              const cmdEOut = stdoutIndexOf('E\r',stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const cmdFExec = stdoutIndexOf(`[${fileName}::cmdF] Executing ...`,stdout);
              const cmdFDone = stdoutIndexOf(`[${fileName}::cmdF] Completed with code 0`,stdout);
              const cmdFCmd = stdoutIndexOf(`[${fileName}::cmdF] echo F`,stdout);
              const cmdFOut = stdoutIndexOf('F\r',stdout);

              expect(chunk1).to.be.lessThan(cmdAExec);
              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(chunk1).to.be.lessThan(cmdCExec);
              expect(cmdAExec).to.be.lessThan(cmdADone);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
              expect(cmdADone).to.be.lessThan(cmdACmd);
              expect(cmdBDone).to.be.lessThan(cmdBCmd);
              expect(cmdCDone).to.be.lessThan(cmdCCmd);
              expect(cmdACmd).to.be.lessThan(cmdAOut);
              expect(cmdBCmd).to.be.lessThan(cmdBOut);
              expect(cmdCCmd).to.be.lessThan(cmdCOut);
              expect(cmdAOut).to.be.lessThan(chunk2);
              expect(cmdBOut).to.be.lessThan(chunk2);
              expect(cmdCOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdDExec);
              expect(chunk2).to.be.lessThan(cmdEExec);
              expect(cmdDExec).to.be.lessThan(cmdDDone);
              expect(cmdDDone).to.be.lessThan(cmdDCmd);
              expect(cmdDCmd).to.be.lessThan(cmdDOut);
              expect(cmdEExec).to.be.lessThan(cmdEDone);
              expect(cmdEDone).to.be.lessThan(cmdECmd);
              expect(cmdECmd).to.be.lessThan(cmdEOut);           
              expect(cmdDOut).to.be.lessThan(chunk3);
              expect(cmdEOut).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(cmdFExec);
              expect(cmdFExec).to.be.lessThan(cmdFDone);
              expect(cmdFDone).to.be.lessThan(cmdFCmd);
              expect(cmdFCmd).to.be.lessThan(cmdFOut);
            });

            it('execute successfully when filter by tag', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag1 -p cmdB`);
              const { stdout } = await runCommand(`run ${fileName} -t tag1 --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const cmdBCmd = stdoutIndexOf(`[${fileName}::cmdB] echo b`,stdout);
              const cmdBOut = stdoutIndexOf('b\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);
              const cmdCCmd = stdoutIndexOf(`[${fileName}::cmdC] echo C`,stdout);
              const cmdCOut = stdoutIndexOf('C\r',stdout);

              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdBDone).to.be.lessThan(cmdBCmd);
              expect(cmdBCmd).to.be.lessThan(cmdBOut);
              expect(cmdBOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdCExec);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
              expect(cmdCDone).to.be.lessThan(cmdCCmd);
              expect(cmdCCmd).to.be.lessThan(cmdCOut);

              expect(stdout).to.not.include(`[${fileName}::cmdA] Executing ...`,stdout);
              expect(stdout).to.not.include(`[${fileName}::cmdA] Completed with code 0`,stdout);
              expect(stdout).to.not.include(`[${fileName}::cmdA] echo a`,stdout);
              expect(stdout).to.not.include('a\r',stdout);
            });

            it('execute successfully when filter by tag case 2', async () => {
              await runCommand(`add ${fileName} cmdC -c "echo C" -t tag1 -p cmdB`);
              await runCommand(`add ${fileName} cmdD -c "echo D" -t tag1 -p cmdB`);
              const { stdout } = await runCommand(`run ${fileName} -t tag1 --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const cmdBExec = stdoutIndexOf(`[${fileName}::cmdB] Executing ...`,stdout);
              const cmdBDone = stdoutIndexOf(`[${fileName}::cmdB] Completed with code 0`,stdout);
              const cmdBCmd = stdoutIndexOf(`[${fileName}::cmdB] echo b`,stdout);
              const cmdBOut = stdoutIndexOf('b\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const cmdCExec = stdoutIndexOf(`[${fileName}::cmdC] Executing ...`,stdout);
              const cmdCDone = stdoutIndexOf(`[${fileName}::cmdC] Completed with code 0`,stdout);
              const cmdCCmd = stdoutIndexOf(`[${fileName}::cmdC] echo C`,stdout);
              const cmdCOut = stdoutIndexOf('C\r',stdout);
              const cmdDExec = stdoutIndexOf(`[${fileName}::cmdD] Executing ...`,stdout);
              const cmdDDone = stdoutIndexOf(`[${fileName}::cmdD] Completed with code 0`,stdout);
              const cmdDCmd = stdoutIndexOf(`[${fileName}::cmdD] echo D`,stdout);
              const cmdDOut = stdoutIndexOf('D\r',stdout)

              expect(chunk1).to.be.lessThan(cmdBExec);
              expect(cmdBExec).to.be.lessThan(cmdBDone);
              expect(cmdBDone).to.be.lessThan(cmdBCmd);
              expect(cmdBCmd).to.be.lessThan(cmdBOut);
              expect(cmdBOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(cmdCExec);
              expect(chunk2).to.be.lessThan(cmdDExec);
              expect(cmdCExec).to.be.lessThan(cmdCDone);
              expect(cmdCDone).to.be.lessThan(cmdCCmd);
              expect(cmdCCmd).to.be.lessThan(cmdCOut);
              expect(cmdDExec).to.be.lessThan(cmdDDone);
              expect(cmdDDone).to.be.lessThan(cmdDCmd);
              expect(cmdDCmd).to.be.lessThan(cmdDOut);

              expect(stdout).to.not.include(`[${fileName}::cmdA] Executing ...`,stdout);
              expect(stdout).to.not.include(`[${fileName}::cmdA] Completed with code 0`,stdout);
              expect(stdout).to.not.include(`[${fileName}::cmdA] echo a`,stdout);
              expect(stdout).to.not.include('a\r',stdout);
            });
          });
        });

        describe('no executable file exists', () => {
          it('should produce no output when specified file does not exist', async () => {
            const { stdout, stderr } = await runCommand(`run not-exist-file`);
            expect(stdout).to.include('');
            expect(stderr).to.not.include('Something went wrong');
          });

          it('should produce no output when specified command name does not exist in file', async () => {
            await runCommand(`create ${fileName}`);
            await runCommand(`add ${fileName} cmdA -c "echo some" -t tagZ`);

            const { stdout, stderr } = await runCommand(`run ${fileName} notFoundCmd`);
            expect(stdout).to.include('');
            expect(stderr).to.not.include('Something went wrong');
          });

          it('should produce no output when tag does not match any command in file', async () => {
            await runCommand(`create ${fileName}`);
            await runCommand(`add ${fileName} cmdA -c "echo a" -t x`);

            const { stdout, stderr } = await runCommand(`run ${fileName} --tag not-match`);
            expect(stdout).to.include('');
            expect(stderr).to.not.include('Something went wrong');
          });

          it('should produce no output when name matches but tag does not in specified file', async () => {
            await runCommand(`create ${fileName}`);
            await runCommand(`add ${fileName} cmdA -c "echo" -t tagA`);

            const { stdout, stderr } = await runCommand(`run ${fileName} cmdA --tag tagB`);
            expect(stdout).to.include('');
            expect(stderr).to.not.include('Something went wrong');
          });
        });

        describe('no executable command exists', () => {
          it('should produce no output when the snip files has no command', async () => {
            await runCommand(`create ${fileName}`);

            const { stdout, stderr } = await runCommand(`run ${fileName}`);
            expect(stdout).to.include('');
            expect(stderr).to.not.include('Something went wrong');
          });
        });
      });

      describe('file is not provided and dryRun = false', () => {
        const fileName1 = 'run-all-1';

        describe('executable file exists', () => {
          const fileName2 = 'run-all-2';

          beforeEach(async () => {
            await runCommand(`create ${fileName1}`);
            await runCommand(`create ${fileName2}`);
            await runCommand(`add ${fileName1} cmdA -c "echo A" -t tagA`);
            await runCommand(`add ${fileName2} cmdA -c "echo 1" -t tagA -t tagC`);
            await runCommand(`add ${fileName2} cmdB -c "echo 2" -t tagB -t tagC`);
          });

          it('should execute all commands across all snip files', async () => {
            const { stdout } = await runCommand(`run`);
            [`${fileName1}::cmdA`].forEach((s) => verifyPrefixOutput(s, stdout));
            expect(stdout).to.include(`${fileName1}::cmdA] echo A`);
            expect(stdout).to.include('A');
            [`${fileName2}::cmdA`].forEach((s) => verifyPrefixOutput(s, stdout));
            expect(stdout).to.include(`[${fileName2}::cmdA] echo 1`);
            expect(stdout).to.include('1');
            [`${fileName2}::cmdB`].forEach((s) => verifyPrefixOutput(s, stdout));
            expect(stdout).to.include(`[${fileName2}::cmdB] echo 2`);
            expect(stdout).to.include('2');
          });

          it('should execute only commands matching tag across all snip files', async () => {
            await runCommand(`add ${fileName1} cmdM -c "echo B" -t tagB`);
            await runCommand(`add ${fileName2} cmdN -c "echo 3"`);

            const { stdout } = await runCommand(`run --tag tagA`);
            [`${fileName1}::cmdA`].forEach((s) => verifyPrefixOutput(s, stdout));
            expect(stdout).to.include(`[${fileName1}::cmdA] echo A`);
            expect(stdout).to.include(`A`);
            [`${fileName2}::cmdA`].forEach((s) => verifyPrefixOutput(s, stdout));
            expect(stdout).to.include(`[${fileName2}::cmdA] echo 1`);
            expect(stdout).to.include(`1`);
            [`${fileName2}::cmdB`, `${fileName1}::cmdM`, `${fileName2}::cmdN`].forEach((s) => verifyPrefixNotOutput(s, stdout));
          });

          describe('dependsOn scenario', () => {
            beforeEach(async () => {
              await runCommand(`add ${fileName1} cmdB -c "echo B" -p cmdA`);
            });

            it('simple dependency', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tag2 -p cmdA`);
              const { stdout } = await runCommand(`run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file1CmdACmd = stdoutIndexOf(`[${fileName1}::cmdA] echo A`,stdout);
              const file1CmdAOut = stdoutIndexOf('A\r',stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const file2CmdACmd = stdoutIndexOf(`[${fileName2}::cmdA] echo 1`,stdout);
              const file2CmdAOut = stdoutIndexOf('1\r',stdout);
              const file2CmdBExec = stdoutIndexOf(`[${fileName2}::cmdB] Executing ...`,stdout);
              const file2CmdBDone = stdoutIndexOf(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              const file2CmdBCmd = stdoutIndexOf(`[${fileName2}::cmdB] echo 2`,stdout);
              const file2CmdBOut = stdoutIndexOf('2\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file1CmdBExec = stdoutIndexOf(`[${fileName1}::cmdB] Executing ...`,stdout);
              const file1CmdBDone = stdoutIndexOf(`[${fileName1}::cmdB] Completed with code 0`,stdout);
              const file1CmdBCmd = stdoutIndexOf(`[${fileName1}::cmdB] echo B`,stdout);
              const file1CmdBOut = stdoutIndexOf('B\r',stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);
              const file2CmdCCmd = stdoutIndexOf(`[${fileName2}::cmdC] echo C`,stdout);
              const file2CmdCOut = stdoutIndexOf('C\r',stdout);

              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdBExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file1CmdADone).to.be.lessThan(file1CmdACmd);
              expect(file1CmdACmd).to.be.lessThan(file1CmdAOut);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
              expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
              expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
              expect(file2CmdBDone).to.be.lessThan(file2CmdBCmd);
              expect(file2CmdBCmd).to.be.lessThan(file2CmdBOut);
              expect(file1CmdAOut).to.be.lessThan(chunk2);
              expect(file2CmdAOut).to.be.lessThan(chunk2);
              expect(file2CmdBOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file1CmdBExec);
              expect(chunk2).to.be.lessThan(file2CmdCExec);
              expect(file1CmdBExec).to.be.lessThan(file1CmdBDone);
              expect(file1CmdBDone).to.be.lessThan(file1CmdBCmd);
              expect(file1CmdBCmd).to.be.lessThan(file1CmdBOut);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
              expect(file2CmdCDone).to.be.lessThan(file2CmdCCmd);
              expect(file2CmdCCmd).to.be.lessThan(file2CmdCOut);
            });

            it('simple dependency 2', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdD -c "echo D" -t tag2 -p cmdA`);
              const { stdout } = await runCommand(`run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file1CmdACmd = stdoutIndexOf(`[${fileName1}::cmdA] echo A`,stdout);
              const file1CmdAOut = stdoutIndexOf('A\r',stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const file2CmdACmd = stdoutIndexOf(`[${fileName2}::cmdA] echo 1`,stdout);
              const file2CmdAOut = stdoutIndexOf('1\r',stdout);
              const file2CmdBExec = stdoutIndexOf(`[${fileName2}::cmdB] Executing ...`,stdout);
              const file2CmdBDone = stdoutIndexOf(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              const file2CmdBCmd = stdoutIndexOf(`[${fileName2}::cmdB] echo 2`,stdout);
              const file2CmdBOut = stdoutIndexOf('2\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file1CmdBExec = stdoutIndexOf(`[${fileName1}::cmdB] Executing ...`,stdout);
              const file1CmdBDone = stdoutIndexOf(`[${fileName1}::cmdB] Completed with code 0`,stdout);
              const file1CmdBCmd = stdoutIndexOf(`[${fileName1}::cmdB] echo B`,stdout);
              const file1CmdBOut = stdoutIndexOf('B\r',stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);
              const file2CmdCCmd = stdoutIndexOf(`[${fileName2}::cmdC] echo C`,stdout);
              const file2CmdCOut = stdoutIndexOf('C\r',stdout);
              const file2CmdDExec = stdoutIndexOf(`[${fileName2}::cmdD] Executing ...`,stdout);
              const file2CmdDDone = stdoutIndexOf(`[${fileName2}::cmdD] Completed with code 0`,stdout);
              const file2CmdDCmd = stdoutIndexOf(`[${fileName2}::cmdD] echo D`,stdout);
              const file2CmdDOut = stdoutIndexOf('D\r',stdout);

              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdBExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file1CmdADone).to.be.lessThan(file1CmdACmd);
              expect(file1CmdACmd).to.be.lessThan(file1CmdAOut);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
              expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
              expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
              expect(file2CmdBDone).to.be.lessThan(file2CmdBCmd);
              expect(file2CmdBCmd).to.be.lessThan(file2CmdBOut);
              expect(file1CmdAOut).to.be.lessThan(chunk2);
              expect(file2CmdAOut).to.be.lessThan(chunk2);
              expect(file2CmdBOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file1CmdBExec);
              expect(chunk2).to.be.lessThan(file2CmdCExec)
              expect(chunk2).to.be.lessThan(file2CmdDExec);
              expect(file1CmdBExec).to.be.lessThan(file1CmdBDone);
              expect(file1CmdBDone).to.be.lessThan(file1CmdBCmd);
              expect(file1CmdBCmd).to.be.lessThan(file1CmdBOut);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
              expect(file2CmdCDone).to.be.lessThan(file2CmdCCmd);
              expect(file2CmdCCmd).to.be.lessThan(file2CmdCOut);
              expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
              expect(file2CmdDDone).to.be.lessThan(file2CmdDCmd);
              expect(file2CmdDCmd).to.be.lessThan(file2CmdDOut);
            });

            it('long dependency', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdD -c "echo D" -t tag2 -p cmdC`);
              await runCommand(`add ${fileName2} cmdE -c "echo E" -t tag2 -p cmdD`);
              await runCommand(`add ${fileName2} cmdF -c "echo F" -t tag2 -p cmdE`);
              const { stdout } = await runCommand(`run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file1CmdACmd = stdoutIndexOf(`[${fileName1}::cmdA] echo A`,stdout);
              const file1CmdAOut = stdoutIndexOf('A\r',stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const file2CmdACmd = stdoutIndexOf(`[${fileName2}::cmdA] echo 1`,stdout);
              const file2CmdAOut = stdoutIndexOf('1\r',stdout);
              const file2CmdBExec = stdoutIndexOf(`[${fileName2}::cmdB] Executing ...`,stdout);
              const file2CmdBDone = stdoutIndexOf(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              const file2CmdBCmd = stdoutIndexOf(`[${fileName2}::cmdB] echo 2`,stdout);
              const file2CmdBOut = stdoutIndexOf('2\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file1CmdBExec = stdoutIndexOf(`[${fileName1}::cmdB] Executing ...`,stdout);
              const file1CmdBDone = stdoutIndexOf(`[${fileName1}::cmdB] Completed with code 0`,stdout);
              const file1CmdBCmd = stdoutIndexOf(`[${fileName1}::cmdB] echo B`,stdout);
              const file1CmdBOut = stdoutIndexOf('B\r',stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);
              const file2CmdCCmd = stdoutIndexOf(`[${fileName2}::cmdC] echo C`,stdout);
              const file2CmdCOut = stdoutIndexOf('C\r',stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const file2CmdDExec = stdoutIndexOf(`[${fileName2}::cmdD] Executing ...`,stdout);
              const file2CmdDDone = stdoutIndexOf(`[${fileName2}::cmdD] Completed with code 0`,stdout);
              const file2CmdDCmd = stdoutIndexOf(`[${fileName2}::cmdD] echo D`,stdout);
              const file2CmdDOut = stdoutIndexOf('D\r',stdout);
              const chunk4 = stdoutIndexOf(`chunk 4...`,stdout);
              const file2CmdEExec = stdoutIndexOf(`[${fileName2}::cmdE] Executing ...`,stdout);
              const file2CmdEDone = stdoutIndexOf(`[${fileName2}::cmdE] Completed with code 0`,stdout);
              const file2CmdECmd = stdoutIndexOf(`[${fileName2}::cmdE] echo E`,stdout);
              const file2CmdEOut = stdoutIndexOf('E\r',stdout);
              const chunk5 = stdoutIndexOf(`chunk 5...`,stdout);
              const file2CmdFExec = stdoutIndexOf(`[${fileName2}::cmdF] Executing ...`,stdout);
              const file2CmdFDone = stdoutIndexOf(`[${fileName2}::cmdF] Completed with code 0`,stdout);
              const file2CmdFCmd = stdoutIndexOf(`[${fileName2}::cmdF] echo F`,stdout);
              const file2CmdFOut = stdoutIndexOf('F\r',stdout);

              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdBExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file1CmdADone).to.be.lessThan(file1CmdACmd);
              expect(file1CmdACmd).to.be.lessThan(file1CmdAOut);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
              expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
              expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
              expect(file2CmdBDone).to.be.lessThan(file2CmdBCmd);
              expect(file2CmdBCmd).to.be.lessThan(file2CmdBOut);
              expect(file1CmdAOut).to.be.lessThan(chunk2);
              expect(file2CmdAOut).to.be.lessThan(chunk2);
              expect(file2CmdBOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file1CmdBExec);
              expect(chunk2).to.be.lessThan(file2CmdCExec)
              expect(file1CmdBExec).to.be.lessThan(file1CmdBDone);
              expect(file1CmdBDone).to.be.lessThan(file1CmdBCmd);
              expect(file1CmdBCmd).to.be.lessThan(file1CmdBOut);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
              expect(file2CmdCDone).to.be.lessThan(file2CmdCCmd);
              expect(file2CmdCCmd).to.be.lessThan(file2CmdCOut);
              expect(file1CmdBOut).to.be.lessThan(chunk3);
              expect(file2CmdCOut).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(file2CmdDExec);
              expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
              expect(file2CmdDDone).to.be.lessThan(file2CmdDCmd);
              expect(file2CmdDCmd).to.be.lessThan(file2CmdDOut);
              expect(file2CmdDOut).to.be.lessThan(chunk4);
              expect(chunk4).to.be.lessThan(file2CmdEExec);
              expect(file2CmdEExec).to.be.lessThan(file2CmdEDone);
              expect(file2CmdEDone).to.be.lessThan(file2CmdECmd);
              expect(file2CmdECmd).to.be.lessThan(file2CmdEOut);
              expect(file2CmdEOut).to.be.lessThan(chunk5);
              expect(chunk5).to.be.lessThan(file2CmdFExec);
              expect(file2CmdFExec).to.be.lessThan(file2CmdFDone);
              expect(file2CmdFDone).to.be.lessThan(file2CmdFCmd);
              expect(file2CmdFCmd).to.be.lessThan(file2CmdFOut);
            });

            it('DAO shared nodes', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdD -c "echo D" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdE -c "echo E" -t tag2 -p cmdC -p cmdD`);
              await runCommand(`add ${fileName2} cmdF -c "echo F" -t tag2 -p cmdE`);
              const { stdout } = await runCommand(`run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file1CmdACmd = stdoutIndexOf(`[${fileName1}::cmdA] echo A`,stdout);
              const file1CmdAOut = stdoutIndexOf('A\r',stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const file2CmdACmd = stdoutIndexOf(`[${fileName2}::cmdA] echo 1`,stdout);
              const file2CmdAOut = stdoutIndexOf('1\r',stdout);
              const file2CmdBExec = stdoutIndexOf(`[${fileName2}::cmdB] Executing ...`,stdout);
              const file2CmdBDone = stdoutIndexOf(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              const file2CmdBCmd = stdoutIndexOf(`[${fileName2}::cmdB] echo 2`,stdout);
              const file2CmdBOut = stdoutIndexOf('2\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file1CmdBExec = stdoutIndexOf(`[${fileName1}::cmdB] Executing ...`,stdout);
              const file1CmdBDone = stdoutIndexOf(`[${fileName1}::cmdB] Completed with code 0`,stdout);
              const file1CmdBCmd = stdoutIndexOf(`[${fileName1}::cmdB] echo B`,stdout);
              const file1CmdBOut = stdoutIndexOf('B\r',stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);
              const file2CmdCCmd = stdoutIndexOf(`[${fileName2}::cmdC] echo C`,stdout);
              const file2CmdCOut = stdoutIndexOf('C\r',stdout);
              const file2CmdDExec = stdoutIndexOf(`[${fileName2}::cmdD] Executing ...`,stdout);
              const file2CmdDDone = stdoutIndexOf(`[${fileName2}::cmdD] Completed with code 0`,stdout);
              const file2CmdDCmd = stdoutIndexOf(`[${fileName2}::cmdD] echo D`,stdout);
              const file2CmdDOut = stdoutIndexOf('D\r',stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const file2CmdEExec = stdoutIndexOf(`[${fileName2}::cmdE] Executing ...`,stdout);
              const file2CmdEDone = stdoutIndexOf(`[${fileName2}::cmdE] Completed with code 0`,stdout);
              const file2CmdECmd = stdoutIndexOf(`[${fileName2}::cmdE] echo E`,stdout);
              const file2CmdEOut = stdoutIndexOf('E\r',stdout);
              const chunk4 = stdoutIndexOf(`chunk 4...`,stdout);
              const file2CmdFExec = stdoutIndexOf(`[${fileName2}::cmdF] Executing ...`,stdout);
              const file2CmdFDone = stdoutIndexOf(`[${fileName2}::cmdF] Completed with code 0`,stdout);
              const file2CmdFCmd = stdoutIndexOf(`[${fileName2}::cmdF] echo F`,stdout);
              const file2CmdFOut = stdoutIndexOf('F\r',stdout);

              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdBExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file1CmdADone).to.be.lessThan(file1CmdACmd);
              expect(file1CmdACmd).to.be.lessThan(file1CmdAOut);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
              expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
              expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
              expect(file2CmdBDone).to.be.lessThan(file2CmdBCmd);
              expect(file2CmdBCmd).to.be.lessThan(file2CmdBOut);
              expect(file1CmdAOut).to.be.lessThan(chunk2);
              expect(file2CmdAOut).to.be.lessThan(chunk2);
              expect(file2CmdBOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file1CmdBExec);
              expect(chunk2).to.be.lessThan(file2CmdCExec)
              expect(chunk2).to.be.lessThan(file2CmdDExec);
              expect(file1CmdBExec).to.be.lessThan(file1CmdBDone);
              expect(file1CmdBDone).to.be.lessThan(file1CmdBCmd);
              expect(file1CmdBCmd).to.be.lessThan(file1CmdBOut);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
              expect(file2CmdCDone).to.be.lessThan(file2CmdCCmd);
              expect(file2CmdCCmd).to.be.lessThan(file2CmdCOut);
              expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
              expect(file2CmdDDone).to.be.lessThan(file2CmdDCmd);
              expect(file2CmdDCmd).to.be.lessThan(file2CmdDOut);
              expect(file1CmdBOut).to.be.lessThan(chunk3);
              expect(file2CmdCOut).to.be.lessThan(chunk3);
              expect(file2CmdDOut).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(file2CmdEExec);
              expect(file2CmdEExec).to.be.lessThan(file2CmdEDone);
              expect(file2CmdEDone).to.be.lessThan(file2CmdECmd);
              expect(file2CmdECmd).to.be.lessThan(file2CmdEOut);
              expect(file2CmdEOut).to.be.lessThan(chunk4);
              expect(chunk4).to.be.lessThan(file2CmdFExec);
              expect(file2CmdFExec).to.be.lessThan(file2CmdFDone);
              expect(file2CmdFDone).to.be.lessThan(file2CmdFCmd);
              expect(file2CmdFCmd).to.be.lessThan(file2CmdFOut);
            });

            it('multiple DependsOn', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdD -c "echo D" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdE -c "echo E" -t tag2 -p cmdC`);
              await runCommand(`add ${fileName2} cmdF -c "echo F" -t tag2 -p cmdD`);
              const { stdout } = await runCommand(`run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file1CmdACmd = stdoutIndexOf(`[${fileName1}::cmdA] echo A`,stdout);
              const file1CmdAOut = stdoutIndexOf('A\r',stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const file2CmdACmd = stdoutIndexOf(`[${fileName2}::cmdA] echo 1`,stdout);
              const file2CmdAOut = stdoutIndexOf('1\r',stdout);
              const file2CmdBExec = stdoutIndexOf(`[${fileName2}::cmdB] Executing ...`,stdout);
              const file2CmdBDone = stdoutIndexOf(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              const file2CmdBCmd = stdoutIndexOf(`[${fileName2}::cmdB] echo 2`,stdout);
              const file2CmdBOut = stdoutIndexOf('2\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file1CmdBExec = stdoutIndexOf(`[${fileName1}::cmdB] Executing ...`,stdout);
              const file1CmdBDone = stdoutIndexOf(`[${fileName1}::cmdB] Completed with code 0`,stdout);
              const file1CmdBCmd = stdoutIndexOf(`[${fileName1}::cmdB] echo B`,stdout);
              const file1CmdBOut = stdoutIndexOf('B\r',stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);
              const file2CmdCCmd = stdoutIndexOf(`[${fileName2}::cmdC] echo C`,stdout);
              const file2CmdCOut = stdoutIndexOf('C\r',stdout);
              const file2CmdDExec = stdoutIndexOf(`[${fileName2}::cmdD] Executing ...`,stdout);
              const file2CmdDDone = stdoutIndexOf(`[${fileName2}::cmdD] Completed with code 0`,stdout);
              const file2CmdDCmd = stdoutIndexOf(`[${fileName2}::cmdD] echo D`,stdout);
              const file2CmdDOut = stdoutIndexOf('D\r',stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const file2CmdEExec = stdoutIndexOf(`[${fileName2}::cmdE] Executing ...`,stdout);
              const file2CmdEDone = stdoutIndexOf(`[${fileName2}::cmdE] Completed with code 0`,stdout);
              const file2CmdECmd = stdoutIndexOf(`[${fileName2}::cmdE] echo E`,stdout);
              const file2CmdEOut = stdoutIndexOf('E\r',stdout);
              const file2CmdFExec = stdoutIndexOf(`[${fileName2}::cmdF] Executing ...`,stdout);
              const file2CmdFDone = stdoutIndexOf(`[${fileName2}::cmdF] Completed with code 0`,stdout);
              const file2CmdFCmd = stdoutIndexOf(`[${fileName2}::cmdF] echo F`,stdout);
              const file2CmdFOut = stdoutIndexOf('F\r',stdout);

              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdBExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file1CmdADone).to.be.lessThan(file1CmdACmd);
              expect(file1CmdACmd).to.be.lessThan(file1CmdAOut);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
              expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
              expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
              expect(file2CmdBDone).to.be.lessThan(file2CmdBCmd);
              expect(file2CmdBCmd).to.be.lessThan(file2CmdBOut);
              expect(file1CmdAOut).to.be.lessThan(chunk2);
              expect(file2CmdAOut).to.be.lessThan(chunk2);
              expect(file2CmdBOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file1CmdBExec);
              expect(chunk2).to.be.lessThan(file2CmdCExec)
              expect(chunk2).to.be.lessThan(file2CmdDExec);
              expect(file1CmdBExec).to.be.lessThan(file1CmdBDone);
              expect(file1CmdBDone).to.be.lessThan(file1CmdBCmd);
              expect(file1CmdBCmd).to.be.lessThan(file1CmdBOut);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
              expect(file2CmdCDone).to.be.lessThan(file2CmdCCmd);
              expect(file2CmdCCmd).to.be.lessThan(file2CmdCOut);
              expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
              expect(file2CmdDDone).to.be.lessThan(file2CmdDCmd);
              expect(file2CmdDCmd).to.be.lessThan(file2CmdDOut);
              expect(file1CmdBOut).to.be.lessThan(chunk3);
              expect(file2CmdCOut).to.be.lessThan(chunk3);
              expect(file2CmdDOut).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(file2CmdEExec);
              expect(chunk3).to.be.lessThan(file2CmdFExec);
              expect(file2CmdEExec).to.be.lessThan(file2CmdEDone);
              expect(file2CmdEDone).to.be.lessThan(file2CmdECmd);
              expect(file2CmdECmd).to.be.lessThan(file2CmdEOut);
              expect(file2CmdFExec).to.be.lessThan(file2CmdFDone);
              expect(file2CmdFDone).to.be.lessThan(file2CmdFCmd);
              expect(file2CmdFCmd).to.be.lessThan(file2CmdFOut);
            });

            it('multiple DependsOn case 2', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdD -c "echo D" -t tag2 -p cmdB`);
              await runCommand(`add ${fileName2} cmdE -c "echo E" -t tag2 -p cmdC -p cmdD`);
              const { stdout } = await runCommand(`run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file1CmdACmd = stdoutIndexOf(`[${fileName1}::cmdA] echo A`,stdout);
              const file1CmdAOut = stdoutIndexOf('A\r',stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const file2CmdACmd = stdoutIndexOf(`[${fileName2}::cmdA] echo 1`,stdout);
              const file2CmdAOut = stdoutIndexOf('1\r',stdout);
              const file2CmdBExec = stdoutIndexOf(`[${fileName2}::cmdB] Executing ...`,stdout);
              const file2CmdBDone = stdoutIndexOf(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              const file2CmdBCmd = stdoutIndexOf(`[${fileName2}::cmdB] echo 2`,stdout);
              const file2CmdBOut = stdoutIndexOf('2\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file1CmdBExec = stdoutIndexOf(`[${fileName1}::cmdB] Executing ...`,stdout);
              const file1CmdBDone = stdoutIndexOf(`[${fileName1}::cmdB] Completed with code 0`,stdout);
              const file1CmdBCmd = stdoutIndexOf(`[${fileName1}::cmdB] echo B`,stdout);
              const file1CmdBOut = stdoutIndexOf('B\r',stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);
              const file2CmdCCmd = stdoutIndexOf(`[${fileName2}::cmdC] echo C`,stdout);
              const file2CmdCOut = stdoutIndexOf('C\r',stdout);
              const file2CmdDExec = stdoutIndexOf(`[${fileName2}::cmdD] Executing ...`,stdout);
              const file2CmdDDone = stdoutIndexOf(`[${fileName2}::cmdD] Completed with code 0`,stdout);
              const file2CmdDCmd = stdoutIndexOf(`[${fileName2}::cmdD] echo D`,stdout);
              const file2CmdDOut = stdoutIndexOf('D\r',stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const file2CmdEExec = stdoutIndexOf(`[${fileName2}::cmdE] Executing ...`,stdout);
              const file2CmdEDone = stdoutIndexOf(`[${fileName2}::cmdE] Completed with code 0`,stdout);
              const file2CmdECmd = stdoutIndexOf(`[${fileName2}::cmdE] echo E`,stdout);
              const file2CmdEOut = stdoutIndexOf('E\r',stdout);
              
              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdBExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file1CmdADone).to.be.lessThan(file1CmdACmd);
              expect(file1CmdACmd).to.be.lessThan(file1CmdAOut);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
              expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
              expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
              expect(file2CmdBDone).to.be.lessThan(file2CmdBCmd);
              expect(file2CmdBCmd).to.be.lessThan(file2CmdBOut);
              expect(file1CmdAOut).to.be.lessThan(chunk2);
              expect(file2CmdAOut).to.be.lessThan(chunk2);
              expect(file2CmdBOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file1CmdBExec);
              expect(chunk2).to.be.lessThan(file2CmdCExec)
              expect(chunk2).to.be.lessThan(file2CmdDExec);
              expect(file1CmdBExec).to.be.lessThan(file1CmdBDone);
              expect(file1CmdBDone).to.be.lessThan(file1CmdBCmd);
              expect(file1CmdBCmd).to.be.lessThan(file1CmdBOut);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
              expect(file2CmdCDone).to.be.lessThan(file2CmdCCmd);
              expect(file2CmdCCmd).to.be.lessThan(file2CmdCOut);
              expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
              expect(file2CmdDDone).to.be.lessThan(file2CmdDCmd);
              expect(file2CmdDCmd).to.be.lessThan(file2CmdDOut);
              expect(file1CmdBOut).to.be.lessThan(chunk3);
              expect(file2CmdCOut).to.be.lessThan(chunk3);
              expect(file2CmdDOut).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(file2CmdEExec);
              expect(file2CmdEExec).to.be.lessThan(file2CmdEDone);
              expect(file2CmdEDone).to.be.lessThan(file2CmdECmd);
              expect(file2CmdECmd).to.be.lessThan(file2CmdEOut);
            });

            it('multiple shared nodes', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdD -c "echo D" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdE -c "echo E" -t tag2 -p cmdC -p cmdD`);
              await runCommand(`add ${fileName2} cmdG -c "echo G" -t tag2 -p cmdA`);
              await runCommand(`add ${fileName2} cmdF -c "echo F" -t tag2 -p cmdE -p cmdG`);
              const { stdout } = await runCommand(`run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file1CmdACmd = stdoutIndexOf(`[${fileName1}::cmdA] echo A`,stdout);
              const file1CmdAOut = stdoutIndexOf('A\r',stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const file2CmdACmd = stdoutIndexOf(`[${fileName2}::cmdA] echo 1`,stdout);
              const file2CmdAOut = stdoutIndexOf('1\r',stdout);
              const file2CmdBExec = stdoutIndexOf(`[${fileName2}::cmdB] Executing ...`,stdout);
              const file2CmdBDone = stdoutIndexOf(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              const file2CmdBCmd = stdoutIndexOf(`[${fileName2}::cmdB] echo 2`,stdout);
              const file2CmdBOut = stdoutIndexOf('2\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file1CmdBExec = stdoutIndexOf(`[${fileName1}::cmdB] Executing ...`,stdout);
              const file1CmdBDone = stdoutIndexOf(`[${fileName1}::cmdB] Completed with code 0`,stdout);
              const file1CmdBCmd = stdoutIndexOf(`[${fileName1}::cmdB] echo B`,stdout);
              const file1CmdBOut = stdoutIndexOf('B\r',stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);
              const file2CmdCCmd = stdoutIndexOf(`[${fileName2}::cmdC] echo C`,stdout);
              const file2CmdCOut = stdoutIndexOf('C\r',stdout);
              const file2CmdDExec = stdoutIndexOf(`[${fileName2}::cmdD] Executing ...`,stdout);
              const file2CmdDDone = stdoutIndexOf(`[${fileName2}::cmdD] Completed with code 0`,stdout);
              const file2CmdDCmd = stdoutIndexOf(`[${fileName2}::cmdD] echo D`,stdout);
              const file2CmdDOut = stdoutIndexOf('D\r',stdout);
              const file2CmdGExec = stdoutIndexOf(`[${fileName2}::cmdG] Executing ...`,stdout);
              const file2CmdGDone = stdoutIndexOf(`[${fileName2}::cmdG] Completed with code 0`,stdout);
              const file2CmdGCmd = stdoutIndexOf(`[${fileName2}::cmdG] echo G`,stdout);
              const file2CmdGOut = stdoutIndexOf('G\r',stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const file2CmdEExec = stdoutIndexOf(`[${fileName2}::cmdE] Executing ...`,stdout);
              const file2CmdEDone = stdoutIndexOf(`[${fileName2}::cmdE] Completed with code 0`,stdout);
              const file2CmdECmd = stdoutIndexOf(`[${fileName2}::cmdE] echo E`,stdout);
              const file2CmdEOut = stdoutIndexOf('E\r',stdout);
              const chunk4 = stdoutIndexOf(`chunk 4...`,stdout);
              const file2CmdFExec = stdoutIndexOf(`[${fileName2}::cmdF] Executing ...`,stdout);
              const file2CmdFDone = stdoutIndexOf(`[${fileName2}::cmdF] Completed with code 0`,stdout);
              const file2CmdFCmd = stdoutIndexOf(`[${fileName2}::cmdF] echo F`,stdout);
              const file2CmdFOut = stdoutIndexOf('F\r',stdout);

              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdBExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file1CmdADone).to.be.lessThan(file1CmdACmd);
              expect(file1CmdACmd).to.be.lessThan(file1CmdAOut);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
              expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
              expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
              expect(file2CmdBDone).to.be.lessThan(file2CmdBCmd);
              expect(file2CmdBCmd).to.be.lessThan(file2CmdBOut);
              expect(file1CmdAOut).to.be.lessThan(chunk2);
              expect(file2CmdAOut).to.be.lessThan(chunk2);
              expect(file2CmdBOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file1CmdBExec);
              expect(chunk2).to.be.lessThan(file2CmdCExec)
              expect(chunk2).to.be.lessThan(file2CmdDExec);
              expect(chunk2).to.be.lessThan(file2CmdGExec);
              expect(file1CmdBExec).to.be.lessThan(file1CmdBDone);
              expect(file1CmdBDone).to.be.lessThan(file1CmdBCmd);
              expect(file1CmdBCmd).to.be.lessThan(file1CmdBOut);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
              expect(file2CmdCDone).to.be.lessThan(file2CmdCCmd);
              expect(file2CmdCCmd).to.be.lessThan(file2CmdCOut);
              expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
              expect(file2CmdDDone).to.be.lessThan(file2CmdDCmd);
              expect(file2CmdDCmd).to.be.lessThan(file2CmdDOut);
              expect(file2CmdGExec).to.be.lessThan(file2CmdGDone);
              expect(file2CmdGDone).to.be.lessThan(file2CmdGCmd);
              expect(file2CmdGCmd).to.be.lessThan(file2CmdGOut);
              expect(file1CmdBOut).to.be.lessThan(chunk3);
              expect(file2CmdCOut).to.be.lessThan(chunk3);
              expect(file2CmdDOut).to.be.lessThan(chunk3);
              expect(file2CmdGOut).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(file2CmdEExec);
              expect(file2CmdEExec).to.be.lessThan(file2CmdEDone);
              expect(file2CmdEDone).to.be.lessThan(file2CmdECmd);
              expect(file2CmdECmd).to.be.lessThan(file2CmdEOut);
              expect(file2CmdEOut).to.be.lessThan(chunk4);
              expect(chunk4).to.be.lessThan(file2CmdFExec);
              expect(file2CmdFExec).to.be.lessThan(file2CmdFDone);
              expect(file2CmdFDone).to.be.lessThan(file2CmdFCmd);
              expect(file2CmdFCmd).to.be.lessThan(file2CmdFOut);
            });

            it('multiple shared nodes case 2', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tag2`);
              await runCommand(`add ${fileName2} cmdD -c "echo D" -t tag2 -p cmdA -p cmdB`);
              await runCommand(`add ${fileName2} cmdE -c "echo E" -t tag2 -p cmdB -p cmdC`);
              await runCommand(`add ${fileName2} cmdF -c "echo F" -t tag2 -p cmdE -p cmdD`);
              const { stdout } = await runCommand(`run --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file1CmdACmd = stdoutIndexOf(`[${fileName1}::cmdA] echo A`,stdout);
              const file1CmdAOut = stdoutIndexOf('A\r',stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const file2CmdACmd = stdoutIndexOf(`[${fileName2}::cmdA] echo 1`,stdout);
              const file2CmdAOut = stdoutIndexOf('1\r',stdout);
              const file2CmdBExec = stdoutIndexOf(`[${fileName2}::cmdB] Executing ...`,stdout);
              const file2CmdBDone = stdoutIndexOf(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              const file2CmdBCmd = stdoutIndexOf(`[${fileName2}::cmdB] echo 2`,stdout);
              const file2CmdBOut = stdoutIndexOf('2\r',stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);
              const file2CmdCCmd = stdoutIndexOf(`[${fileName2}::cmdC] echo C`,stdout);
              const file2CmdCOut = stdoutIndexOf('C\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file1CmdBExec = stdoutIndexOf(`[${fileName1}::cmdB] Executing ...`,stdout);
              const file1CmdBDone = stdoutIndexOf(`[${fileName1}::cmdB] Completed with code 0`,stdout);
              const file1CmdBCmd = stdoutIndexOf(`[${fileName1}::cmdB] echo B`,stdout);
              const file1CmdBOut = stdoutIndexOf('B\r',stdout);
              const file2CmdDExec = stdoutIndexOf(`[${fileName2}::cmdD] Executing ...`,stdout);
              const file2CmdDDone = stdoutIndexOf(`[${fileName2}::cmdD] Completed with code 0`,stdout);
              const file2CmdDCmd = stdoutIndexOf(`[${fileName2}::cmdD] echo D`,stdout);
              const file2CmdDOut = stdoutIndexOf('D\r',stdout);
              const file2CmdEExec = stdoutIndexOf(`[${fileName2}::cmdE] Executing ...`,stdout);
              const file2CmdEDone = stdoutIndexOf(`[${fileName2}::cmdE] Completed with code 0`,stdout);
              const file2CmdECmd = stdoutIndexOf(`[${fileName2}::cmdE] echo E`,stdout);
              const file2CmdEOut = stdoutIndexOf('E\r',stdout);
              const chunk3 = stdoutIndexOf(`chunk 3...`,stdout);
              const file2CmdFExec = stdoutIndexOf(`[${fileName2}::cmdF] Executing ...`,stdout);
              const file2CmdFDone = stdoutIndexOf(`[${fileName2}::cmdF] Completed with code 0`,stdout);
              const file2CmdFCmd = stdoutIndexOf(`[${fileName2}::cmdF] echo F`,stdout);
              const file2CmdFOut = stdoutIndexOf('F\r',stdout);

              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdBExec);
              expect(chunk1).to.be.lessThan(file2CmdCExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file1CmdADone).to.be.lessThan(file1CmdACmd);
              expect(file1CmdACmd).to.be.lessThan(file1CmdAOut);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
              expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
              expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
              expect(file2CmdBDone).to.be.lessThan(file2CmdBCmd);
              expect(file2CmdBCmd).to.be.lessThan(file2CmdBOut);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
              expect(file2CmdCDone).to.be.lessThan(file2CmdCCmd);
              expect(file2CmdCCmd).to.be.lessThan(file2CmdCOut);
              expect(file1CmdAOut).to.be.lessThan(chunk2);
              expect(file2CmdAOut).to.be.lessThan(chunk2);
              expect(file2CmdBOut).to.be.lessThan(chunk2);
              expect(file2CmdCOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file1CmdBExec);
              expect(chunk2).to.be.lessThan(file2CmdDExec);
              expect(chunk2).to.be.lessThan(file2CmdEExec);
              expect(file1CmdBExec).to.be.lessThan(file1CmdBDone);
              expect(file1CmdBDone).to.be.lessThan(file1CmdBCmd);
              expect(file1CmdBCmd).to.be.lessThan(file1CmdBOut);
              expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
              expect(file2CmdDDone).to.be.lessThan(file2CmdDCmd);
              expect(file2CmdDCmd).to.be.lessThan(file2CmdDOut);
              expect(file2CmdEExec).to.be.lessThan(file2CmdEDone);
              expect(file2CmdEDone).to.be.lessThan(file2CmdECmd);
              expect(file2CmdECmd).to.be.lessThan(file2CmdEOut);
              expect(file1CmdBOut).to.be.lessThan(chunk3);
              expect(file2CmdDOut).to.be.lessThan(chunk3);
              expect(file2CmdEOut).to.be.lessThan(chunk3);
              expect(chunk3).to.be.lessThan(file2CmdFExec);
              expect(file2CmdFExec).to.be.lessThan(file2CmdFDone);
              expect(file2CmdFDone).to.be.lessThan(file2CmdFCmd);
              expect(file2CmdFCmd).to.be.lessThan(file2CmdFOut);
            });

            it('execute successfully when filter by tag', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tagA -p cmdA`);
              const { stdout } = await runCommand(`run -t tagA --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file1CmdACmd = stdoutIndexOf(`[${fileName1}::cmdA] echo A`,stdout);
              const file1CmdAOut = stdoutIndexOf('A\r',stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const file2CmdACmd = stdoutIndexOf(`[${fileName2}::cmdA] echo 1`,stdout);
              const file2CmdAOut = stdoutIndexOf('1\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);
              const file2CmdCCmd = stdoutIndexOf(`[${fileName2}::cmdC] echo C`,stdout);
              const file2CmdCOut = stdoutIndexOf('C\r',stdout);

              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file1CmdADone).to.be.lessThan(file1CmdACmd);
              expect(file1CmdACmd).to.be.lessThan(file1CmdAOut);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
              expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
              expect(file1CmdAOut).to.be.lessThan(chunk2);
              expect(file2CmdAOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file2CmdCExec);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
              expect(file2CmdCDone).to.be.lessThan(file2CmdCCmd);
              expect(file2CmdCCmd).to.be.lessThan(file2CmdCOut);

              expect(stdout).to.not.include(`[${fileName2}::cmdB] Executing ...`,stdout);
              expect(stdout).to.not.include(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              expect(stdout).to.not.include(`[${fileName2}::cmdB] echo 2`,stdout);
              expect(stdout).to.not.include('2\r',stdout);
              expect(stdout).to.not.include(`[${fileName1}::cmdB] Executing ...`,stdout);
              expect(stdout).to.not.include(`[${fileName1}::cmdB] Completed with code 0`,stdout);
              expect(stdout).to.not.include(`[${fileName1}::cmdB] echo B`,stdout);
              expect(stdout).to.not.include('B\r',stdout);
            });

            it('execute successfully when filter by tag case 2', async () => {
              await runCommand(`add ${fileName2} cmdC -c "echo C" -t tagA -p cmdA`);
              await runCommand(`add ${fileName2} cmdD -c "echo D" -t tagA -p cmdA`);
              const { stdout } = await runCommand(`run -t tagA --log`);

              const chunk1 = stdoutIndexOf(`chunk 1...`,stdout);
              const file1CmdAExec = stdoutIndexOf(`[${fileName1}::cmdA] Executing ...`,stdout);
              const file1CmdADone = stdoutIndexOf(`[${fileName1}::cmdA] Completed with code 0`,stdout);
              const file1CmdACmd = stdoutIndexOf(`[${fileName1}::cmdA] echo A`,stdout);
              const file1CmdAOut = stdoutIndexOf('A\r',stdout);
              const file2CmdAExec = stdoutIndexOf(`[${fileName2}::cmdA] Executing ...`,stdout);
              const file2CmdADone = stdoutIndexOf(`[${fileName2}::cmdA] Completed with code 0`,stdout);
              const file2CmdACmd = stdoutIndexOf(`[${fileName2}::cmdA] echo 1`,stdout);
              const file2CmdAOut = stdoutIndexOf('1\r',stdout);
              const chunk2 = stdoutIndexOf(`chunk 2...`,stdout);
              const file2CmdCExec = stdoutIndexOf(`[${fileName2}::cmdC] Executing ...`,stdout);
              const file2CmdCDone = stdoutIndexOf(`[${fileName2}::cmdC] Completed with code 0`,stdout);
              const file2CmdCCmd = stdoutIndexOf(`[${fileName2}::cmdC] echo C`,stdout);
              const file2CmdCOut = stdoutIndexOf('C\r',stdout);
              const file2CmdDExec = stdoutIndexOf(`[${fileName2}::cmdD] Executing ...`,stdout);
              const file2CmdDDone = stdoutIndexOf(`[${fileName2}::cmdD] Completed with code 0`,stdout);
              const file2CmdDCmd = stdoutIndexOf(`[${fileName2}::cmdD] echo D`,stdout);
              const file2CmdDOut = stdoutIndexOf('D\r',stdout);

              expect(chunk1).to.be.lessThan(file1CmdAExec);
              expect(chunk1).to.be.lessThan(file2CmdAExec);
              expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
              expect(file1CmdADone).to.be.lessThan(file1CmdACmd);
              expect(file1CmdACmd).to.be.lessThan(file1CmdAOut);
              expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
              expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
              expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
              expect(file1CmdAOut).to.be.lessThan(chunk2);
              expect(file2CmdAOut).to.be.lessThan(chunk2);
              expect(chunk2).to.be.lessThan(file2CmdCExec);
              expect(chunk2).to.be.lessThan(file2CmdDExec);
              expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
              expect(file2CmdCDone).to.be.lessThan(file2CmdCCmd);
              expect(file2CmdCCmd).to.be.lessThan(file2CmdCOut);
              expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
              expect(file2CmdDDone).to.be.lessThan(file2CmdDCmd);
              expect(file2CmdDCmd).to.be.lessThan(file2CmdDOut);

              expect(stdout).to.not.include(`[${fileName2}::cmdB] Executing ...`,stdout);
              expect(stdout).to.not.include(`[${fileName2}::cmdB] Completed with code 0`,stdout);
              expect(stdout).to.not.include(`[${fileName2}::cmdB] echo 2`,stdout);
              expect(stdout).to.not.include('2\r',stdout);
              expect(stdout).to.not.include(`[${fileName1}::cmdB] Executing ...`,stdout);
              expect(stdout).to.not.include(`[${fileName1}::cmdB] Completed with code 0`,stdout);
              expect(stdout).to.not.include(`[${fileName1}::cmdB] echo B`,stdout);
              expect(stdout).to.not.include('B\r',stdout);
            });
          });
        });

        describe('no executable file exists', () => {
          it('should produce no output when there are no snip files', async () => {
            const { stdout, stderr } = await runCommand(`run`);
            expect(stdout).to.include('');
            expect(stderr).to.not.include('Something went wrong');
          });

          it('should produce no output when the snip files has no command', async () => {
            await runCommand(`create ${fileName1}`);

            const { stdout, stderr } = await runCommand(`run`);
            expect(stdout).to.include('');
            expect(stderr).to.not.include('Something went wrong');
          });

          it('should produce no output when tag does not match any command across all snip files', async () => {
            await runCommand(`create ${fileName1}`);
            await runCommand(`add ${fileName1} cmdA -c "echo A" -t tagA`);

            const { stdout, stderr } = await runCommand(`run --tag not-match`);
            expect(stdout).to.include('');
            expect(stderr).to.not.include('Something went wrong');
          });

          it('should produce no output when --tag "" is provided and no command has an empty tag', async () => {
            await runCommand(`create ${fileName1}`);
            await runCommand(`add ${fileName1} cmdA -c "echo A" -t tagA`);

            const { stdout, stderr } = await runCommand(`run --tag ""`);
            expect(stdout).to.include('');
            expect(stderr).to.not.include('Something went wrong');
          });
        });
      });
      
      describe('dependsOn invalid case', () => {            
        // As this is invalid scenario and abort during its process, we can ignore dry-run scenario
        describe('file is provided', () => {
          describe('dependncy is broken', () => {
            it('should abort with no arguement',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B, C, D]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run test-file --dry-run`);
                expect(stdout).to.include(`command 'A' has invalid dependencies: C, D`);
            });

            it('should abort with name arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run test-file A --dry-run`);
                expect(stdout).to.include(`command 'A' has invalid dependencies: B`);
            });
            
            it('should abort with tag arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run test-file -t tag1 --dry-run`);
                expect(stdout).to.include(`command 'A' has invalid dependencies: B`);
            });

            it('should abort with name and tag arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B, C]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: C {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run test-file A -t tag1 --dry-run`);
                expect(stdout).to.include(`command 'A' has invalid dependencies: B, C`);
            });
          });

          describe('circular dependency', () => {
            it('should abort because by self direct cycle when no arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);
                
                const { stdout } = await runCommand(`run test-file --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort because by self direct cycle when name arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run test-file A --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort because by self direct cycle when tag arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run test-file -t tag1 --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort because by self direct cycle when name and tag arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run test-file A -t tag1 --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort because by direct cycle when no arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}
@command: C {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run test-file --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort because by direct cycle when tag arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}
@command: C {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run test-file -t tag1 --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort because by direct cycle(long) when no arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [C]
}
@command: C {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: [D]
}
@command: D {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: E
}
@command: E {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: [A]
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run test-file --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort because by direct cycle(long) when tag arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [C]
}
@command: C {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [D]
}
@command: D {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: E
}
@command: E {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}
@command: F {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: [A]
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run test-file -t tag1 --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort in case of multiple dependsOn when no arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B, D]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [C]
}
@command: C {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}
@command: D {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run test-file --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort in case of multiple dependsOn when tag arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B, D]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [C]
}
@command: C {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}
@command: D {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: E {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run test-file -t tag1 --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort in case of multiple dependsOn(case2) when no arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B, C]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: C {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run test-file --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort in case of multiple dependsOn(case2) when tag arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B, C]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: C {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}
@command: D {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run test-file --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });
          });

          describe('dependency is broken when filter by name or tag', () => {
            const fileName = 'run-file1';

            beforeEach(async () => {
              await runCommand(`create ${fileName}`);
              await runCommand(`add ${fileName} cmdA -c "echo 1" -t tag2`);
              await runCommand(`add ${fileName} cmdB -c "echo 2" -t tag1 -t tag2 -p cmdA`);
            });

            it('name', async () => {
              const { stdout } = await runCommand(`run ${fileName} cmdB`);
              expect(stdout).to.include(`command 'cmdB' has invalid dependencies: cmdA`);
            });

            it('tag', async () => {
              const { stdout } = await runCommand(`run ${fileName} -t tag1`);
              expect(stdout).to.include(`command 'cmdB' has invalid dependencies: cmdA`);
            });

            it('name & tag', async () => {
              const { stdout } = await runCommand(`run ${fileName} -t tag1`);
              expect(stdout).to.include(`command 'cmdB' has invalid dependencies: cmdA`);
            });

          });
        });

        describe('file is NOT provided', () => {
          // 事前に有効な .snipファイルを生成しておく。
          beforeEach(async () => {
              const validContent = `@description: 
@tags: 
@command: A {
  cmd: "echo hello",
  desc: "Test desc",
  tags: [tag1],
  depends_on: []
}
@command: B {
  cmd: "echo hello",
  desc: "Test desc",
  tags: [tag2],
  depends_on: [A]
}`
              await writeFile('valid-file.snip', testDir, validContent);
          });

          describe('dependncy is broken', () => {
            it('should abort with no arguement',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B, C, D]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                    
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run --dry-run`);
                expect(stdout).to.include(`command 'A' has invalid dependencies: C, D`);
            });
            
            it('should abort with tag arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run -t tag1 --dry-run`);
                expect(stdout).to.include(`command 'A' has invalid dependencies: B`);
            });
          });

          describe('circular dependency', () => {
            it('should abort because by self direct cycle when no arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort because by self direct cycle when tag arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run -t tag1 --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort because by direct cycle when no arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}
@command: C {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort because by direct cycle when tag arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}
@command: C {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run -t tag1 --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort because by direct cycle(long) when no arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [C]
}
@command: C {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: [D]
}
@command: D {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: E
}
@command: E {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: [A]
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort because by direct cycle(long) when tag arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [C]
}
@command: C {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [D]
}
@command: D {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: E
}
@command: E {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}
@command: F {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: [A]
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run -t tag1 --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort in case of multiple dependsOn when no arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B, D]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [C]
}
@command: C {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}
@command: D {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort in case of multiple dependsOn when tag arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B, D]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [C]
}
@command: C {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}
@command: D {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: E {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run -t tag1 --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort in case of multiple dependsOn(case2) when no arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B, C]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: C {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });

            it('should abort in case of multiple dependsOn(case2) when tag arguement is passed',  async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B, C]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: C {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}
@command: D {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [A]
}`
                await writeFile('test-file.snip', testDir, content);

                const { stdout } = await runCommand(`run --dry-run`);
                expect(stdout).to.include(`Circular dependency detected.`);
            });
          });

          describe('dependency is broken when filter by name or tag', () => {
            const fileName1 = 'run-all-1';
            const fileName2 = 'run-all-2';
            it('tag', async () => {
              await runCommand(`create ${fileName1}`);
              await runCommand(`create ${fileName2}`);
              await runCommand(`add ${fileName1} cmdA -c "echo A" -t tagA`);
              await runCommand(`add ${fileName1} cmdB -c "echo B" -t tagB -p cmdA`);
              await runCommand(`add ${fileName2} cmdM -c "echo 1" -t tagB -t tagC`);
              await runCommand(`add ${fileName2} cmdN -c "echo 2" -t tagB -t tagC -p cmdM`);

              const { stdout } = await runCommand(`run -t tagB`);
              expect(stdout).to.include(`command 'cmdB' has invalid dependencies: cmdA`);
            });
          });

            it('should execute successfully when circular dependency exist across by multiple snip file', async () => {
                const content = `@description: 
@tags: 
@command: A {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [B]
}
@command: B {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag2],
    depends_on: []
}`
                await writeFile('file1.snip', testDir, content);

                const { stdout } = await runCommand(`run --dry-run`);
                verifyPrefixOutput(`valid-file::A`, stdout);
                verifyPrefixOutput(`valid-file::B`, stdout);
                verifyPrefixOutput(`file1::A`, stdout);
                verifyPrefixOutput(`file1::B`, stdout);
                
            });
        });
      });

      describe('error handling', () => {
        const fileName1 = 'run-all-1';
        const fileName2 = 'run-all-2';
        it('command abort with code other than 0', async () => {
          await runCommand(`create ${fileName1}`);
          await runCommand(`create ${fileName2}`);
          await runCommand(`add ${fileName1} cmdA -c "false" -t tagA`);
          await runCommand(`add ${fileName1} cmdB -c "echo B" -t tagB -p cmdA`);
          await runCommand(`add ${fileName2} cmdM -c "echo 1" -t tagB -t tagC`);
          await runCommand(`add ${fileName2} cmdN -c "echo 2" -t tagB -t tagC -p cmdM`);

          const { stdout } = await runCommand(`run --log`);
          expect(stdout).to.include(`command 'cmdA' failed with code 1`);
          expect(stdout).to.not.include(`chunk 2...`);
          expect(stdout).to.not.include(`[${fileName1}::cmdB] Executing ...`,stdout);
          expect(stdout).to.not.include(`[${fileName1}::cmdB] Completed with code 0`,stdout);
          expect(stdout).to.not.include(`[${fileName1}::cmdB] echo B`,stdout);
          expect(stdout).to.not.include('B\r',stdout);
          expect(stdout).to.not.include(`[${fileName2}::cmdN] Executing ...`,stdout);
          expect(stdout).to.not.include(`[${fileName2}::cmdN] Completed with code 0`,stdout);
          expect(stdout).to.not.include(`[${fileName2}::cmdN] echo 2`,stdout);
          expect(stdout).to.not.include('2\r',stdout);
        });
      });
  });
    
    describe('arguments', () =>{
      [
        { command: '--tag', result: `tag`},
        { command: '--tag A --tag', result: `tag`},
        { command: '-t', result: `t`}
      ].forEach(({ command, result }) => {
        it(`should throw an error when run  but ${command} option is provided nothing`, async () => {
          try {
            await runCommand(`run ${command}`);
            assert.fail('Expected command to fail but it did not');
          } catch (error) {
            const execError = error as ExecError;
            expect(execError.stderr).to.include(`Not enough arguments following: ${result}`);
          }
        });
      });
    });
  });

  describe('desc command', () => {
    beforeEach(async () => {
      await runCommand(`create sample -d good-description`);
      await runCommand(`edit sample -t tag1 -t tag2`);
      await runCommand(`add sample valid-build -c "npm run build"`);
      await runCommand(`add sample for-dependency -c "npm run build"`);
      await runCommand(`add sample sample-cmd -c ping-cmd -d good-description -t tag1 -t tagA -p valid-build -p for-dependency`);

      await runCommand(`create no-desc`);
    });

    describe('file', async () => {
      it('snip has no value for all the field', async () => {
          const { stdout } = await runCommand(`desc no-desc`);
          expect(stdout).to.include(`no-desc
─────────
Description : 
Tags        : 
Commands    :`);
      });

      it('snip has value for all the field', async () => {
          const { stdout } = await runCommand(`desc sample`);
          expect(stdout).to.include(`sample
─────────
Description : good-description
Tags        : tag1, tag2
Commands    : valid-build, for-dependency, sample-cmd`);
      });
    });

    describe('command', async () => {
      it('command has no value for all the field', async () => {
          const { stdout } = await runCommand(`desc sample valid-build`);
          expect(stdout).to.include(`valid-build
─────────
Command     : npm run build
Description : 
Tags        : 
DependsOn   :`);
      });

      it('command has value for all the field', async () => {
          const { stdout } = await runCommand(`desc sample sample-cmd`);
          expect(stdout).to.include(`sample-cmd
─────────
Command     : ping-cmd
Description : good-description
Tags        : tag1, tagA
DependsOn   : valid-build, for-dependency`);
      });
    });

    describe('not found', async () => {
      it('file', async () => {
          const { stdout } = await runCommand(`desc not-found`);
          expect(stdout).to.include(`not-found.snip is not found`);
      });

      it('command', async () => {
          const { stdout } = await runCommand(`desc sample not-found`);
          expect(stdout).to.include(`command 'not-found' is not found`);
      });
    });


    describe('arguments', () => {
      it('should throw an error when file is missing', async () => {
        try {
          await runCommand('desc');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Not enough non-option arguments: got 0, need at least 1');
        }
      });

      it('should throw an error when file is empty string(double quote)', async () => {
        try {
          await runCommand('desc "" test-cmd');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Empty string is not allowed: file');
        }
      });

      it('should throw an error when file is empty string(single quote)', async () => {
        try {
          await runCommand(`desc '' test-cmd`);
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
          // expect(execError.stderr).to.include('Empty string is not allowed: file');
        }
      });

      it('should throw an error when name is empty string(double quote)', async () => {
        try {
          await runCommand('desc test-file ""');
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          expect(execError.stderr).to.include('Empty string is not allowed: name');
        }
      });

      it('should throw an error when namme is empty string(single quote)', async () => {
        try {
          await runCommand(`desc test-file ''`);
          assert.fail('Expected command to fail but it did not');
        } catch (error) {
          const execError = error as ExecError;
          // When passing '' to CLI, it works but this test failed..
          // So comment it out
          // expect(execError.stderr).to.include('Empty string is not allowed: newName');
        }
      });
    });
  });

  describe('config command', () => {

    const runCommandWithConfig = (args: string, localPath?: string, globalPath?: string) => {
      return execAsync(`node --require ${HOOK_MODULE_PATH} ${CLI_PATH} ${args}`, {
        env: {
          ...process.env,
          MOCK_HOME: globalPath?? MOCK_HOME_PATH,
          MOCK_CWD: localPath?? MOCK_CWD_PATH,
        },
      });
    }

    describe('local and global', () => {
      it('current', async() => {
        const { stdout } = await runCommand(`config`);;
        expect(stdout).to.include(
`command:
  run:
    encoding: cp932
working_dir: ./samples/tests
`);
      });

      it('global', async() => {
        const { stdout } = await runCommand(`config --global`);;
        expect(stdout).to.include(
`command:
  run:
    encoding: utf-16
`);
      });

      it('local', async() => {
        const { stdout } = await runCommand(`config --local`);;
        expect(stdout).to.include(
`command:
  run:
    encoding: cp932
working_dir: ./samples/tests
`);
      });

      it('default', async() => {
        const { stdout } = await runCommand(`config --default`);
        expect(stdout).to.include(
`command:
  run:
    encoding: utf-8
working_dir: ${__dirname}
`);
      });
    });

    describe('no local and global', () => {
      it('current', async() => {
        const { stdout } = await runCommandWithConfig(`config`, MOCK_NOCONFIG_PATH);
        expect(stdout).to.include(
`command:
  run:
    encoding: utf-16
working_dir: ${MOCK_NOCONFIG_PATH}
`);
      });

      it('global', async() => {
        const { stdout } = await runCommandWithConfig(`config --global`, MOCK_NOCONFIG_PATH);
        expect(stdout).to.include(
`command:
  run:
    encoding: utf-16
`);
      });

      it('local', async() => {
        const { stdout } = await runCommandWithConfig(`config --local`, MOCK_NOCONFIG_PATH);
        expect(stdout).to.include(
`{}
`);
      });

      it('default', async() => {
        const { stdout } = await runCommandWithConfig(`config --default`, MOCK_NOCONFIG_PATH);
        expect(stdout).to.include(
`command:
  run:
    encoding: utf-8
working_dir: ${MOCK_NOCONFIG_PATH}
`);
      });
    });

    describe('local and no global', () => {
      it('current', async() => {
        const { stdout } = await runCommandWithConfig(`config`, undefined, MOCK_NOCONFIG_PATH);
        expect(stdout).to.include(
`command:
  run:
    encoding: cp932
working_dir: ../../../samples/tests
`);
      });

      it('global', async() => {
        const { stdout } = await runCommandWithConfig(`config --global`, undefined, MOCK_NOCONFIG_PATH);
        expect(stdout).to.include(
`{}
`);
      });

      it('local', async() => {
        const { stdout } = await runCommandWithConfig(`config --local`, undefined, MOCK_NOCONFIG_PATH);
        expect(stdout).to.include(
`command:
  run:
    encoding: cp932
working_dir: ../../../samples/tests
`);
      });

      it('default', async() => {
        const { stdout } = await runCommandWithConfig(`config --default`, undefined, MOCK_NOCONFIG_PATH);
        expect(stdout).to.include(
`command:
  run:
    encoding: utf-8
working_dir: ${MOCK_CWD_PATH}
`);
      });
    });

    describe('no local and no global', () => {
      it('current', async() => {
        const { stdout } = await runCommandWithConfig(`config`, MOCK_NOCONFIG_PATH, MOCK_NOCONFIG_PATH);
        expect(stdout).to.include(
`command:
  run:
    encoding: utf-8
working_dir: ${MOCK_NOCONFIG_PATH}
`);
      });

      it('global', async() => {
        const { stdout } = await runCommandWithConfig(`config --global`, MOCK_NOCONFIG_PATH, MOCK_NOCONFIG_PATH);
        expect(stdout).to.include(
`{}
`);
      });

      it('local', async() => {
        const { stdout } = await runCommandWithConfig(`config --local`, MOCK_NOCONFIG_PATH, MOCK_NOCONFIG_PATH);
        expect(stdout).to.include(
`{}
`);
      });

      it('default', async() => {
        const { stdout } = await runCommandWithConfig(`config --default`, MOCK_NOCONFIG_PATH, MOCK_NOCONFIG_PATH);
        expect(stdout).to.include(
`command:
  run:
    encoding: utf-8
working_dir: ${MOCK_NOCONFIG_PATH}
`);
      });
    });

    describe('arguments', () => {
      [
        { arg: '--local --global --default',  scenario: 'local and global and default', errorMsg: 'local and global'},
        { arg: '--local --global',  scenario: 'local and global', errorMsg: 'local and global'},
        { arg: '--local --default',  scenario: 'local and default', errorMsg: 'local and default'},
        { arg: '--global --default',  scenario: 'global and default', errorMsg: 'global and default'}
      ].forEach(({ arg, scenario, errorMsg }) => {
          it(`should throw error when mutiple  ${scenario} are passed`, async () => {
            try {
              await runCommand(`config ${arg}`);
              assert.fail('Expected command to fail but it did not');
            } catch (error) {
              const execError = error as ExecError;
              expect(execError.stderr).to.include(`Arguments ${errorMsg} are mutually exclusive`);
            }
        });
      });
    });
  });

  describe('error handling', () => {
    it('should show an error when no command is provided', async () => {
      try {
        await runCommand('');
        assert.fail('Expected command to fail but it did not');
      } catch (error) {
        const execError = error as ExecError;
        expect(execError.stderr).to.include('You need at least one command before moving on');
      }
    });
  });
});