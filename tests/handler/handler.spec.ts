import * as sinon from 'sinon';
import { expect } from 'chai';
import * as fs from 'fs';
import path from 'path';
import { runToCreateSnipFile, 
    runToRemoveSnipFile, 
    runToAddSnipCommand, 
    runToRemoveSnipCommand, 
    runToEditSnipFile, 
    runToEditSnipCommand, 
    runToRenameSnipFile, 
    runToAddTagToSnipFile, 
    runToRemoveTagFromSnipFile, 
    runToAddTagToSnipCommand, 
    runToRemoveTagFromSnipCommand, 
    runToFindSnipFiles, 
    runToFindCommands, 
    runToShowDescription, 
    runToListupSnipTags, 
    runToListupCommandTags, 
    runToExecuteCommands, 
    runToShowConfig} from '../../src/handler/handler.ts';
import { readFile, writeFile } from '../../src/utils/filesystems.ts';
import { cleanupTestFiles, TEST_WORKING_DIR } from '../utils/testUtils.ts';
import { logDetail, Logger } from '../../src/utils/logger.ts';
import { Contexts, IConfig } from '../../src/utils/interfaces.ts';
import { Config } from '../../src/config/config.ts';
import { beforeEach } from 'mocha';

const createTestContexts = (logDetail?: logDetail) => {
    return {
        workingDir: TEST_WORKING_DIR,
        logger: new Logger(logDetail)
    } as Contexts
}

describe('handler', ()  => {
    let consoleStub: sinon.SinonStub;
    let consoleErrorStub: sinon.SinonStub;
    let fsStub: sinon.SinonStub;
    let contexts: Contexts = createTestContexts();
    
    beforeEach(() => {
        consoleStub = sinon.stub(console, 'log').callsFake(() => {});
        consoleErrorStub = sinon.stub(console, 'error').callsFake(() => {});
        contexts = createTestContexts();
    });

    afterEach(async () => {
        consoleStub.resetHistory();
        sinon.restore();
        await cleanupTestFiles();
        contexts.logger.clearLogs();
    });

    describe('createSnipFile', () => {
        describe('successful creation', () => {
            it('should create a file with description', async () => {
                const fileName = 'test-file.snip';
                await runToCreateSnipFile(contexts, fileName, 'Test-description');
                
                const result = await readFile(fileName, contexts.workingDir);
                expect(result).to.equal(`@description: Test-description
@tags:`)
            });

            it('should create a file without description', async () => {
                const fileName = 'test-file.snip';
                await runToCreateSnipFile(contexts, fileName);
                
                const result = await readFile(fileName, contexts.workingDir);
                expect(result).to.include(`@description: 
@tags:`)
            });

            it('should create a file with empty string description', async () => {
                const fileName = 'test-file.snip';
                await runToCreateSnipFile(contexts, fileName, '');
                
                const result = await readFile(fileName, contexts.workingDir);
                expect(result).to.include(`@description: 
@tags:`)
            });

            it('should create a file with description containing spaces', async () => {
                const fileName = 'test-file.snip';
                await runToCreateSnipFile(contexts, fileName, 'This is a test description with spaces');
                
                const result = await readFile(fileName, contexts.workingDir);
                expect(result).to.equal(`@description: "This is a test description with spaces"
@tags:`)
            });
        });

        describe('file already exists', () => {
            it('should not overwrite existing file', async () => {
                const fileName = 'existing-file.snip';
                const originalContent = 'Original content';
                await writeFile(fileName, contexts.workingDir, originalContent);

                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToCreateSnipFile(contexts, fileName, 'New description');
                
                const result = await readFile(fileName, contexts.workingDir);
                expect(result).to.equal(originalContent);
                sinon.assert.calledWith(consoleStub, `${fileName} already exists`);
                sinon.assert.notCalled(spy);
            });
        });

        describe('error handling', () => {
            it('should output error log when read fails', async () => {
                const fileName = 'error-no-log-test.snip';
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);
                
                await runToCreateSnipFile(contexts, fileName, 'description');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
            });

            it('should output error log when write fails', async () => {
                const fileName = 'error-no-log-test.snip';
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'writeFile').rejects(error);
                
                await runToCreateSnipFile(contexts, fileName, 'description');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
            });
        });

        describe('logging', () => {
            it('should log file creation details when logDetail is verbose', async () => {
                contexts = createTestContexts('verbose');
                const fileName = 'log-test.snip';
                const description = 'Test description';            
                await runToCreateSnipFile(contexts, fileName, description);
                
                sinon.assert.calledWith(consoleStub, `Created a file`);
                sinon.assert.calledWith(consoleStub, `log-test`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, `Description : ${description}`);
                sinon.assert.calledWith(consoleStub, 'Tags        : ');
                sinon.assert.calledWith(consoleStub, 'Commands    : ');
            });

            it('should log empty description when description is undefined and logDetail is verbose', async () => {
                contexts = createTestContexts('verbose');
                const fileName = 'log-test.snip';
                await runToCreateSnipFile(contexts, fileName, undefined);
                sinon.assert.calledWith(consoleStub, `Created a file`);
                sinon.assert.calledWith(consoleStub, `log-test`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, 'Description : ');
                sinon.assert.calledWith(consoleStub, 'Tags        : ');
                sinon.assert.calledWith(consoleStub, 'Commands    : ');
            });

            it('should not log when logDetail is normal', async () => {
                contexts = createTestContexts('normal');
                const fileName = 'no-log-test.snip';
                await runToCreateSnipFile(contexts, fileName, 'Test description');
                sinon.assert.notCalled(consoleStub);
            });

            it('should not log when logDetail is undefined', async () => {
                const fileName = 'no-log-test.snip';
                await runToCreateSnipFile(contexts, fileName, 'Test description');
                sinon.assert.notCalled(consoleStub);
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read file: ${TEST_WORKING_DIR}/error-test.snip`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when logDetail is ${value} and read fails`, async () => {
                    contexts = createTestContexts(value as logDetail);
                    const fileName = 'error-test.snip';
                    const cause = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'readFile').rejects(cause);

                    await runToCreateSnipFile(contexts, fileName, 'description');
                    assertion(cause);
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to save file: ${TEST_WORKING_DIR}/error-test.snip`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when logDetail is ${value} and write fails`, async () => {
                    contexts = createTestContexts(value as logDetail);
                    const fileName = 'error-test.snip';
                    const error = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'writeFile').rejects(error);

                    await runToCreateSnipFile(contexts, fileName, 'description');
                    assertion(error);
                });
            });
        });
    });

    describe('editSnipFile', () => {
        const testFileName = 'edit-test.snip';

        beforeEach(async () => {
            await runToCreateSnipFile(contexts, testFileName, 'original description');
        });

        describe('successful edit', () => {
            it('should update description', async () => {
                await runToEditSnipFile(contexts, testFileName, 'new description');

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: "new description"
@tags:`);
            });

            it('should update tags', async () => {
                await runToEditSnipFile(contexts, testFileName, undefined, ['new', 'tags']);

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: "original description"
@tags: new, tags`);
            });

            it('should update tags by removing the duplicated tag', async () => {
                await runToEditSnipFile(contexts, testFileName, undefined, ['tags', 'tags']);

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: "original description"
@tags: tags`);
            });

            it('should update both description and tags', async () => {
                await runToEditSnipFile(contexts, testFileName, 'updated description', ['updated', 'tags']);

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: "updated description"
@tags: updated, tags`);
            });

            it('should set tags to empty array when tags include empty string', async () => {
                await runToEditSnipFile(contexts, testFileName, undefined, ['tag1', "", 'tag2']);

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: "original description"
@tags:`);
            });

            it('should set tags to empty array when tags include empty string (single quote)', async () => {
                await runToEditSnipFile(contexts, testFileName, undefined, ['tag1', '', 'tag2']);

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: "original description"
@tags:`);
            });
        });

        describe('no changes', () => {
            it('should do nothing when both description and tags are undefined', async () => {
                const originalContent = await readFile(testFileName, contexts.workingDir);
                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipFile(contexts, testFileName, undefined, undefined);

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(originalContent);
                sinon.assert.notCalled(spy);
            });
        });

        describe('file not found', () => {
            it('should do nothing when file does not exist', async () => {
                const nonExistentFile = 'non-existent.snip';
                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipFile(contexts, nonExistentFile, 'new description');

                sinon.assert.calledWith(consoleStub, `${nonExistentFile} is not found`);
                sinon.assert.notCalled(spy);
            });
        });

        describe('error handling', () => {
            it('should handle error when reading file fails', async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);

                await runToEditSnipFile(contexts, testFileName, 'new description');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
            });

            it('should handle error when writing file fails', async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'writeFile').rejects(error);

                await runToEditSnipFile(contexts, testFileName, 'new description');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
            });
        });

        describe('logging', () => {
            it('should log description update when logDetail is verbose', async () => {
                contexts = createTestContexts('verbose');
                await runToEditSnipFile(contexts, testFileName, 'new description', undefined);

                sinon.assert.calledWith(consoleStub, `Updated a file`);
                sinon.assert.calledWith(consoleStub, `edit-test`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, `Description : new description`);
                sinon.assert.calledWith(consoleStub, 'Tags        : ');
                sinon.assert.calledWith(consoleStub, 'Commands    : ');
            });

            it('should log tags update when logDetail is verbose', async () => {
                contexts = createTestContexts('verbose');
                await runToEditSnipFile(contexts, testFileName, undefined, ['new', 'tags']);

                sinon.assert.calledWith(consoleStub, `Updated a file`);
                sinon.assert.calledWith(consoleStub, `edit-test`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, `Description : original description`);
                sinon.assert.calledWith(consoleStub, 'Tags        : new, tags');
                sinon.assert.calledWith(consoleStub, 'Commands    : ');
            });

            it('should log tags update when tags are duplicated and logDetail is verbose', async () => {
                contexts = createTestContexts('verbose');
                await runToEditSnipFile(contexts, testFileName, undefined, ['tags', 'tags']);
                
                sinon.assert.calledWith(consoleStub, `Updated a file`);
                sinon.assert.calledWith(consoleStub, `edit-test`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, `Description : original description`);
                sinon.assert.calledWith(consoleStub, 'Tags        : tags');
                sinon.assert.calledWith(consoleStub, 'Commands    : ');
            });

            it('should log nothing to update when both are undefined and logDetail is verbose', async () => {
                contexts = createTestContexts('verbose');
                await runToEditSnipFile(contexts, testFileName, undefined, undefined);
                sinon.assert.calledWith(consoleStub, `Nothing to update as 'description' and 'tag' were not passed`);
            });

            it('should not log when logDetail is normal', async () => {
                contexts = createTestContexts('normal');
                await runToEditSnipFile(contexts, testFileName, 'new description', ['new', 'tags']);
                sinon.assert.notCalled(consoleStub);

                await runToEditSnipFile(contexts, testFileName, undefined, undefined);
                sinon.assert.notCalled(consoleStub);
            });

            it('should not log when logDetail is undefined', async () => {
                contexts = createTestContexts();
                await runToEditSnipFile(contexts, testFileName, 'new description', ['new', 'tags']);
                sinon.assert.notCalled(consoleStub);

                await runToEditSnipFile(contexts, testFileName, undefined, undefined);
                sinon.assert.notCalled(consoleStub);
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read file: ${TEST_WORKING_DIR}/edit-test.snip`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when logDetail is ${value} and read fails`, async () => {
                    const error = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);

                    contexts = createTestContexts(value as logDetail);
                    await runToEditSnipFile(contexts, testFileName, 'new description', undefined);
                    assertion(error);
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to save file: ${TEST_WORKING_DIR}/edit-test.snip`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when logDetail is ${value} and write fails`, async () => {
                    const error = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'writeFile').rejects(error);

                    contexts = createTestContexts(value as logDetail);
                    await runToEditSnipFile(contexts, testFileName, 'new description', undefined);
                    assertion(error);
                });
            });
        });
    });

    describe('addTagToSnipFile', () => {
        const testFileName = 'edit-test.snip';

        beforeEach(async () => {
            await runToCreateSnipFile(contexts, testFileName, 'Test-description');
        });

        it('should add a tag when its file has no tags', async () => {
            await runToAddTagToSnipFile(contexts, testFileName, 'new-tag');
            const result = await readFile(testFileName, contexts.workingDir);
            expect(result).to.equal(`@description: Test-description
@tags: new-tag`)
        });

        it('should add a tag when its file has some tags', async () => {
            await runToEditSnipFile(contexts, testFileName, undefined, ['new']);
            await runToAddTagToSnipFile(contexts, testFileName, 'new-tag');
            const result = await readFile(testFileName, contexts.workingDir);
            expect(result).to.equal(`@description: Test-description
@tags: new, new-tag`)
        });

        it('should complete without error when the file does not exist', async () => {
            await runToAddTagToSnipFile(contexts, 'non-existing.snip', 'new-tag');
            sinon.assert.calledWith(consoleStub, `non-existing.snip is not found`);
        });

        it('should complete without error when the tag already exists', async () => {
            await runToEditSnipFile(contexts, testFileName, undefined, ['new']);
            const spy = sinon.spy(fs.promises, 'writeFile');
            await runToAddTagToSnipFile(contexts, testFileName, 'new');
            sinon.assert.calledWith(consoleStub, `new is already added`);
            sinon.assert.notCalled(spy);
        });

        describe('error handling', () => {
            it('should output error log when read fails', async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);
                
                await runToAddTagToSnipFile(contexts, testFileName, 'new');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
            });

            it('should output error log when save fails', async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'writeFile').rejects(error);
                
                await runToAddTagToSnipFile(contexts, testFileName, 'new');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
            });
        });

        describe('logging', () => {
            it('should log file adding tag details when log is verbose', async () => {
                contexts = createTestContexts('verbose');
                await runToAddTagToSnipFile(contexts, testFileName, 'new');
                sinon.assert.calledWith(consoleStub, `A tag was added`);
                sinon.assert.calledWith(consoleStub, `edit-test`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, `Description : Test-description`);
                sinon.assert.calledWith(consoleStub, 'Tags        : new');
                sinon.assert.calledWith(consoleStub, 'Commands    : ');
            });

            [
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log file adding tag details when log is ${value}`, async () => {
                    contexts = createTestContexts(value as logDetail);
                    await runToAddTagToSnipFile(contexts, testFileName, 'new');
                    assertion();
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read file: ${TEST_WORKING_DIR}/edit-test.snip`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when log is ${value} and reading file fails`, async () => {
                    const error = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);

                    contexts = createTestContexts(value as logDetail);
                    await runToAddTagToSnipFile(contexts, testFileName, 'new');                  
                    assertion(error);
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to save file: ${TEST_WORKING_DIR}/edit-test.snip`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when log is ${value} and writing fails`, async () => {
                    const error = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'writeFile').rejects(error);

                    contexts = createTestContexts(value as logDetail);
                    await runToAddTagToSnipFile(contexts, testFileName, 'new');                
                    assertion(error);
                });
            });
        });
    });

    describe('removeTagFromSnipFile', () => {
        const testFileName = 'tag-command-test.snip';

        beforeEach(async () => {
            await runToCreateSnipFile(contexts, testFileName, 'Test-description');
            await runToAddTagToSnipFile(contexts, testFileName, 'existing-tag');
        });

        it('should remove a tag when its file has a tag', async () => {
            await runToRemoveTagFromSnipFile(contexts, testFileName, 'existing-tag');
            const result = await readFile(testFileName, contexts.workingDir);
            expect(result).to.equal(`@description: Test-description
@tags:`)
        });

        it('should remove a tag when its file has multiple tags', async () => {
            await runToAddTagToSnipFile(contexts, testFileName, 'tag');
            await runToRemoveTagFromSnipFile(contexts, testFileName, 'existing-tag');
            const result = await readFile(testFileName, contexts.workingDir);
            expect(result).to.equal(`@description: Test-description
@tags: tag`)
        });

        it('should complete without error when its file has no tags', async () => {
            await runToRemoveTagFromSnipFile(contexts, testFileName, 'existing-tag');

            const spy = sinon.spy(fs.promises, 'writeFile');
            await runToRemoveTagFromSnipFile(contexts, testFileName, 'existing-tag');
            sinon.assert.calledWith(consoleStub, `existing-tag is not tagged`);
            sinon.assert.notCalled(spy);
        });

        it('should complete without error when the tag does not exists', async () => {
            const spy = sinon.spy(fs.promises, 'writeFile');
            await runToRemoveTagFromSnipFile(contexts, testFileName, 'non-existing-tag');
            sinon.assert.calledWith(consoleStub, `non-existing-tag is not tagged`);
            sinon.assert.notCalled(spy);
        });

        it('should complete without error when the file does not exist', async () => {
            await runToRemoveTagFromSnipFile(contexts, 'non-existing.snip', 'existing-tag');
            sinon.assert.calledWith(consoleStub, `non-existing.snip is not found`);
        });

        describe('error handling', () => {
            it('should output error log when read fails', async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);
                
                await runToRemoveTagFromSnipFile(contexts, testFileName, 'existing-tag');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
            });

            it('should output error log when save fails', async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'writeFile').rejects(error);
                
                await runToRemoveTagFromSnipFile(contexts, testFileName, 'existing-tag');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
            });
        });

        describe('logging', () => {

            it(`should log file removing tag details when log is verbose`, async () => {
                contexts = createTestContexts('verbose');
                await runToRemoveTagFromSnipFile(contexts, testFileName, 'existing-tag');
                sinon.assert.calledWith(consoleStub, `A tag was removed`);
                sinon.assert.calledWith(consoleStub, `tag-command-test`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, `Description : Test-description`);
                sinon.assert.calledWith(consoleStub, 'Tags        : ');
                sinon.assert.calledWith(consoleStub, 'Commands    : ');

            });

            [
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log file removing tag details when log is ${value}`, async () => {
                    contexts = createTestContexts(value as logDetail);
                    await runToRemoveTagFromSnipFile(contexts, testFileName, 'existing-tag');
                    assertion();
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read file: ${TEST_WORKING_DIR}/${testFileName}`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when log is ${value} and reading file fails`, async () => {
                    const error = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);

                    contexts = createTestContexts(value as logDetail);
                    await runToRemoveTagFromSnipFile(contexts, testFileName, 'existing-tag');
                    assertion(error);
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to save file: ${TEST_WORKING_DIR}/${testFileName}`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when log is ${value} and writing fails`, async () => {
                    const error = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'writeFile').rejects(error);

                    contexts = createTestContexts(value as logDetail);
                    await runToRemoveTagFromSnipFile(contexts, testFileName, 'existing-tag');
                    assertion(error);
                });
            });
        });
    });

    describe('renameSnipFile', () => {
        const testFileToRename = 'rename.snip';

        beforeEach(async () => {
            await runToCreateSnipFile(contexts, testFileToRename, 'Test-description');
        });

        it('should rename a file', async () => {
            await runToRenameSnipFile(contexts, testFileToRename, 'renamed.snip');
            const result = await readFile('renamed.snip', contexts.workingDir);
            expect(result).to.equal(`@description: Test-description
@tags:`)
        });

        it('should complete without error when the file does not exist', async () => {
            await runToRenameSnipFile(contexts, 'renamed.snip', 'renamed2.snip');
            sinon.assert.calledWith(consoleStub, `renamed.snip is not found`);
        });

        it('should complete without error when the renamed file name is same with target', async () => {
            const spy = sinon.spy(fs.promises, 'rename');
            await runToRenameSnipFile(contexts, 'renamed.snip', 'renamed.snip');
            sinon.assert.calledWith(consoleStub, `renamed.snip was not renamed as newName is same.`);
            sinon.assert.notCalled(spy);
        });

        it('should complete without error when the renamed file already exists', async () => {
            const spy = sinon.spy(fs.promises, 'rename');
            await runToRenameSnipFile(contexts, 'going-to-rename.snip', testFileToRename);
            sinon.assert.calledWith(consoleStub, `${testFileToRename} already exists`);
            sinon.assert.notCalled(spy);
        });

        describe('error handling', () => {
            it('should output error log when read fails', async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);
                await runToRenameSnipFile(contexts, testFileToRename, 'renamed.snip');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
            });

            it('should output error log when rename fails', async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'rename').rejects(error);
                await runToRenameSnipFile(contexts, testFileToRename, 'renamed.snip');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
            });
        });

        describe('logging', () => {

            [
                { value: 'verbose', assertion: () => sinon.assert.calledWith(consoleStub, `${testFileToRename} was renamed to renamed.snip`)},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log file rename details when log is ${value}`, async () => {
                    contexts = createTestContexts(value as logDetail);
                    await runToRenameSnipFile(contexts, testFileToRename, 'renamed.snip');
                    assertion();
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read file: ${TEST_WORKING_DIR}/renamed.snip`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when log is ${value} and reading file fails`, async () => {
                    const error = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);
                    contexts = createTestContexts(value as logDetail);
                    await runToRenameSnipFile(contexts, testFileToRename, 'renamed.snip');                  
                    assertion(error);
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to rename file: ${TEST_WORKING_DIR}/${testFileToRename}`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when log is ${value} and rename fails`, async () => {
                    const error = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'rename').rejects(error);
                    contexts = createTestContexts(value as logDetail);
                    await runToRenameSnipFile(contexts, testFileToRename, 'renamed.snip');                  
                    assertion(error);
                });
            });
        });
    });

    describe('removeSnipFile', () => {
        const testFileToDelete = 'delete.snip';

        beforeEach(async () => {
            await writeFile(testFileToDelete, contexts.workingDir, 'this must be deleted');
        });

        it('should delete a file', async () => {
            await runToRemoveSnipFile(contexts, testFileToDelete);
            const file = await readFile(testFileToDelete, contexts.workingDir);
            expect(file).to.be.null;
        });

        it('should complete without error when the file does not exist', async () => {
            await runToRemoveSnipFile(contexts, testFileToDelete);
            const file = await readFile(testFileToDelete, contexts.workingDir);
            expect(file).to.be.null;

            await runToRemoveSnipFile(contexts, testFileToDelete);
            sinon.assert.calledWith(consoleStub, `${testFileToDelete} is not found`);
        });

        it('should output error log when delete failed', async () => {
            const error = new Error('disk full');
            fsStub = sinon.stub(fs.promises, 'unlink').rejects(error);

            await runToRemoveSnipFile(contexts, testFileToDelete);
            const file = await readFile(testFileToDelete, contexts.workingDir);
            expect(file).to.be.not.null;
            sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
        });

        describe('logging', () => {

            [
                { value: 'verbose', assertion: () => sinon.assert.calledWith(consoleStub, `Removed the file: ${testFileToDelete}`)},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log file deletion details when log is ${value}`, async () => {
                    contexts = createTestContexts(value as logDetail);
                    await runToRemoveSnipFile(contexts, testFileToDelete);
                    const file = await readFile(testFileToDelete, contexts.workingDir);
                    expect(file).to.be.null;
                    assertion();
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to delete file: ${TEST_WORKING_DIR}/${testFileToDelete}`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when log is ${value} and delete fails`, async () => {
                    const error = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'unlink').rejects(error);

                    contexts = createTestContexts(value as logDetail);
                    await runToRemoveSnipFile(contexts, testFileToDelete);
                    assertion(error);
                });
            });
        });
    });

    describe('addSnipCommand', () => {
        const testFileName = 'add-command-test.snip';
        
        beforeEach(async () => {
            await runToCreateSnipFile(contexts, testFileName);
        });

        describe('successful command addition', () => {
            it('should add a command with all parameters(without dependsOn)', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'newCommand', 'echo hello', 'Test command', ['test', 'hello']);
                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test command",
    tags: [test, hello],
    depends_on: []
}`);
            });

            it('should add a command with only mandatory args', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'newCommand', 'ls -la');
                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: newCommand {
    cmd: "ls -la",
    desc: "",
    tags: [],
    depends_on: []
}`);
            });

            it('should add multiple commands to the same file', async () => {
                const command1 = { name: 'cmd1', value: 'echo 1' };
                const command2 = { name: 'cmd2', value: 'echo 2' };

                await runToAddSnipCommand(contexts, testFileName, command1.name, command1.value);
                await runToAddSnipCommand(contexts, testFileName, command2.name, command2.value);

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: cmd1 {
    cmd: "echo 1",
    desc: "",
    tags: [],
    depends_on: []
}
@command: cmd2 {
    cmd: "echo 2",
    desc: "",
    tags: [],
    depends_on: []
}`);
            });

            it('should add a command with distinct tags when duplicated tags are pased', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'newCommand', 'echo hello', 'Test command', ['test', 'test']);
                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test command",
    tags: [test],
    depends_on: []
}`);
            });
        });

        describe('file not found', () => {
            it('should not add command when file does not exist', async () => {
                const nonExistentFile = 'non-existent.snip';
                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToAddSnipCommand(contexts, nonExistentFile, 'testCommand', 'echo test');

                sinon.assert.calledWith(consoleStub, `${nonExistentFile} is not found`);
                sinon.assert.notCalled(spy);
            });
        });

        describe('duplicate command', () => {
            it('should not add command if command name already exists', async () => {
                const existingCommand = 'newCommand';
                const newCommand = 'echo duplicate';

                await runToAddSnipCommand(contexts, testFileName, existingCommand, newCommand);

                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToAddSnipCommand(contexts, testFileName, existingCommand, newCommand);

                sinon.assert.calledWith(consoleStub, `command '${existingCommand}' already exists`);
                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: newCommand {
    cmd: "echo duplicate",
    desc: "",
    tags: [],
    depends_on: []
}`);
                sinon.assert.notCalled(spy);
            });
        });

        describe('dependsOn', () => {
            it('Add a dependsOn successfully', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'newCommand', 'echo hello', 'Test command', ['test', 'hello']);
                await runToAddSnipCommand(contexts, testFileName, 'newDependsOnCommand', 'echo hello', 'Test command', ['test', 'hello'], ['newCommand']);
                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test command",
    tags: [test, hello],
    depends_on: []
}
@command: newDependsOnCommand {
    cmd: "echo hello",
    desc: "Test command",
    tags: [test, hello],
    depends_on: [newCommand]
}`);
            });

            it('Add multiple dependsOn successfully', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'newCommand', 'echo hello', 'Test command', ['test', 'hello']);
                await runToAddSnipCommand(contexts, testFileName, 'newCommand2', 'echo-hello', 'Test-command', ['test', 'hello']);
                await runToAddSnipCommand(contexts, testFileName, 'newDependsOnCommand', 'echo hello', 'Test command', ['test', 'hello'], ['newCommand', 'newCommand2']);
                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test command",
    tags: [test, hello],
    depends_on: []
}
@command: newCommand2 {
    cmd: echo-hello,
    desc: Test-command,
    tags: [test, hello],
    depends_on: []
}
@command: newDependsOnCommand {
    cmd: "echo hello",
    desc: "Test command",
    tags: [test, hello],
    depends_on: [newCommand, newCommand2]
}`);
            });

            it('Add a distinct dependsOn successfully', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'newCommand', 'echo hello', 'Test command', ['test', 'hello']);
                await runToAddSnipCommand(contexts, testFileName, 'newDependsOnCommand', 'echo hello', 'Test command', ['test', 'hello'], ['newCommand', 'newCommand']);
                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test command",
    tags: [test, hello],
    depends_on: []
}
@command: newDependsOnCommand {
    cmd: "echo hello",
    desc: "Test command",
    tags: [test, hello],
    depends_on: [newCommand]
}`);
            });

            it('Should not add itself to dependsOn', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'newCommand', 'echo hello', 'Test command', ['test', 'hello']);

                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToAddSnipCommand(contexts, testFileName, 'newDependsOnCommand', 'echo hello', 'Test command', ['test', 'hello'], ['newDependsOnCommand']);
                sinon.assert.calledWith(consoleStub, `command cannot depend on itself`);
                sinon.assert.notCalled(spy);

                await runToAddSnipCommand(contexts, testFileName, 'newDependsOnCommand', 'echo hello', 'Test command', ['test', 'hello'], ['newDependsOnCommand', 'newCommand']);
                sinon.assert.calledWith(consoleStub, `command cannot depend on itself`);
                sinon.assert.notCalled(spy);
            });

            it('Should not add non-existing to dependsOn when no other command exists', async () => {
                const  spy = sinon.spy(fs.promises, 'writeFile');
                await runToAddSnipCommand(contexts, testFileName, 'newDependsOnCommand', 'echo hello', 'Test command', ['test', 'hello'], ['non-existing']);
                sinon.assert.calledWith(consoleStub, `command 'newDependsOnCommand' has invalid dependencies: non-existing`);
                sinon.assert.notCalled(spy);

                await runToAddSnipCommand(contexts, testFileName, 'newDependsOnCommand', 'echo hello', 'Test command', ['test', 'hello'], ['non-existing', 'non-existing2']);
                sinon.assert.calledWith(consoleStub, `command 'newDependsOnCommand' has invalid dependencies: non-existing, non-existing2`);
                sinon.assert.notCalled(spy);

            });

            it('Should not add non-existing to dependsOn when other command exists', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'newCommand', 'echo hello', 'Test command', ['test', 'hello']);

                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToAddSnipCommand(contexts, testFileName, 'newDependsOnCommand', 'echo hello', 'Test command', ['test', 'hello'], ['non-existing']);
                sinon.assert.calledWith(consoleStub, `command 'newDependsOnCommand' has invalid dependencies: non-existing`);
                sinon.assert.notCalled(spy);

                await runToAddSnipCommand(contexts, testFileName, 'newDependsOnCommand', 'echo hello', 'Test command', ['test', 'hello'], ['newCommand', 'non-existing', 'non-existing2']);
                sinon.assert.calledWith(consoleStub, `command 'newDependsOnCommand' has invalid dependencies: non-existing, non-existing2`);
                sinon.assert.notCalled(spy);
            });
        });

        describe('error handling', () => {
            it('should handle error when reading file fails', async () => {
                const fileName = 'error-read-test.snip';
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);

                await runToAddSnipCommand(contexts, fileName, 'cmd', 'echo test');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
            });

            it('should handle error when writing file fails', async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'writeFile').rejects(error);

                await runToAddSnipCommand(contexts, testFileName, 'newCmd', 'echo test');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
            });
        });

        describe('logging', () => {
            it('should log command addition details when logDetail is verbose', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'dp', 'echo hello');
                await runToAddSnipCommand(contexts, testFileName, 'dp2', 'echo hello');

                contexts = createTestContexts('verbose');
                const commandName = 'loggedCommand';
                const commandValue = 'echo logged';
                const description = 'Logged command';
                const tags = ['log', 'test'];
                const dependsOn = ['dp', 'dp2'];

                await runToAddSnipCommand(contexts, testFileName, commandName, commandValue, description, tags, dependsOn);

                sinon.assert.calledWith(consoleStub, `A command was added`);
                sinon.assert.calledWith(consoleStub, `${commandName}`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, `Command     : ${commandValue}`);
                sinon.assert.calledWith(consoleStub, `Description : ${description}`);
                sinon.assert.calledWith(consoleStub, `Tags        : ${tags.join(', ')}`);
                sinon.assert.calledWith(consoleStub, `DependsOn   : ${dependsOn.join(', ')}`);
            });

            it('should log with empty description when only mandatory args is undefined and logDetail is verbose', async () => {
                contexts = createTestContexts('verbose');
                const commandName = 'noDescCmd';
                const commandValue = 'echo test';

                await runToAddSnipCommand(contexts, testFileName, commandName, commandValue, undefined, undefined);

                sinon.assert.calledWith(consoleStub, `A command was added`);
                sinon.assert.calledWith(consoleStub, `${commandName}`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, `Command     : ${commandValue}`);
                sinon.assert.calledWith(consoleStub, `Description : `);
                sinon.assert.calledWith(consoleStub, `Tags        : `);
                sinon.assert.calledWith(consoleStub, `DependsOn   : `);
            });

            it('should log command addition details when duplicated tags are passed logDetail is verbose', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'dp', 'echo hello');
                
                contexts = createTestContexts('verbose');
                const commandName = 'loggedCommand';
                const commandValue = 'echo logged';
                const description = 'Logged command';
                const tags = ['test', 'test'];
                const dependsOn = ['dp', 'dp'];

                await runToAddSnipCommand(contexts, testFileName, commandName, commandValue, description, tags, dependsOn);

                sinon.assert.calledWith(consoleStub, `A command was added`);
                sinon.assert.calledWith(consoleStub, `${commandName}`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, `Command     : ${commandValue}`);
                sinon.assert.calledWith(consoleStub, `Description : ${description}`);
                sinon.assert.calledWith(consoleStub, `Tags        : test`);
                sinon.assert.calledWith(consoleStub, `DependsOn   : dp`);
            });

            it('should not log when logDetail is normal', async () => {
                contexts = createTestContexts('normal');
                const commandName = 'noLogCmd';
                const commandValue = 'echo test';

                await runToAddSnipCommand(contexts, testFileName, commandName, commandValue, 'description', ['tag']);

                sinon.assert.notCalled(consoleStub);
            });

            it('should not log when log is undefined', async () => {
                const commandName = 'noLogCmd';
                const commandValue = 'echo test';

                await runToAddSnipCommand(contexts, testFileName, commandName, commandValue, 'description', ['tag']);

                sinon.assert.notCalled(consoleStub);
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read file: ${TEST_WORKING_DIR}/error-log-test.snip`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when logDetail is ${value} and read fails`, async () => {
                    const fileName = 'error-log-test.snip';
                    const error = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);

                    contexts = createTestContexts(value as logDetail);
                    await runToAddSnipCommand(contexts, fileName, 'cmd', 'echo test', undefined, undefined);
                    assertion(error);
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to save file: ${TEST_WORKING_DIR}/${testFileName}`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when logDetail is ${value} and write fails`, async () => {
                    const error = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'writeFile').rejects(error);

                    contexts = createTestContexts(value as logDetail);
                    await runToAddSnipCommand(contexts, testFileName, 'newCmd', 'echo test', undefined, undefined);
                    assertion(error);
                });
            });
        });
    });

    describe('removeSnipCommand', () => {
        const testFileName = 'remove-command-test.snip';

        it('Remove command succesfully', async () => {
            await runToCreateSnipFile(contexts, testFileName);
            const commandName = 'newCommand';
            await runToAddSnipCommand(contexts, testFileName, commandName, 'echo hello', 'Test command', ['test', 'hello']);

            const result1 = await readFile(testFileName, contexts.workingDir);
            expect(result1).to.equal(`@description: 
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test command",
    tags: [test, hello],
    depends_on: []
}`);
            await runToRemoveSnipCommand(contexts, testFileName, commandName);
            const result2 = await readFile(testFileName, contexts.workingDir);
            expect(result2).to.equal(`@description: 
@tags:`);
        });

        it('File is not found', async () => {
            const spy = sinon.spy(fs.promises, 'writeFile');
            await runToRemoveSnipCommand(contexts, testFileName, 'not-found-cmd');
            sinon.assert.calledWith(consoleStub, `${testFileName} is not found`);
            sinon.assert.notCalled(spy);
        });

        it('Any command does not exist in the snip', async () => {
            await runToCreateSnipFile(contexts, testFileName);
            const result1 = await readFile(testFileName, contexts.workingDir);
            expect(result1).to.equal(`@description: 
@tags:`);
            const spy = sinon.spy(fs.promises, 'writeFile');
            await runToRemoveSnipCommand(contexts, testFileName, 'not-found-cmd');
            sinon.assert.calledWith(consoleStub, `command 'not-found-cmd' is not found`);
            sinon.assert.notCalled(spy);
        });

        it('command is not found', async () => {
            await runToCreateSnipFile(contexts, testFileName);
            const commandName = 'newCommand';
            await runToAddSnipCommand(contexts, testFileName, commandName, 'echo hello', 'Test command', ['test', 'hello']);
            const result1 = await readFile(testFileName, contexts.workingDir);
            expect(result1).to.equal(`@description: 
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test command",
    tags: [test, hello],
    depends_on: []
}`);
            const spy = sinon.spy(fs.promises, 'writeFile');
            await runToRemoveSnipCommand(contexts, testFileName, 'not-found-cmd');
            sinon.assert.calledWith(consoleStub, `command 'not-found-cmd' is not found`);
            const result2 = await readFile(testFileName, contexts.workingDir);
            expect(result2).to.equal(`@description: 
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test command",
    tags: [test, hello],
    depends_on: []
}`);
            sinon.assert.notCalled(spy);
        });

        it('should not remove when its dependsOn exists', async () => {
            await runToCreateSnipFile(contexts, testFileName);
            const commandName = 'newCommand';
            await runToAddSnipCommand(contexts, testFileName, commandName, 'echo hello', 'Test command', ['test', 'hello']);
            await runToAddSnipCommand(contexts, testFileName, 'dependency', 'echo hello', undefined, undefined, [commandName]);
            const result1 = await readFile(testFileName, contexts.workingDir);
            expect(result1).to.equal(`@description: 
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test command",
    tags: [test, hello],
    depends_on: []
}
@command: dependency {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [newCommand]
}`);
            const spy = sinon.spy(fs.promises, 'writeFile');
            await runToRemoveSnipCommand(contexts, testFileName, commandName);
            sinon.assert.calledWith(consoleStub, `'${commandName}' is still referenced by dependency`);
            const result2 = await readFile(testFileName, contexts.workingDir);
            expect(result2).to.equal(`@description: 
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test command",
    tags: [test, hello],
    depends_on: []
}
@command: dependency {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [newCommand]
}`);
            sinon.assert.notCalled(spy);
        });

        it('should not remove when its dependsOn exists multiplly', async () => {
            await runToCreateSnipFile(contexts, testFileName);
            const commandName = 'newCommand';
            await runToAddSnipCommand(contexts, testFileName, commandName, 'echo hello', 'Test command', ['test', 'hello']);
            await runToAddSnipCommand(contexts, testFileName, 'dependency', 'echo hello', undefined, undefined, [commandName]);
            await runToAddSnipCommand(contexts, testFileName, 'dependency2', 'echo hello', undefined, undefined, [commandName]);
            const result1 = await readFile(testFileName, contexts.workingDir);
            expect(result1).to.equal(`@description: 
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test command",
    tags: [test, hello],
    depends_on: []
}
@command: dependency {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [newCommand]
}
@command: dependency2 {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [newCommand]
}`);
            const spy = sinon.spy(fs.promises, 'writeFile');
            await runToRemoveSnipCommand(contexts, testFileName, commandName);
            sinon.assert.calledWith(consoleStub, `'${commandName}' is still referenced by dependency, dependency2`);
            const result2 = await readFile(testFileName, contexts.workingDir);
            expect(result2).to.equal(`@description: 
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test command",
    tags: [test, hello],
    depends_on: []
}
@command: dependency {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [newCommand]
}
@command: dependency2 {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: [newCommand]
}`);
            sinon.assert.notCalled(spy);
        });

        it('remove command successfully when non-target commands has dependsOn another', async () => {
            await runToCreateSnipFile(contexts, testFileName);
            const commandName = 'newCommand';
            await runToAddSnipCommand(contexts, testFileName, commandName, 'echo hello', 'Test command', ['test', 'hello']);
            await runToAddSnipCommand(contexts, testFileName, 'dependency', 'echo hello', undefined, undefined, []);
            await runToAddSnipCommand(contexts, testFileName, 'dependency2', 'echo hello', undefined, undefined, ['dependency']);
            const result1 = await readFile(testFileName, contexts.workingDir);
            expect(result1).to.equal(`@description: 
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test command",
    tags: [test, hello],
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
            const spy = sinon.spy(fs.promises, 'writeFile');
            await runToRemoveSnipCommand(contexts, testFileName, commandName);
            const result2 = await readFile(testFileName, contexts.workingDir);
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

        it('should not remove when its dependsOn is one of their dependsOn', async () => {
            await runToCreateSnipFile(contexts, testFileName);
            const commandName = 'newCommand';
            await runToAddSnipCommand(contexts, testFileName, commandName, 'echo hello', 'Test command', ['test', 'hello']);
            await runToAddSnipCommand(contexts, testFileName, 'dependency', 'echo hello', undefined, undefined, []);
            await runToAddSnipCommand(contexts, testFileName, 'dependency2', 'echo hello', undefined, undefined, [commandName, 'dependency']);
            const result1 = await readFile(testFileName, contexts.workingDir);
            expect(result1).to.equal(`@description: 
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test command",
    tags: [test, hello],
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
    depends_on: [newCommand, dependency]
}`);
            const spy = sinon.spy(fs.promises, 'writeFile');
            await runToRemoveSnipCommand(contexts, testFileName, commandName);
            sinon.assert.calledWith(consoleStub, `'${commandName}' is still referenced by dependency2`);
            const result2 = await readFile(testFileName, contexts.workingDir);
            expect(result2).to.equal(`@description: 
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test command",
    tags: [test, hello],
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
    depends_on: [newCommand, dependency]
}`);
            sinon.assert.notCalled(spy);
        });

        it('Should log detailed when log option is passed', async () => {
            await runToCreateSnipFile(contexts, testFileName);
            const commandName = 'newCommand';
            await runToAddSnipCommand(contexts, testFileName, commandName, 'echo hello', 'Test command', ['test', 'hello']);

            contexts = createTestContexts('verbose');
            await runToRemoveSnipCommand(contexts, testFileName, commandName);
            sinon.assert.calledWith(consoleStub, `Remove a command ${commandName} in the file: ${testFileName}`);
        });

        [
            { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to save file: ${TEST_WORKING_DIR}/${testFileName}`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
            { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
        ].forEach(({value, assertion}) => {
            it(`should log error when logDetail is ${value} and write fails`, async () => {
                await runToCreateSnipFile(contexts, testFileName);
                const commandName = 'newCommand';
                await runToAddSnipCommand(contexts, testFileName, commandName, 'echo hello');

                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'writeFile').rejects(error);

                contexts = createTestContexts(value as logDetail);
                await runToRemoveSnipCommand(contexts, testFileName, commandName);
                assertion(error);
            });
        });
    });

    describe('editSnipCommand', () => {
        const testFileName = 'edit-command-test.snip';

        beforeEach(async () => {
            await runToCreateSnipFile(contexts, testFileName);
            await runToAddSnipCommand(contexts, testFileName, 'existingCommand', 'echo hello', 'Test desc', ['tag1']);
        });

        describe('successful edit', () => {
            it('should update command name', async () => {
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'newCommand');

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: newCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`);
            });

            it('should update command value', async () => {
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, 'echo updated');

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: existingCommand {
    cmd: "echo updated",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`);
            });

            it('should reset command value with double quote', async () => {
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, "");

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: existingCommand {
    cmd: "",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`);
            });

            it('should reset command value with single quote', async () => {
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, '');

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: existingCommand {
    cmd: "",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`);
            });

            it('should update description', async () => {
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, 'Updated desc');

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Updated desc",
    tags: [tag1],
    depends_on: []
}`);
            });

            it('should reset description with double quote', async () => {
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, "");

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "",
    tags: [tag1],
    depends_on: []
}`);
            });

            it('should reset description with single quote', async () => {
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, '');

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "",
    tags: [tag1],
    depends_on: []
}`);
            });

            it('should update tags', async () => {
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, ['newTag', 'tag']);

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [newTag, tag],
    depends_on: []
}`);
            });

            it('should update multiple fields', async () => {
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'renamedCommand', 'echo renamed', 'Renamed desc', ['tag2']);

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: renamedCommand {
    cmd: "echo renamed",
    desc: "Renamed desc",
    tags: [tag2],
    depends_on: []
}`);
            });

            it('should set tags to empty array when tags include empty string', async () => {
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, ['tag1', "", 'tag2']);

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [],
    depends_on: []
}`);
            });

            it('should set tags to empty array when tags include empty string (single quote)', async () => {
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, ['tag1', '', 'tag2']);

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [],
    depends_on: []
}`);
            });

            it('should update tags distinctly when duplicated tags are passed', async () => {
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, ['tag', 'tag']);

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag],
    depends_on: []
}`);
            });

            describe('dependsOn scenario', () => {

                describe('basaic success scenario', () => {
                    beforeEach(async () => {
                        await runToAddSnipCommand(contexts, testFileName, 'dependsOnCommand', 'echo hello', undefined, undefined, undefined);
                        await runToAddSnipCommand(contexts, testFileName, 'dependsOnCommand2', 'echo hello', undefined, undefined, undefined);
                    });

                    it('should update dependsOn', async () => {
                        await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['dependsOnCommand', 'dependsOnCommand2']);

                        const result = await readFile(testFileName, contexts.workingDir);
                        expect(result).to.equal(`@description: 
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [dependsOnCommand, dependsOnCommand2]
}
@command: dependsOnCommand {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: dependsOnCommand2 {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);
                    });

                    it('should set dependsOn to empty array when tags include empty string', async () => {
                        await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['dependsOnCommand', 'dependsOnCommand2']);
                        await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['dependsOnCommand', "", 'dependsOnCommand2']);

                        const result = await readFile(testFileName, contexts.workingDir);
                        expect(result).to.equal(`@description: 
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: dependsOnCommand {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: dependsOnCommand2 {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);
                    });

                    it('should set dependsOn to empty array when tags include empty string (single quote)', async () => {
                        await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['dependsOnCommand', 'dependsOnCommand2']);
                        await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['dependsOnCommand', '', 'dependsOnCommand2']);

                        const result = await readFile(testFileName, contexts.workingDir);
                        expect(result).to.equal(`@description: 
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: dependsOnCommand {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: dependsOnCommand2 {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);
                    });

                    it('should update dependsOn distinctly when duplicated dependsOn are passed', async () => {
                        await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['dependsOnCommand', 'dependsOnCommand']);

                        const result = await readFile(testFileName, contexts.workingDir);
                        expect(result).to.equal(`@description: 
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: [dependsOnCommand]
}
@command: dependsOnCommand {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}
@command: dependsOnCommand2 {
    cmd: "echo hello",
    desc: "",
    tags: [],
    depends_on: []
}`);
                    });
                });

                it('DAG shared nodes', async () => {
                    await runToAddSnipCommand(contexts, testFileName, 'E', 'echo hello', undefined, undefined, undefined);
                    await runToAddSnipCommand(contexts, testFileName, 'D', 'echo hello', undefined, undefined, ['E']);
                    await runToAddSnipCommand(contexts, testFileName, 'B', 'echo hello', undefined, undefined, ['D']);
                    await runToAddSnipCommand(contexts, testFileName, 'C', 'echo hello', undefined, undefined, ['D']);

                    await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['B', 'C']);

                    const result = await readFile(testFileName, contexts.workingDir);
                        expect(result).to.equal(`@description: 
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

                it('DAG shared nodes case 2', async () => {
                    await runToAddSnipCommand(contexts, testFileName, 'B', 'echo hello', undefined, undefined, undefined);
                    await runToAddSnipCommand(contexts, testFileName, 'C', 'echo hello', undefined, undefined, undefined);
                    await runToAddSnipCommand(contexts, testFileName, 'D', 'echo hello', undefined, undefined, ['B', 'C']);
                    await runToAddSnipCommand(contexts, testFileName, 'E', 'echo hello', undefined, undefined, ['D']);
                    

                    await runToEditSnipCommand(contexts, testFileName, 'B', undefined, undefined, undefined, undefined, ['existingCommand']);
                    await runToEditSnipCommand(contexts, testFileName, 'C', undefined, undefined, undefined, undefined, ['existingCommand']);

                    const result = await readFile(testFileName, contexts.workingDir);
                        expect(result).to.equal(`@description: 
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

                it('multiple dependsOn', async () => {
                    await runToAddSnipCommand(contexts, testFileName, 'B', 'echo hello', undefined, undefined, undefined);
                    await runToAddSnipCommand(contexts, testFileName, 'C', 'echo hello', undefined, undefined, undefined);
                    await runToAddSnipCommand(contexts, testFileName, 'D', 'echo hello', undefined, undefined, ['B']);
                    await runToAddSnipCommand(contexts, testFileName, 'E', 'echo hello', undefined, undefined, ['C']);

                    await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['D', 'E']);

                    const result = await readFile(testFileName, contexts.workingDir);
                        expect(result).to.equal(`@description: 
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

                it('multile dependsOn case 2', async () => {
                    await runToAddSnipCommand(contexts, testFileName, 'B', 'echo hello', undefined, undefined, undefined);
                    await runToAddSnipCommand(contexts, testFileName, 'C', 'echo hello', undefined, undefined, undefined);
                    await runToAddSnipCommand(contexts, testFileName, 'D', 'echo hello', undefined, undefined, ['B']);
                    await runToAddSnipCommand(contexts, testFileName, 'E', 'echo hello', undefined, undefined, ['C']);
                    

                    await runToEditSnipCommand(contexts, testFileName, 'B', undefined, undefined, undefined, undefined, ['existingCommand']);
                    await runToEditSnipCommand(contexts, testFileName, 'C', undefined, undefined, undefined, undefined, ['existingCommand']);

                    const result = await readFile(testFileName, contexts.workingDir);
                        expect(result).to.equal(`@description: 
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

                it('multiple shared nodes', async () => {
                    await runToAddSnipCommand(contexts, testFileName, 'B', 'echo hello', undefined, undefined, undefined);
                    await runToAddSnipCommand(contexts, testFileName, 'C', 'echo hello', undefined, undefined, undefined);
                    await runToAddSnipCommand(contexts, testFileName, 'D', 'echo hello', undefined, undefined, ['B', 'C']);
                    await runToAddSnipCommand(contexts, testFileName, 'F', 'echo hello', undefined, undefined, undefined);
                    await runToAddSnipCommand(contexts, testFileName, 'E', 'echo hello', undefined, undefined, ['C', 'F']);

                    await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['D', 'E']);

                    const result = await readFile(testFileName, contexts.workingDir);
                        expect(result).to.equal(`@description: 
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

                it('multiple shared nodes case 2', async () => {
                    await runToAddSnipCommand(contexts, testFileName, 'B', 'echo hello', undefined, undefined, undefined);
                    await runToAddSnipCommand(contexts, testFileName, 'C', 'echo hello', undefined, undefined, undefined);
                    await runToAddSnipCommand(contexts, testFileName, 'D', 'echo hello', undefined, undefined, ['B', 'C']);
                    await runToAddSnipCommand(contexts, testFileName, 'F', 'echo hello', undefined, undefined, undefined);
                    await runToAddSnipCommand(contexts, testFileName, 'E', 'echo hello', undefined, undefined, ['C', 'F']);

                    await runToEditSnipCommand(contexts, testFileName, 'B', undefined, undefined, undefined, undefined, ['existingCommand']);
                    await runToEditSnipCommand(contexts, testFileName, 'C', undefined, undefined, undefined, undefined, ['existingCommand']);
                    await runToEditSnipCommand(contexts, testFileName, 'F', undefined, undefined, undefined, undefined, ['existingCommand']);

                    const result = await readFile(testFileName, contexts.workingDir);
                        expect(result).to.equal(`@description: 
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
                 
                it('Replace existing dependencies', async () => {
                    await runToAddSnipCommand(contexts, testFileName, 'B', 'echo hello', undefined, undefined, ['existingCommand']);
                    await runToAddSnipCommand(contexts, testFileName, 'C', 'echo hello', undefined, undefined, undefined);

                    await runToEditSnipCommand(contexts, testFileName, 'B', undefined, undefined, undefined, undefined, ['']);
                    await runToEditSnipCommand(contexts, testFileName, 'C', undefined, undefined, undefined, undefined, ['existingCommand']);

                    const result = await readFile(testFileName, contexts.workingDir);
                        expect(result).to.equal(`@description: 
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

                it('Replace existing dependencies case 2', async () => {
                    await runToAddSnipCommand(contexts, testFileName, 'B', 'echo hello', undefined, undefined, ['existingCommand']);
                    await runToAddSnipCommand(contexts, testFileName, 'C', 'echo hello', undefined, undefined, undefined);

                    await runToEditSnipCommand(contexts, testFileName, 'B', undefined, undefined, undefined, undefined, ['C']);

                    const result = await readFile(testFileName, contexts.workingDir);
                        expect(result).to.equal(`@description: 
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

                it('Resolve dependency', async () => {
                    await runToAddSnipCommand(contexts, testFileName, 'B', 'echo hello', undefined, undefined, ['existingCommand']);
                    await runToAddSnipCommand(contexts, testFileName, 'C', 'echo hello', undefined, undefined, ['B']);

                    await runToEditSnipCommand(contexts, testFileName, 'B', undefined, undefined, undefined, undefined, ['']);

                    const result = await readFile(testFileName, contexts.workingDir);
                        expect(result).to.equal(`@description: 
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

                it('Resolve dependency case 2', async () => {
                    await runToAddSnipCommand(contexts, testFileName, 'B', 'echo hello', undefined, undefined, ['existingCommand']);
                    await runToAddSnipCommand(contexts, testFileName, 'C', 'echo hello', undefined, undefined, ['B']);

                    await runToEditSnipCommand(contexts, testFileName, 'C', undefined, undefined, undefined, undefined, ['']);

                    const result = await readFile(testFileName, contexts.workingDir);
                        expect(result).to.equal(`@description: 
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
            });
        });

        describe('no changes', () => {
            it('should do nothing when all parameters are undefined', async () => {
                const originalContent = await readFile(testFileName, contexts.workingDir);
                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand');

                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(originalContent);
                sinon.assert.notCalled(spy);
            });
        });

        describe('file not found', () => {
            it('should do nothing when file does not exist', async () => {
                const nonExistentFile = 'non-existent.snip';
                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipCommand(contexts, nonExistentFile, 'existingCommand', 'newCommand');
                sinon.assert.calledWith(consoleStub, `${nonExistentFile} is not found`);
                sinon.assert.notCalled(spy);
            });
        });

        describe('command not found', () => {
            it('should do nothing when command name does not exist', async () => {
                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipCommand(contexts, testFileName, 'nonExistentCommand', 'newCommand');
                sinon.assert.calledWith(consoleStub, `command 'nonExistentCommand' is not found`);
                sinon.assert.notCalled(spy);
            });

            it('should do nothing when any command does not exist', async () => {
                // remove all commands.
                await runToRemoveSnipCommand(contexts, testFileName, 'existingCommand');
                const spy = sinon.spy(fs.promises, 'writeFile');

                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'newCommand');
                sinon.assert.calledWith(consoleStub, `command 'existingCommand' is not found`);
                sinon.assert.notCalled(spy);
            });
        });

        describe('duplicated command', () => {
            it('should error when duplicated command name exist which is abnormal', async () => {
                const content = `@description: 
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`
                await writeFile(testFileName, contexts.workingDir, content);
                const spy = sinon.spy(fs.promises, 'writeFile');

                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'newCommand');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                sinon.assert.notCalled(spy);
            });
        });

        describe('duplicate name', () => {
            it('should not update when new name is the same as current', async () => {
                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'existingCommand');
                sinon.assert.calledWith(consoleStub, `command was not updated to 'existingCommand' as its name is same`);
                sinon.assert.notCalled(spy);
            });

            it('should not update when new name already exists', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'anotherCommand', 'echo another');
                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'anotherCommand');
                sinon.assert.calledWith(consoleStub, `command was not updated to 'anotherCommand' as its name already exits`);
                sinon.assert.notCalled(spy);
            });
        });

        describe('changing name break dependency', () => {
            it('changing name break dependency', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'dependsOnCommand', 'echo hello', undefined, undefined, ['existingCommand']);
                await runToAddSnipCommand(contexts, testFileName, 'non-dependsOnCommand', 'echo hello');
                
                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'anotherCommand');
                sinon.assert.calledWith(consoleStub, `command existingCommand still is depended on dependsOnCommand`);
                sinon.assert.notCalled(spy);
            });
        });

        describe('invald dependsOn edit', () => {
            it('Should not add itself to dependsOn when name is not changed', async () => {
                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['existingCommand']);
                sinon.assert.calledWith(consoleStub, `command cannot depend on itself`);
                sinon.assert.notCalled(spy);

                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['existingCommand, non-existingCommand']);
                sinon.assert.calledWith(consoleStub, `command cannot depend on itself`);
                sinon.assert.notCalled(spy);
            });

            it('Should not add itself to dependsOn when name is changed', async () => {
                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'newCommand', undefined, undefined, undefined, ['newCommand']);
                sinon.assert.calledWith(consoleStub, `command cannot depend on itself`);
                sinon.assert.notCalled(spy);

                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'newCommand', undefined, undefined, undefined, ['newCommand, non-existingCommand']);
                sinon.assert.calledWith(consoleStub, `command cannot depend on itself`);
                sinon.assert.notCalled(spy);
            });

            it('Should not add non-existing command to dependsOn when no other command exists and name is not changed', async () => {
                let spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['non-existingCommand']);
                sinon.assert.calledWith(consoleStub, `command 'existingCommand' has invalid dependencies: non-existingCommand`);
                sinon.assert.notCalled(spy);

                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['non-existingCommand', 'non-existingCommand2']);
                sinon.assert.calledWith(consoleStub, `command 'existingCommand' has invalid dependencies: non-existingCommand, non-existingCommand2`);
                sinon.assert.notCalled(spy);
                
            });

            it('Should not add non-existing command to dependsOn when other command exists and name is not changed', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'dependsOnCommand', 'echo hello', undefined, undefined, undefined);
                await runToAddSnipCommand(contexts, testFileName, 'dependsOnCommand2', 'echo hello', undefined, undefined, ['existingCommand']);

                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['non-existingCommand']);
                sinon.assert.calledWith(consoleStub, `command 'existingCommand' has invalid dependencies: non-existingCommand`);
                sinon.assert.notCalled(spy);
                
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['dependsOnCommand', 'non-existingCommand', 'non-existingCommand2']);
                sinon.assert.calledWith(consoleStub, `command 'existingCommand' has invalid dependencies: non-existingCommand, non-existingCommand2`);
                sinon.assert.notCalled(spy);
            });

            it('Should not add non-existing command to dependsOn when no other command exists and name is changed', async () => {
                let spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'newCommand', undefined, undefined, undefined, ['non-existingCommand']);
                sinon.assert.calledWith(consoleStub, `command 'newCommand' has invalid dependencies: non-existingCommand`);
                sinon.assert.notCalled(spy);

                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'newCommand', undefined, undefined, undefined, ['non-existingCommand', 'non-existingCommand2']);
                sinon.assert.calledWith(consoleStub, `command 'newCommand' has invalid dependencies: non-existingCommand, non-existingCommand2`);
                sinon.assert.notCalled(spy);
                
            });

            it('Should not add non-existing command to dependsOn when other command exists and name is changed', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'dependsOnCommand', 'echo hello', undefined, undefined, undefined);

                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'newCommand', undefined, undefined, undefined, ['non-existingCommand']);
                sinon.assert.calledWith(consoleStub, `command 'newCommand' has invalid dependencies: non-existingCommand`);
                sinon.assert.notCalled(spy);
                
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'newCommand', undefined, undefined, undefined, ['dependsOnCommand', 'non-existingCommand', 'non-existingCommand2']);
                sinon.assert.calledWith(consoleStub, `command 'newCommand' has invalid dependencies: non-existingCommand, non-existingCommand2`);
                sinon.assert.notCalled(spy);
            });
        });

        describe('dependency cycling', () => {
            
            it('direct cycle', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'B', 'echo hello', undefined, undefined, ['existingCommand']);

                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['B']);
                sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
                sinon.assert.notCalled(spy);

            });
            
            it('indirect cycle', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'B', 'echo hello', undefined, undefined, ['existingCommand']);
                await runToAddSnipCommand(contexts, testFileName, 'C', 'echo hello', undefined, undefined, ['B']);

                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['C']);
                sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
                sinon.assert.notCalled(spy);

            });

            it('indirect cycle(long)', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'B', 'echo hello', undefined, undefined, ['existingCommand']);
                await runToAddSnipCommand(contexts, testFileName, 'C', 'echo hello', undefined, undefined, ['B']);
                await runToAddSnipCommand(contexts, testFileName, 'D', 'echo hello', undefined, undefined, ['C']);
                await runToAddSnipCommand(contexts, testFileName, 'E', 'echo hello', undefined, undefined, ['D']);

                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['E']);
                sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
                sinon.assert.notCalled(spy);

            });

            it('multiple dependsOn and the either become cycling', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'B', 'echo hello', undefined, undefined, ['existingCommand']);
                await runToAddSnipCommand(contexts, testFileName, 'C', 'echo hello', undefined, undefined, undefined);
                await runToAddSnipCommand(contexts, testFileName, 'D', 'echo hello', undefined, undefined, ['B']);

                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['C', 'D']);
                sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
                sinon.assert.notCalled(spy);

            });

            it('multiple dependsOn and the either become cycling case2', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'B', 'echo hello', undefined, undefined, undefined);
                await runToAddSnipCommand(contexts, testFileName, 'C', 'echo hello', undefined, undefined, ['existingCommand']);

                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, ['B', 'C']);
                sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
                sinon.assert.notCalled(spy);

            });
        });

        describe('error handling', () => {
            it('should handle error when reading file fails', async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);

                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'newCommand');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
            });

            it('should handle error when writing file fails', async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'writeFile').rejects(error);

                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'newCommand');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
            });
        });

        describe('logging', () => {
            it('should log command name edit when logDetail is verbose', async () => {
                contexts = createTestContexts('verbose');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'newCommand', undefined, undefined, undefined);
                sinon.assert.calledWith(consoleStub, `A command was updated`);
                sinon.assert.calledWith(consoleStub, `newCommand`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, `Command     : echo hello`);
                sinon.assert.calledWith(consoleStub, `Description : Test desc`);
                sinon.assert.calledWith(consoleStub, `Tags        : tag1`);
                sinon.assert.calledWith(consoleStub, `DependsOn   : `);
            });

            it('should log command update when logDetail is verbose', async () => {
                contexts = createTestContexts('verbose');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, 'echo updated', undefined, undefined);
                sinon.assert.calledWith(consoleStub, `A command was updated`);
                sinon.assert.calledWith(consoleStub, `existingCommand`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, `Command     : echo updated`);
                sinon.assert.calledWith(consoleStub, `Description : Test desc`);
                sinon.assert.calledWith(consoleStub, `Tags        : tag1`);
                sinon.assert.calledWith(consoleStub, `DependsOn   : `);
            });

            it('should log description update when logDetail is verbose', async () => {
                contexts = createTestContexts('verbose');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, 'Updated desc', undefined);
                sinon.assert.calledWith(consoleStub, `A command was updated`);
                sinon.assert.calledWith(consoleStub, `existingCommand`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, `Command     : echo hello`);
                sinon.assert.calledWith(consoleStub, `Description : Updated desc`);
                sinon.assert.calledWith(consoleStub, `Tags        : tag1`);
                sinon.assert.calledWith(consoleStub, `DependsOn   : `);
            });

            it('should log tags update when logDetail is verbose', async () => {
                contexts = createTestContexts('verbose');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, ['newTag', 'tag']);
                sinon.assert.calledWith(consoleStub, `A command was updated`);
                sinon.assert.calledWith(consoleStub, `existingCommand`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, `Command     : echo hello`);
                sinon.assert.calledWith(consoleStub, `Description : Test desc`);
                sinon.assert.calledWith(consoleStub, `Tags        : newTag, tag`);
                sinon.assert.calledWith(consoleStub, `DependsOn   : `);
            });

            it('should log duplicated tags update when logDetail is verbose', async () => {
                contexts = createTestContexts('verbose');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, ['tag', 'tag']);
                sinon.assert.calledWith(consoleStub, `A command was updated`);
                sinon.assert.calledWith(consoleStub, `existingCommand`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, `Command     : echo hello`);
                sinon.assert.calledWith(consoleStub, `Description : Test desc`);
                sinon.assert.calledWith(consoleStub, `Tags        : tag`);
                sinon.assert.calledWith(consoleStub, `DependsOn   : `);
            });

            it('should log dependsOn update when logDetail is verbose', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'anotherCommand', 'echo hello', '', [], []);
                await runToAddSnipCommand(contexts, testFileName, 'dependsOnCommand', 'echo hello', 'Test desc', ['tag1'], []);
                contexts = createTestContexts('verbose');
                await runToEditSnipCommand(contexts, testFileName, 'dependsOnCommand', undefined, undefined, undefined, undefined, ['existingCommand', 'anotherCommand']);
                sinon.assert.calledWith(consoleStub, `A command was updated`);
                sinon.assert.calledWith(consoleStub, `dependsOnCommand`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, `Command     : echo hello`);
                sinon.assert.calledWith(consoleStub, `Description : Test desc`);
                sinon.assert.calledWith(consoleStub, `Tags        : tag1`);
                sinon.assert.calledWith(consoleStub, `DependsOn   : existingCommand, anotherCommand`);
            });

            it('should log duplicated dependsOn update when logDetail is verbose', async () => {
                await runToAddSnipCommand(contexts, testFileName, 'dependsOnCommand', 'echo hello', 'Test desc', ['tag1'], []);
                contexts = createTestContexts('verbose');
                await runToEditSnipCommand(contexts, testFileName, 'dependsOnCommand', undefined, undefined, undefined, undefined, ['existingCommand', 'existingCommand']);
                sinon.assert.calledWith(consoleStub, `A command was updated`);
                sinon.assert.calledWith(consoleStub, `dependsOnCommand`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, `Command     : echo hello`);
                sinon.assert.calledWith(consoleStub, `Description : Test desc`);
                sinon.assert.calledWith(consoleStub, `Tags        : tag1`);
                sinon.assert.calledWith(consoleStub, `DependsOn   : existingCommand`);
            });

            it('should log nothing to update when all params undefined and logDetail is verbose', async () => {
                contexts = createTestContexts('verbose');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', undefined, undefined, undefined, undefined, undefined);
                sinon.assert.calledWith(consoleStub, `Nothing to update as 'name' and 'command' and 'description' and 'tag' and 'dependsOn' were not passed`);
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Multile command 'existingCommand' are found`))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.calledWith(consoleErrorStub, `Something went wrong`)},
                { value: undefined, assertion: () => sinon.assert.calledWith(consoleErrorStub, `Something went wrong`)}
            ].forEach(({value, assertion}) => {
                it(`should error when duplicated command name exist which is abnormal when logDetail is ${value}`, async () => {
                    const content = `@description: 
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`
                await writeFile(testFileName, contexts.workingDir, content);

                contexts = createTestContexts(value as logDetail);
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'newCommand', undefined, undefined, undefined);
                assertion(new Error(`Multile command 'existingCommand' are found`));
                });
            });

            it('should not log when logDetail is normal', async () => {
                contexts = createTestContexts('normal');
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'newCommand', 'echo updated', 'Updated desc', ['newTag']);
                sinon.assert.notCalled(consoleStub);
            });

            it('should not log when logDetail is undefined', async () => {
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'newCommand');
                sinon.assert.notCalled(consoleStub);
            });

        [
            { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read file: ${TEST_WORKING_DIR}/${testFileName}`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
            { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
        ].forEach(({value, assertion}) => {
            it(`should log error when log is ${value} and read fails`, async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);
                contexts = createTestContexts(value as logDetail);
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'newCommand', undefined, undefined, undefined);
                assertion(error);
            });
        });

        [
            {  value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to save file: ${TEST_WORKING_DIR}/${testFileName}`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
            { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
        ].forEach(({value, assertion}) => {
            it(`should log error when log is ${value} and write fails`, async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'writeFile').rejects(error);
                contexts = createTestContexts(value as logDetail);
                await runToEditSnipCommand(contexts, testFileName, 'existingCommand', 'newCommand', undefined, undefined, undefined);
                assertion(error);
            });
        });
    });
    });

    describe('addTagToSnipCommand', () => {
    const testFileName = 'tag-command-test.snip';
    const testCommandName = 'test-tag-command';

        beforeEach(async () => {
            await runToCreateSnipFile(contexts, testFileName);
            await runToAddSnipCommand(contexts, testFileName, testCommandName, 'echo hello', 'Test desc');
        });

        it('successful add a tag  when its command has no tags', async () => {
            await runToAddTagToSnipCommand(contexts, testFileName, testCommandName, 'new-tag');

            const result = await readFile(testFileName, contexts.workingDir);
            expect(result).to.equal(`@description: 
@tags: 
@command: test-tag-command {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [new-tag],
    depends_on: []
}`);
        });

        it('successful add a tag  when its command has some tags', async () => {
                await runToAddTagToSnipCommand(contexts, testFileName, testCommandName, 'pre-tag');

                await runToAddTagToSnipCommand(contexts, testFileName, testCommandName, 'new-tag');
                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: test-tag-command {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [pre-tag, new-tag],
    depends_on: []
}`);
        });

        describe('file not found', () => {
            it('should do nothing when file does not exist', async () => {
                const nonExistentFile = 'non-existent.snip';
                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToAddTagToSnipCommand(contexts, nonExistentFile, testCommandName, 'new-tag');
                sinon.assert.calledWith(consoleStub, `${nonExistentFile} is not found`);
                sinon.assert.notCalled(spy);
            });
        });

        describe('command not found', () => {
            it('should do nothing when command name does not exist', async () => {
                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToAddTagToSnipCommand(contexts, testFileName, 'nonExistentCommand', 'new-tag');
                sinon.assert.calledWith(consoleStub, `command 'nonExistentCommand' is not found`);
                sinon.assert.notCalled(spy);
            });

            it('should do nothing when any command does not exist', async () => {
                // remove all commands.
                await runToRemoveSnipCommand(contexts, testFileName, testCommandName);
                const spy = sinon.spy(fs.promises, 'writeFile');

                await runToAddTagToSnipCommand(contexts, testFileName, testCommandName, 'new-tag');
                sinon.assert.calledWith(consoleStub, `command '${testCommandName}' is not found`);
                sinon.assert.notCalled(spy);
            });
        });

        describe('duplicated command', () => {
            it('should error when duplicated command name exist which is abnormal', async () => {
                const content = `@description: 
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`
                await writeFile(testFileName, contexts.workingDir, content);
                const spy = sinon.spy(fs.promises, 'writeFile');

                await runToAddTagToSnipCommand(contexts, testFileName, 'existingCommand', 'new-tag');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                sinon.assert.notCalled(spy);
            });
        });

        describe('duplicate tag', () => {
            it('should not update  when its tag is already added', async () => {
                await runToAddTagToSnipCommand(contexts, testFileName, testCommandName, 'new-tag');

                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToAddTagToSnipCommand(contexts, testFileName, testCommandName, 'new-tag');
                const result = await readFile(testFileName, contexts.workingDir);
                expect(result).to.equal(`@description: 
@tags: 
@command: test-tag-command {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [new-tag],
    depends_on: []
}`);
                sinon.assert.calledWith(consoleStub, `new-tag is already added`);
                sinon.assert.notCalled(spy);
            });
        });

        describe('error handling', () => {
            it('should handle error when reading file fails', async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);

                await runToAddTagToSnipCommand(contexts, testFileName, testCommandName, 'new-tag');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
            });

            it('should handle error when writing file fails', async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'writeFile').rejects(error);

                await runToAddTagToSnipCommand(contexts, testFileName, testCommandName, 'new-tag');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
            });
        });

        describe('logging', () => {
            it(`should log details when logDetail is verbose}`, async () => {
                contexts = createTestContexts('verbose');
                await runToAddTagToSnipCommand(contexts, testFileName, testCommandName, 'new-tag');
                sinon.assert.calledWith(consoleStub, `A tag was added`);
                sinon.assert.calledWith(consoleStub, `${testCommandName}`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, `Command     : echo hello`);
                sinon.assert.calledWith(consoleStub, `Description : Test desc`);
                sinon.assert.calledWith(consoleStub, `Tags        : new-tag`);
            });

            [
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log details when logDetail is ${value}`, async () => {
                    contexts = createTestContexts(value as logDetail);
                    await runToAddTagToSnipCommand(contexts, testFileName, testCommandName, 'new-tag');
                    assertion();
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Multile command 'existingCommand' are found`))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.calledWith(consoleErrorStub, `Something went wrong`)},
                { value: undefined, assertion: () => sinon.assert.calledWith(consoleErrorStub, `Something went wrong`)}
            ].forEach(({value, assertion}) => {
                it(`should error when duplicated command name exist which is abnormal when logDetail is ${value}`, async () => {
                    const content = `@description: 
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`
                await writeFile('tag-command-test.snip', contexts.workingDir, content);

                contexts = createTestContexts(value as logDetail);
                await runToAddTagToSnipCommand(contexts, testFileName, 'existingCommand', 'new-tag');
                assertion(new Error(`Multile command 'existingCommand' are found`));
                });
            });

        [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read file: ${TEST_WORKING_DIR}/${testFileName}`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
            { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
        ].forEach(({value, assertion}) => {
            it(`should log error when log is ${value} and read fails`, async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);
                
                contexts = createTestContexts(value as logDetail);
                await runToAddTagToSnipCommand(contexts, testFileName, testCommandName, 'new-tag');
                assertion(error);
            });
        });

        [
            { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to save file: ${TEST_WORKING_DIR}/${testFileName}`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
            { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
            { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
        ].forEach(({value, assertion}) => {
            it(`should log error when log is ${value} and write fails`, async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'writeFile').rejects(error);

                contexts = createTestContexts(value as logDetail);
                await runToAddTagToSnipCommand(contexts, testFileName, testCommandName, 'new-tag');
                assertion(error);
            });
        });
    });
    });

    describe('removeTagFromSnipCommand', () => {
        const testFileName = 'tag-command-test.snip';
        const testCommandName = 'test-tag-command';

        beforeEach(async () => {
            await runToCreateSnipFile(contexts, testFileName);
            await runToAddSnipCommand(contexts, testFileName, testCommandName, 'echo hello', 'Test desc', ['existing-tag']);
        });

        it('successful remove a tag when its command has a tag', async () => {
            await runToRemoveTagFromSnipCommand(contexts, testFileName, testCommandName, 'existing-tag');

            const result = await readFile(testFileName, contexts.workingDir);
            expect(result).to.equal(`@description: 
@tags: 
@command: test-tag-command {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [],
    depends_on: []
}`);
        });

        it('successful remove a tag when its command has multiple tags', async () => {
            await runToEditSnipCommand(contexts, testFileName, testCommandName, undefined, undefined, undefined, ['tag', 'existing-tag']);
            await runToRemoveTagFromSnipCommand(contexts, testFileName, testCommandName, 'existing-tag');

            const result = await readFile(testFileName, contexts.workingDir);
            expect(result).to.equal(`@description: 
@tags: 
@command: test-tag-command {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag],
    depends_on: []
}`);
        });

        it('should do nothing when the command has no tags', async () => {
            await runToRemoveTagFromSnipCommand(contexts, testFileName, testCommandName, 'existing-tag');

            const spy = sinon.spy(fs.promises, 'writeFile');
            await runToRemoveTagFromSnipCommand(contexts, testFileName, testCommandName, 'existing-tag');
            sinon.assert.calledWith(consoleStub, `'existing-tag' is not tagged`);
            sinon.assert.notCalled(spy);
        });

        it('should do nothing when the tag does not exist', async () => {
            const spy = sinon.spy(fs.promises, 'writeFile');
            await runToRemoveTagFromSnipCommand(contexts, testFileName, testCommandName, 'non-existing-tag');
            sinon.assert.calledWith(consoleStub, `'non-existing-tag' is not tagged`);
            sinon.assert.notCalled(spy);
        });

        describe('file not found', () => {
            it('should do nothing when file does not exist', async () => {
                const nonExistentFile = 'non-existent.snip';
                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToRemoveTagFromSnipCommand(contexts, nonExistentFile, testCommandName, 'existing-tag');
                sinon.assert.calledWith(consoleStub, `${nonExistentFile} is not found`);
                sinon.assert.notCalled(spy);
            });
        });

        describe('command not found', () => {
            it('should do nothing when command name does not exist', async () => {
                const spy = sinon.spy(fs.promises, 'writeFile');
                await runToRemoveTagFromSnipCommand(contexts, testFileName, 'nonExistentCommand', 'new-tag');
                sinon.assert.calledWith(consoleStub, `command 'nonExistentCommand' is not found`);
                sinon.assert.notCalled(spy);
            });

            it('should do nothing when any command does not exist', async () => {
                // remove all commands.
                await runToRemoveSnipCommand(contexts, testFileName, testCommandName);
                const spy = sinon.spy(fs.promises, 'writeFile');

                await runToRemoveTagFromSnipCommand(contexts, testFileName, testCommandName, 'new-tag');
                sinon.assert.calledWith(consoleStub, `command '${testCommandName}' is not found`);
                sinon.assert.notCalled(spy);
            });
        });

        describe('duplicated command', () => {
            it('should error when duplicated command name exist which is abnormal', async () => {
                const content = `@description: 
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`
                await writeFile(testFileName, contexts.workingDir, content);
                const spy = sinon.spy(fs.promises, 'writeFile');

                await runToRemoveTagFromSnipCommand(contexts, testFileName, 'existingCommand', 'new-tag');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                sinon.assert.notCalled(spy);
            });
        });

        describe('error handling', () => {
            it('should handle error when reading file fails', async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);

                await runToRemoveTagFromSnipCommand(contexts, testFileName, testCommandName, 'existing-tag');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
            });

            it('should handle error when writing file fails', async () => {
                const error = new Error('disk full');
                fsStub = sinon.stub(fs.promises, 'writeFile').rejects(error);

                await runToRemoveTagFromSnipCommand(contexts, testFileName, testCommandName, 'existing-tag');
                sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
            });
        });

        describe('logging', () => {
            it(`should log details when logDetail is verbose`, async () => {
                contexts = createTestContexts('verbose');
                await runToRemoveTagFromSnipCommand(contexts, testFileName, testCommandName, 'existing-tag');
                sinon.assert.calledWith(consoleStub, `A tag was removed`);
                sinon.assert.calledWith(consoleStub, `${testCommandName}`);
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, `Command     : echo hello`);
                sinon.assert.calledWith(consoleStub, `Description : Test desc`);
                sinon.assert.calledWith(consoleStub, `Tags        : `);
            });

            [
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log details when logDetail is ${value}`, async () => {
                    contexts = createTestContexts(value as logDetail);
                    await runToRemoveTagFromSnipCommand(contexts, testFileName, testCommandName, 'existing-tag');
                    assertion();
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Multile command 'existingCommand' are found`))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.calledWith(consoleErrorStub, `Something went wrong`)},
                { value: undefined, assertion: () => sinon.assert.calledWith(consoleErrorStub, `Something went wrong`)}
            ].forEach(({value, assertion}) => {
                it(`should error when duplicated command name exist which is abnormal when logDetail is ${value}`, async () => {
                    const content = `@description: 
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1],
    depends_on: []
}`
                await writeFile(testFileName, contexts.workingDir, content);

                contexts = createTestContexts(value as logDetail);
                await runToRemoveTagFromSnipCommand(contexts, testFileName, 'existingCommand', 'existing-tag');
                assertion(new Error(`Multile command 'existingCommand' are found`));
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read file: ${TEST_WORKING_DIR}/${testFileName}`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when logDetal is ${value} and read fails`, async () => {
                    const error = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);
                    contexts = createTestContexts(value as logDetail);
                    await runToRemoveTagFromSnipCommand(contexts, testFileName, testCommandName, 'existing-tag');
                    assertion(error);
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to save file: ${TEST_WORKING_DIR}/${testFileName}`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when logDetail is ${value} and write fails`, async () => {
                    const error = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'writeFile').rejects(error);
                    contexts = createTestContexts(value as logDetail);
                    await runToRemoveTagFromSnipCommand(contexts, testFileName, testCommandName, 'existing-tag');
                    assertion(error);
                });
            });
        });
    });

    describe('findSnipFiles', () => {
        beforeEach(async () => {
            await runToCreateSnipFile(contexts, 'valid.snip', 'description');
            await runToAddTagToSnipFile(contexts, 'valid.snip', 'tag1');
            await runToAddTagToSnipFile(contexts, 'valid.snip', 'tag1 and 1');

            await runToCreateSnipFile(contexts, 'valid2.snip', 'description with spaces');
            await runToAddTagToSnipFile(contexts, 'valid2.snip', 'tag1');
            await runToAddTagToSnipFile(contexts, 'valid2.snip', 'tag2');

            await runToCreateSnipFile(contexts, 'empty-desc.snip', '');
            await runToCreateSnipFile(contexts, 'no-desc.snip', '');

            // Create invalid .txt file
            await writeFile('invalid.txt', contexts.workingDir, 'content');

            // Create directories
            await fs.promises.mkdir(path.join(contexts.workingDir, 'dir.snip'), { recursive: true });
            await fs.promises.mkdir(path.join(contexts.workingDir, 'other-dir'), { recursive: true });
            const contextsForAbnormalTest = {...contexts, workingDir: `${TEST_WORKING_DIR}/other-dir`};
            await runToCreateSnipFile(contextsForAbnormalTest, 'empty-desc.snip', 'should not be read');
        });

        describe('dir only', () => {
            it('should list all .snip files when dir exists', async () => {
                await runToFindSnipFiles(contexts);

                expect(consoleStub.callCount).to.equal(4);
                sinon.assert.calledWith(consoleStub, 'valid');
                sinon.assert.calledWith(consoleStub, 'valid2');
                sinon.assert.calledWith(consoleStub, 'empty-desc');
                sinon.assert.calledWith(consoleStub, 'no-desc');
            });

            it('should handle non-existent dir', async () => {
                const contextsForAbnormalTest = {...contexts, workingDir: path.join(contexts.workingDir, 'nonexistent')};
                await runToFindSnipFiles(contextsForAbnormalTest);

                sinon.assert.notCalled(consoleStub);
            });
        });

        describe('dir + matchString', () => {
            it('should list all .snip files when matchString is empty', async () => {
                await runToFindSnipFiles(contexts, '');

                expect(consoleStub.callCount).to.equal(4);
                sinon.assert.calledWith(consoleStub, 'valid');
                sinon.assert.calledWith(consoleStub, 'valid2');
                sinon.assert.calledWith(consoleStub, 'empty-desc');
                sinon.assert.calledWith(consoleStub, 'no-desc');
            });

            [
                {arg: 'valid', scenario: 'name (no spaces)', searched: ['valid', 'valid2'], prepareAdditionally: () => null},
                {arg: 'descri', scenario: 'description (no spaces)', searched: ['valid', 'valid2'], prepareAdditionally: () => null},
                {arg: 'description with', scenario: 'description (with spaces)', searched: ['valid2'], prepareAdditionally: () => null},
                {arg: 'match', scenario: 'both name and description', searched: ['matchname'], 
                    prepareAdditionally: async () => await runToCreateSnipFile(contexts, 'matchname.snip', 'match both')},
            ].forEach(({arg, scenario, searched, prepareAdditionally}) => {
                it(`should filter by matchString in ${scenario}`, async () => {
                    await prepareAdditionally();
                    await runToFindSnipFiles(contexts, arg);
                    expect(consoleStub.callCount).to.equal(searched.length);
                    searched.forEach(s => sinon.assert.calledWith(consoleStub, s));
                });
            });

            it('should not list files when no match', async () => {
                await runToFindSnipFiles(contexts, 'nonexistent');
                sinon.assert.notCalled(consoleStub);
            });
        });

        describe('dir + tag', () => {
            [
                {arg: [], scenario: 'array'},
                {arg: [""], scenario: 'string'}
            ].forEach(({arg, scenario}) => {
                it(`should list all .snip files when tags is empty ${scenario}`, async () => {
                    await runToFindSnipFiles(contexts, undefined, arg);

                    sinon.assert.calledWith(consoleStub, 'valid');
                    sinon.assert.calledWith(consoleStub, 'valid2');
                    sinon.assert.calledWith(consoleStub, 'empty-desc');
                    sinon.assert.calledWith(consoleStub, 'no-desc');
                });
            });

            [
                {arg: ['tag2'], scenario: 'single tag (one file matches, no spaces)', searched: ['valid2'], prepareAdditionally: () => null},
                {arg: ['tag1'], scenario: 'single tag (multiple files match, no spaces)', searched: ['valid', 'valid2'], prepareAdditionally: () => null},
                {arg: ['tag1 and 1'], scenario: 'single tag (one file matches, with spaces)', searched: ['valid'], prepareAdditionally: () => null},
                {arg: ['tag1 and 1'], scenario: 'single tag (multiple files match, with spaces)', searched: ['test1', 'valid'], 
                    prepareAdditionally: async () => {
                        await runToCreateSnipFile(contexts, 'test1.snip');
                        await runToAddTagToSnipFile(contexts, 'test1.snip', 'tag1 and 1');
                    }},
                {arg: ['tag2', 'nomatch'], scenario: 'multiple tags (one matches, one file, no spaces)', searched: ['valid2'], prepareAdditionally: () => null},
                {arg: ['tag1', 'nomatch'], scenario: 'multiple tags (one matches, multiple files, no spaces)', searched: ['valid', 'valid2'], prepareAdditionally: () => null},
                {arg: ['tag1 and 1', 'no match'], scenario: 'multiple tags (one matches, one file, with spaces)', searched: ['valid'], prepareAdditionally: () => null},
                {arg: ['tag1 and 1', 'nomatch'], scenario: 'multiple tags (one matches, multiple files, with spaces)', searched: ['valid', 'test1'], 
                    prepareAdditionally: async () => {
                        await runToCreateSnipFile(contexts, 'test1.snip');
                        await runToAddTagToSnipFile(contexts, 'test1.snip', 'tag1 and 1');
                    }},
                {arg: ['tagX', 'tagY'], scenario: 'multiple tags (multiple matches in one file, no spaces)', searched: ['test1'], 
                    prepareAdditionally: async () => {
                        await runToCreateSnipFile(contexts, 'test1.snip');
                        await runToAddTagToSnipFile(contexts, 'test1.snip', 'tagX');
                        await runToAddTagToSnipFile(contexts, 'test1.snip', 'tagY');
                    }},
                {arg: ['tag1', 'tag2'], scenario: 'multiple tags (multiple matches across files, no spaces)', searched: ['valid', 'valid2'], prepareAdditionally: () => null},
                {arg: ['tagX', 'tag with spaces'], scenario: 'multiple tags (multiple matches in one file, with spaces)', searched: ['test1'], 
                    prepareAdditionally: async () => {
                        await runToCreateSnipFile(contexts, 'test1.snip');
                        await runToAddTagToSnipFile(contexts, 'test1.snip', 'tagX');
                        await runToAddTagToSnipFile(contexts, 'test1.snip', 'tag with spaces');
                    }},
                {arg: ['tag2', 'tag1 and 1'], scenario: 'multiple tags (multiple matches across files, with spaces)', searched: ['valid', 'valid2'], prepareAdditionally: () => null},
            ].forEach(({arg, scenario, searched, prepareAdditionally}) => {
                it(`should filter by ${scenario}`, async () => {
                    await prepareAdditionally();
                    await runToFindSnipFiles(contexts, undefined, arg);
                    expect(consoleStub.callCount).to.equal(searched.length);
                    searched.forEach(s => sinon.assert.calledWith(consoleStub, s));
                });
            });

            it('should not list files when no tag matches', async () => {
                await runToFindSnipFiles(contexts, undefined, ['nomatch']);
                sinon.assert.notCalled(consoleStub);
            });

            it('should skip the empty string tag', async () => {
                await runToFindSnipFiles(contexts, undefined, ['tag2', ""]);
                expect(consoleStub.callCount).to.equal(1);
                sinon.assert.calledWith(consoleStub, 'valid2');
            });
        });

        describe('dir + matchString + tag (AND)', () => {
            it('should filter by matchString AND tag (both true in same file)', async () => {
                await runToFindSnipFiles(contexts, 'valid', ['tag2']);
                expect(consoleStub.callCount).to.equal(1);
                sinon.assert.calledWith(consoleStub, 'valid2');
            });

            [
                {matchString: 'no match', tags: ['tag2'], scenario: '(matchString false, tag true)'},
                {matchString: 'valid', tags: ['nomatch'], scenario: '(matchString true, tag false)'},
                {matchString: 'no match', tags: ['nomatch'], scenario: '(both false)'},
                {matchString: 'valid2', tags: ['tag1 and'], scenario: '(matchString in file A, tag in file B)'}
            ].forEach(({matchString, tags, scenario}) => {
                it(`should filter by matchString AND tag ${scenario}`, async () => {
                    await runToFindSnipFiles(contexts, matchString, tags);
                    sinon.assert.notCalled(consoleStub);
                });
            });
        });

        describe('dir + detail', () => {
            it('should list files with details when detail is true', async () => {
                await runToAddSnipCommand(contexts, 'valid.snip', 'sample-command', 'command')
                await runToAddSnipCommand(contexts, 'valid2.snip', 'command1', 'command')
                await runToAddSnipCommand(contexts, 'valid2.snip', 'command2', 'command')
                await runToFindSnipFiles(contexts, undefined, undefined, true);

                sinon.assert.calledWith(consoleStub, 'empty-desc');
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, 'Description : ');
                sinon.assert.calledWith(consoleStub, 'Tags        : ');
                sinon.assert.calledWith(consoleStub, 'Commands    : ');
                sinon.assert.calledWith(consoleStub, 'no-desc');
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, 'Description : ');
                sinon.assert.calledWith(consoleStub, 'Tags        : ');
                sinon.assert.calledWith(consoleStub, 'Commands    : ');
                sinon.assert.calledWith(consoleStub, 'valid');
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, 'Description : description');
                sinon.assert.calledWith(consoleStub, 'Tags        : tag1, tag1 and 1');
                sinon.assert.calledWith(consoleStub, 'Commands    : sample-command');
                sinon.assert.calledWith(consoleStub, 'valid2');
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, 'Description : description with spaces');
                sinon.assert.calledWith(consoleStub, 'Tags        : tag1, tag2');
                sinon.assert.calledWith(consoleStub, 'Commands    : command1, command2');
            });

            it('should handle non-existent files with detail', async () => {
                const emptyDir = path.join(contexts.workingDir, 'empty');
                await fs.promises.mkdir(emptyDir, { recursive: true });
                const contextsForAbnormalTest = {...contexts, workingDir: emptyDir};
                await runToFindSnipFiles(contextsForAbnormalTest, undefined, undefined, true);

                sinon.assert.notCalled(consoleStub);
            });
        });

        describe('error handling', () => {
            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read file: ${TEST_WORKING_DIR}/empty-desc.snip`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when logDetail is ${value} and read fails`, async () => {
                    const cause = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'readFile').rejects(cause);

                    contexts = createTestContexts(value as logDetail);
                    await runToFindSnipFiles(contexts, 'match', undefined, undefined);
                    assertion(cause);
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read directory: ${TEST_WORKING_DIR}`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when logDetail is ${value} and read dir fails`, async () => {
                    const cause = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'readdir').rejects(cause);

                    contexts = createTestContexts(value as logDetail);
                    await runToFindSnipFiles(contexts);
                    assertion(cause);
                });
            });
        });
    });

    describe('findCommands', () => {
        beforeEach(async () => {
            await runToCreateSnipFile(contexts, 'sample.snip', 'description');
            await runToAddSnipCommand(contexts, 'sample.snip', 'valid-command', 'ping', 'description', ['tag1', 'tag1 and 1']);
            await runToAddSnipCommand(contexts, 'sample.snip', 'empty-command', 'whoami');
            await runToAddSnipCommand(contexts, 'sample.snip', 'test-command', 'npm run', 'description with spaces', ['tag1', 'tag2'], ['valid-command', 'empty-command']);
        });

        describe('command only', () => {
            it('should list all commands', async () => {
                await runToFindCommands(contexts, 'sample.snip');

                expect(consoleStub.callCount).to.equal(3);
                sinon.assert.calledWith(consoleStub, 'valid-command');
                sinon.assert.calledWith(consoleStub, 'test-command');
                sinon.assert.calledWith(consoleStub, 'empty-command');
            });

            it('should handle no command is found', async () => {
                await runToFindCommands(contexts, 'sample.snip', 'not-exist');
                sinon.assert.notCalled(consoleStub);
            });

            it('should handle no snip file is found', async () => {
                await runToFindCommands(contexts, 'non-exist.snip', 'not-exist');
                sinon.assert.notCalled(consoleStub);
            });
        });

        describe('command + matchString', () => {
            it('should list all commands when matchString is empty', async () => {
                await runToFindCommands(contexts, 'sample.snip', '');

                expect(consoleStub.callCount).to.equal(3);
                sinon.assert.calledWith(consoleStub, 'valid-command');
                sinon.assert.calledWith(consoleStub, 'test-command');
                sinon.assert.calledWith(consoleStub, 'empty-command');
            });

            [
                {arg: 'valid', scenario: 'name', searched: ['valid-command'], prepareAdditionally: () => null},
                {arg: 'descri', scenario: 'description (no spaces)', searched: ['valid-command', 'test-command'], prepareAdditionally: () => null},
                {arg: 'description with', scenario: 'description (with spaces)', searched: ['test-command'], prepareAdditionally: () => null},
                {arg: 'pin', scenario: 'command (no spaces)', searched: ['valid-command'], prepareAdditionally: () => null},
                {arg: 'npm ru', scenario: 'command (with spaces)', searched: ['test-command'], prepareAdditionally: () => null},
                {arg: 'match', scenario: 'both name and description', searched: ['match-terminal'], 
                    prepareAdditionally: async () => await runToAddSnipCommand(contexts, 'sample.snip', 'match-terminal', 'terminal-name', 'match-name')},
                {arg: 'terminal', scenario: 'both name and command', searched: ['match-terminal'], 
                    prepareAdditionally: async () => await runToAddSnipCommand(contexts, 'sample.snip', 'match-terminal', 'terminal-name', 'match-name')},
                {arg: 'name', scenario: 'both description and command', searched: ['match-terminal'], 
                    prepareAdditionally: async () => await runToAddSnipCommand(contexts, 'sample.snip', 'match-terminal', 'terminal-name', 'match-name')},
                {arg: 'match', scenario: 'all name, description and command', searched: ['match'], 
                    prepareAdditionally: async () => await runToAddSnipCommand(contexts, 'sample.snip', 'match', 'match', 'match match')},
            ].forEach(({arg, scenario, searched, prepareAdditionally}) => {
                it(`should filter by matchString in ${scenario}`, async () => {
                    await prepareAdditionally();
                    await runToFindCommands(contexts, 'sample.snip', arg);
                    expect(consoleStub.callCount).to.equal(searched.length);
                    searched.forEach(s => sinon.assert.calledWith(consoleStub, s));
                });
            });

            it('should not list command when no match', async () => {
                await runToFindCommands(contexts, 'sample.snip', 'nonexistent');
                sinon.assert.notCalled(consoleStub);
            });
        });

        describe('command + tag', () => {
            [
                {arg: [], scenario: 'array'},
                {arg: [""], scenario: 'string'}
            ].forEach(({arg, scenario}) => {
                it(`should list all .snip files when tags is empty ${scenario}`, async () => {
                    await runToFindCommands(contexts, 'sample.snip', undefined, arg);
                    sinon.assert.calledWith(consoleStub, 'valid-command');
                    sinon.assert.calledWith(consoleStub, 'test-command');
                    sinon.assert.calledWith(consoleStub, 'empty-command');
                });
            });

            [
                {arg: ['tag2'], scenario: 'single tag (one file matches, no spaces)', searched: ['test-command'], prepareAdditionally: () => null},
                {arg: ['tag1'], scenario: 'single tag (multiple files match, no spaces)', searched: ['valid-command', 'test-command'], prepareAdditionally: () => null},
                {arg: ['tag1 and 1'], scenario: 'single tag (one file matches, with spaces)', searched: ['valid-command'], prepareAdditionally: () => null},
                {arg: ['tag1 and 1'], scenario: 'single tag (multiple files match, with spaces)', searched: ['valid-command', 'command1'], 
                    prepareAdditionally: async () => await runToAddSnipCommand(contexts, 'sample.snip', 'command1', 'test', undefined, ['tag1 and 1'])},
                {arg: ['tag2', 'nomatch'], scenario: 'multiple tags (one matches, one file, no spaces)', searched: ['test-command'], prepareAdditionally: () => null},
                {arg: ['tag1', 'nomatch'], scenario: 'multiple tags (one matches, multiple files, no spaces)', searched: ['valid-command', 'test-command'], prepareAdditionally: () => null},
                {arg: ['tag1 and 1', 'no match'], scenario: 'multiple tags (one matches, one file, with spaces)', searched: ['valid-command'], prepareAdditionally: () => null},
                {arg: ['tag1 and 1', 'nomatch'], scenario: 'multiple tags (one matches, multiple files, with spaces)', searched: ['valid-command', 'command1'], 
                    prepareAdditionally: async () => await runToAddSnipCommand(contexts, 'sample.snip', 'command1', 'test', undefined, ['tag1 and 1'])},
                {arg: ['tagX', 'tagY'], scenario: 'multiple tags (multiple matches in one file, no spaces)', searched: ['command1'], 
                    prepareAdditionally: async () => await runToAddSnipCommand(contexts, 'sample.snip', 'command1', 'test', undefined, ['tagX', 'tagY'])},
                {arg: ['tag1', 'tag2'], scenario: 'multiple tags (multiple matches across files, no spaces)', searched: ['valid-command', 'test-command'], prepareAdditionally: () => null},
                {arg: ['tagX', 'tag with spaces'], scenario: 'multiple tags (multiple matches in one file, with spaces)', searched: ['command1'], 
                    prepareAdditionally: async () => await runToAddSnipCommand(contexts, 'sample.snip', 'command1', 'test', undefined, ['tagX', 'tag with spaces'])},
                {arg: ['tag2', 'tag1 and 1'], scenario: 'multiple tags (multiple matches across files, with spaces)', searched: ['valid-command', 'test-command'], prepareAdditionally: () => null},
            ].forEach(({arg, scenario, searched, prepareAdditionally}) => {
                it(`should filter by ${scenario}`, async () => {
                    await prepareAdditionally();
                    await runToFindCommands(contexts, 'sample.snip', undefined, arg);
                    expect(consoleStub.callCount).to.equal(searched.length);
                    searched.forEach(s => sinon.assert.calledWith(consoleStub, s));
                });
            });

            it('should not list files when no tag matches', async () => {
                await runToFindCommands(contexts, 'sample.snip', undefined, ['nomatch']);
                sinon.assert.notCalled(consoleStub);
            });

            it('should skip the empty string tag', async () => {
                await runToFindCommands(contexts, 'sample.snip', undefined, ['tag2', ""]);
                expect(consoleStub.callCount).to.equal(1);
                sinon.assert.calledWith(consoleStub, 'test-command');
            });
        });

        describe('command + matchString + tag (AND)', () => {
            it('should filter by matchString AND tag (both true in same file)', async () => {
                await runToFindCommands(contexts, 'sample.snip', 'npm run', ['tag2']);
                expect(consoleStub.callCount).to.equal(1);
                sinon.assert.calledWith(consoleStub, 'test-command');
            });

            [
                {matchString: 'no match', tags: ['tag2'], scenario: '(matchString false, tag true)'},
                {matchString: 'valid', tags: ['nomatch'], scenario: '(matchString true, tag false)'},
                {matchString: 'no match', tags: ['nomatch'], scenario: '(both false)'},
                {matchString: 'valid2', tags: ['tag1 and'], scenario: '(matchString in file A, tag in file B)'}
            ].forEach(({matchString, tags, scenario}) => {
                it(`should filter by matchString AND tag ${scenario}`, async () => {
                    await runToFindCommands(contexts, 'sample.snip', matchString, tags);
                    sinon.assert.notCalled(consoleStub);
                });
            });
        });

        describe('command + detail', () => {
            it('should list files with details when detail is true', async () => {
                await runToFindCommands(contexts, 'sample.snip', undefined, undefined, true);

                sinon.assert.calledWith(consoleStub, 'empty-command');
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, 'Command     : whoami');
                sinon.assert.calledWith(consoleStub, 'Description : ');
                sinon.assert.calledWith(consoleStub, 'Tags        : ');
                sinon.assert.calledWith(consoleStub, 'DependsOn   : ');
                sinon.assert.calledWith(consoleStub, 'test-command');
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, 'Command     : npm run');
                sinon.assert.calledWith(consoleStub, 'Description : description with spaces');
                sinon.assert.calledWith(consoleStub, 'Tags        : tag1, tag2');
                sinon.assert.calledWith(consoleStub, 'DependsOn   : valid-command, empty-command');
                sinon.assert.calledWith(consoleStub, 'valid-command');
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, 'Command     : ping');
                sinon.assert.calledWith(consoleStub, 'Description : description');
                sinon.assert.calledWith(consoleStub, 'Tags        : tag1, tag1 and 1');
                sinon.assert.calledWith(consoleStub, 'DependsOn   : ');
            });

            it('should handle non-existent file with detail', async () => {
                await runToFindCommands(contexts, 'non-match.snip', undefined, undefined, true);

                sinon.assert.notCalled(consoleStub);
            });
        });

        describe('error handling', () => {
            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read file: ${TEST_WORKING_DIR}/sample.snip`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when logDetail is ${value} and read fails`, async () => {
                    const cause = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'readFile').rejects(cause);

                    contexts = createTestContexts(value as logDetail);
                    await runToFindCommands(contexts, 'sample.snip', undefined, undefined, undefined);
                    assertion(cause);
                });
            });
        });
    });

    describe('listupSnipTags', () => {
        
       it('should handle non-existent dir', async () => {
            const nonExistentDir = path.join(contexts.workingDir, 'nonexistent');
            const contextsForAbnormalTest = {...contexts, workingDir: nonExistentDir};
            await runToListupSnipTags(contextsForAbnormalTest);
            sinon.assert.notCalled(consoleStub);
        });

        it('should handle no file in dir', async () => {
            await runToListupSnipTags(contexts);
            sinon.assert.notCalled(consoleStub);
        });

        it('should show none when snip has no tag', async () => {
            await runToCreateSnipFile(contexts, 'no-tag.snip');
            await runToListupSnipTags(contexts);
            sinon.assert.notCalled(consoleStub);
        });

        it('should show tag list of all snip files', async () => {
            await runToCreateSnipFile(contexts, 'valid.snip', 'description');
            await runToAddTagToSnipFile(contexts, 'valid.snip', 'tag1');

            await runToCreateSnipFile(contexts, 'valid2.snip', 'description with spaces');
            await runToAddTagToSnipFile(contexts, 'valid2.snip', 'tagABC');
            await runToAddTagToSnipFile(contexts, 'valid2.snip', 'tagXYZ');

            await runToListupSnipTags(contexts);
            sinon.assert.callCount(consoleStub, 3);
            sinon.assert.calledWith(consoleStub, 'tag1');
            sinon.assert.calledWith(consoleStub, 'tagABC');
            sinon.assert.calledWith(consoleStub, 'tagXYZ');
        });

        it('should show tag list without duplicated', async () => {
            await runToCreateSnipFile(contexts, 'valid.snip', 'description');
            await runToAddTagToSnipFile(contexts, 'valid.snip', 'tag1');

            await runToCreateSnipFile(contexts, 'valid2.snip', 'description with spaces');
            await runToAddTagToSnipFile(contexts, 'valid2.snip', 'tag1');

            await runToListupSnipTags(contexts);
            sinon.assert.callCount(consoleStub, 1);
            sinon.assert.calledWith(consoleStub, 'tag1');
        });

        it('should handle properly when a various of files exist', async () => {
            await runToCreateSnipFile(contexts, 'valid.snip', 'description');
            await runToAddTagToSnipFile(contexts, 'valid.snip', 'abc');
            await runToAddTagToSnipFile(contexts, 'valid.snip', 'b c d');

            await runToCreateSnipFile(contexts, 'valid2.snip', 'description with spaces');
            await runToAddTagToSnipFile(contexts, 'valid2.snip', 'abc');
            await runToAddTagToSnipFile(contexts, 'valid2.snip', 'tagABC');

            await runToCreateSnipFile(contexts, 'no-desc.snip');

            // Create invalid .txt file
            await writeFile('invalid.txt', contexts.workingDir, 'content');

            // Create directories
            await fs.promises.mkdir(path.join(contexts.workingDir, 'dir.snip'), { recursive: true });
            await fs.promises.mkdir(path.join(contexts.workingDir, 'other-dir'), { recursive: true });
            const contextsForAbnormalTest = {...contexts, workingDir: `${TEST_WORKING_DIR}/other-dir`};
            await runToCreateSnipFile(contextsForAbnormalTest, 'empty-desc.snip', 'should not be read');
            await runToAddTagToSnipFile(contextsForAbnormalTest, 'empty-desc.snip', 'xyz');

            await runToListupSnipTags(contexts);

            sinon.assert.callCount(consoleStub, 3);
            sinon.assert.calledWith(consoleStub, 'abc');
            sinon.assert.calledWith(consoleStub, 'b c d');
            sinon.assert.calledWith(consoleStub, 'tagABC');
            sinon.assert.neverCalledWith(consoleStub, 'xyz');
        });

        describe('error handling', () => {
            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read directory: ${TEST_WORKING_DIR}`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when logDetail is ${value} and read dir fails`, async () => {
                    const cause = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'readdir').rejects(cause);

                    contexts = createTestContexts(value as logDetail);
                    await runToListupSnipTags(contexts);
                    assertion(cause);
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read file: ${TEST_WORKING_DIR}/no-tag.snip`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when logDetail is ${value} and read fails`, async () => {
                    await runToCreateSnipFile(contexts, 'no-tag.snip');

                    const cause = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'readFile').rejects(cause);

                    contexts = createTestContexts(value as logDetail);
                    await runToListupSnipTags(contexts);
                    assertion(cause);
                });
            });
        });

    });

    describe('listupCommandTags', () => {

        it('should handle snip file is not found', async () => {
            await runToListupCommandTags(contexts, 'not-found.snip');
            sinon.assert.notCalled(consoleStub);
        });

        it('should handle command is not found', async () => {
            await runToCreateSnipFile(contexts, 'sample.snip', 'description');

            await runToListupCommandTags(contexts, 'sample.snip');
            sinon.assert.notCalled(consoleStub);
        });

        it('should handle command has no tag', async () => {
            await runToCreateSnipFile(contexts, 'sample.snip', 'description');
            await runToAddSnipCommand(contexts, 'sample.snip', 'empty-command', 'whoami');

            await runToListupCommandTags(contexts, 'sample.snip');
            sinon.assert.notCalled(consoleStub);
        });

        it('should show tag list of all command', async () => {
            await runToCreateSnipFile(contexts, 'sample.snip', 'description');
            await runToAddSnipCommand(contexts, 'sample.snip', 'test-command', 'npm run', 'description with spaces', ['tag1', 'tag 2']);
            await runToAddSnipCommand(contexts, 'sample.snip', 'sample-cmd', 'ping', 'description with spaces', ['abc']);

            await runToListupCommandTags(contexts, 'sample.snip');
            sinon.assert.callCount(consoleStub, 3);
            sinon.assert.calledWith(consoleStub, 'abc');
            sinon.assert.calledWith(consoleStub, 'tag1');
            sinon.assert.calledWith(consoleStub, 'tag 2');
        });

        it('should show tag list without duplicated', async () => {
            await runToCreateSnipFile(contexts, 'sample.snip', 'description');
            await runToAddSnipCommand(contexts, 'sample.snip', 'test-command', 'npm run', 'description with spaces', ['tag1', 'tag 2']);
            await runToAddSnipCommand(contexts, 'sample.snip', 'sample-cmd', 'ping', 'description with spaces', ['tag1', 'abc']);

            await runToListupCommandTags(contexts, 'sample.snip');
            sinon.assert.callCount(consoleStub, 3);
            sinon.assert.calledWith(consoleStub, 'abc');
            sinon.assert.calledWith(consoleStub, 'tag1');
            sinon.assert.calledWith(consoleStub, 'tag 2');
        });

        describe('error handling', () => {
            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read file: ${TEST_WORKING_DIR}/empty-command.snip`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when logDetail is ${value} and read fails`, async () => {
                    await runToCreateSnipFile(contexts, 'no-desc.snip');

                    const error = new Error('disk full');
                    fsStub = fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);

                    contexts = createTestContexts(value as logDetail);
                    await runToListupCommandTags(contexts, 'empty-command.snip');
                    assertion(error);
                });
            });
        });
    });

    describe('showDescription', () => {
        beforeEach(async () => {
            await runToCreateSnipFile(contexts, 'valid.snip', 'description');
            await runToAddTagToSnipFile(contexts, 'valid.snip', 'tagA');
            await runToAddSnipCommand(contexts, 'valid.snip', 'empty-command', 'whoami');
            await runToAddSnipCommand(contexts, 'valid.snip', 'test-command', 'npm run', 'description with spaces', ['tag1', 'tag2'], ['empty-command']);
            await runToCreateSnipFile(contexts, 'empty.snip');
        });

        describe('show description of file', () => {
            it('file has value for all field', async () => {
                await runToShowDescription(contexts, 'valid.snip');

                sinon.assert.calledWith(consoleStub, 'valid');
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, 'Description : description');
                sinon.assert.calledWith(consoleStub, 'Tags        : tagA');
                sinon.assert.calledWith(consoleStub, 'Commands    : empty-command, test-command');
            });

            it('file has no value for all field', async () => {
                await runToShowDescription(contexts, 'empty.snip');

                sinon.assert.calledWith(consoleStub, 'empty');
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, 'Description : ');
                sinon.assert.calledWith(consoleStub, 'Tags        : ');
                sinon.assert.calledWith(consoleStub, 'Commands    : ');
            });
        });

        describe('show description of command', () => {
            it('file has value for all field', async () => {
                await runToShowDescription(contexts, 'valid.snip', 'test-command');

                sinon.assert.calledWith(consoleStub, 'test-command');
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, 'Command     : npm run');
                sinon.assert.calledWith(consoleStub, 'Description : description with spaces');
                sinon.assert.calledWith(consoleStub, 'Tags        : tag1, tag2');
                sinon.assert.calledWith(consoleStub, 'DependsOn   : empty-command');
            });

            it('file has no value for all field', async () => {
                await runToShowDescription(contexts, 'valid.snip', 'empty-command');

                sinon.assert.calledWith(consoleStub, 'empty-command');
                sinon.assert.calledWith(consoleStub, '─────────');
                sinon.assert.calledWith(consoleStub, 'Command     : whoami');
                sinon.assert.calledWith(consoleStub, 'Description : ');
                sinon.assert.calledWith(consoleStub, 'Tags        : ');
                sinon.assert.calledWith(consoleStub, 'DependsOn   : ');
            });
        });

        describe('not found', () => {
            it('file', async () => {
                await runToShowDescription(contexts, 'not-found.snip');
                sinon.assert.calledWith(consoleStub, 'not-found.snip is not found');
            });

            it('command', async () => {
                await runToShowDescription(contexts, 'valid.snip', 'not-foud');
                sinon.assert.calledWith(consoleStub, `command 'not-foud' is not found`);
            });
        });

        describe('error handling', () => {

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read file: ${TEST_WORKING_DIR}/valid.snip`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.calledWith(consoleErrorStub, `Something went wrong`)},
                { value: undefined, assertion: () => sinon.assert.calledWith(consoleErrorStub, `Something went wrong`)}
            ].forEach(({value, assertion}) => {
                it(`should handle loadSnipCommand failure when logDetail is ${value}`, async () => {
                    const error = new Error('readFile failed');
                    fsStub = sinon.stub(fs.promises, 'readFile').rejects(error);

                    contexts = createTestContexts(value as logDetail)
                    await runToShowDescription(contexts, 'valid.snip', 'not-foud');
                    assertion(error);
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Multile command 'existingCommand' are found`))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.calledWith(consoleErrorStub, `Something went wrong`)},
                { value: undefined, assertion: () => sinon.assert.calledWith(consoleErrorStub, `Something went wrong`)}
            ].forEach(({value, assertion}) => {
                it(`should error when duplicated command name exist which is abnormal when logDetail is ${value}`, async () => {
                    const content = `@description: 
@tags: 
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1]
}
@command: existingCommand {
    cmd: "echo hello",
    desc: "Test desc",
    tags: [tag1]
}`
                await writeFile('valid.snip', contexts.workingDir, content);

                contexts = createTestContexts(value as logDetail);
                await runToShowDescription(contexts, 'valid.snip', 'existingCommand');
                assertion(new Error(`Multile command 'existingCommand' are found`));
                });
            });
        });
        });

    describe('runToExecuteCommands', () => {
        const logIndexOf = (needle: string): number => {
            const i = consoleStub.getCalls().findIndex(
                (c) => String(c.args[0]).includes(needle)
            );
            expect(i, `log not found: ${needle}`).to.be.greaterThan(-1);
            return i;
        };
        
        let contextsToRun: Contexts;
        
        beforeEach(() => {
           contextsToRun = {
                    workingDir: TEST_WORKING_DIR,
                    logger: new Logger(),
                    commandConfig: {
                        encoding: 'utf-8'
                    }
                } as Contexts
        });

        describe('file is provided and dryRun = true', () => {
            const fileName = 'exec-dry.snip';

            beforeEach(async () => {
                await runToCreateSnipFile(contexts, fileName);
                await runToAddSnipCommand(contexts, fileName, 'cmd1', 'echo hello', 'A', ['tag2']);
                await runToAddSnipCommand(contexts, fileName, 'cmd2', 'echo world', 'B', ['tag1', 'tag2']);

                await runToCreateSnipFile(contexts, 'no-command.snip');
            });

            it('should execute all commands in the specified file', async () => {
                const nonTargetFile = 'non-taget.snip'
                await runToCreateSnipFile(contexts, nonTargetFile);
                await runToAddSnipCommand(contexts, nonTargetFile, 'cmd3', 'echo hello');

                await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, true);

                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd1] Executing ...`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd1] Completed with code 0`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] Executing ...`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] Completed with code 0`);
                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd3] Executing ...`);
                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd3] Completed with code 0`);
            });

            it('should execute only the named command in the specified file', async () => {
                await runToExecuteCommands(contextsToRun, fileName, 'cmd2', undefined, true);

                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] Executing ...`);
                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] Completed with code 0`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] Executing ...`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] Completed with code 0`);
            });

            it('should do nothing when the named command does not exist in the specified file', async () => {
                await runToExecuteCommands(contextsToRun, fileName, 'cmd99', undefined, true);

                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] Executing ...`);
                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] Completed with code 0`);
                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd2] Executing ...`);
                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd2] Completed with code 0`);
            });

            it('should execute only commands matching tags in the specified file', async () => {
                await runToAddSnipCommand(contexts, fileName, 'cmd3', 'echo world', 'C');
                await runToAddSnipCommand(contexts, fileName, 'cmd4', 'echo world', 'D', ['tag1']);
                await runToAddSnipCommand(contexts, fileName, 'cmd5', 'echo world', 'E', ['tag1', 'tag3']);

                await runToExecuteCommands(contextsToRun, fileName, undefined, ['tag2'], true);

                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd1] Executing ...`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd1] Completed with code 0`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] Executing ...`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] Completed with code 0`);
                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd3] Executing ...`);
                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd3] Completed with code 0`);
                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd4] Executing ...`);
                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd4] Completed with code 0`);
                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd5] Executing ...`);
                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd5] Completed with code 0`);
            });

            it('should execute no commands in the specified file when empty tag is provided', async () => {
                await runToAddSnipCommand(contexts, fileName, 'cmd3', 'echo world', 'C');
                await runToAddSnipCommand(contexts, fileName, 'cmd4', 'echo world', 'D', ['tag1']);
                await runToAddSnipCommand(contexts, fileName, 'cmd5', 'echo world', 'E', ['tag2', 'tag3']);

                await runToExecuteCommands(contextsToRun, fileName, undefined, [], true);

                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd1] Executing ...`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd1] Completed with code 0`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] Executing ...`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] Completed with code 0`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd3] Executing ...`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd3] Completed with code 0`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd4] Executing ...`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd4] Completed with code 0`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd5] Executing ...`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd5] Completed with code 0`);
            });

            it('should execute only the command matching both name and tags in the specified file', async () => {
                await runToExecuteCommands(contextsToRun, fileName, 'cmd2', ['tag2'], true);

                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] Executing ...`);
                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] Completed with code 0`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] Executing ...`);
                sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] Completed with code 0`);
            });

            it('should do nothing no command matching both name and tags in the specified file', async () => {
                await runToExecuteCommands(contextsToRun, fileName, 'cmd99', ['tag2'], true);

                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] Executing ...`);
                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] Completed with code 0`);
                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd2] Executing ...`);
                sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd2] Completed with code 0`);
            });

            it('should do nothing when the named file has no command', async () => {
                await runToExecuteCommands(contextsToRun, 'no-command.snip', undefined, undefined, true);

                sinon.assert.notCalled(consoleStub);
                sinon.assert.notCalled(consoleErrorStub);
            });

            it('should do nothing when the specified file does not exist', async () => {
                const fileName = 'exec-missing-false.snip';
                await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, true);

                sinon.assert.notCalled(consoleStub);
                sinon.assert.notCalled(consoleErrorStub);
            });

            describe('dependsOn scenario', () => {
                beforeEach(() => {
                    contextsToRun.logger = new Logger('verbose');
                });

                it('simple dependency', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello', undefined, undefined, ['cmd1']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, true);

                    // console logの出力の順番も検証するため、deep.equalで検証する。
                    expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                        'chunk 1...',
                        '[exec-dry::cmd1] Executing ...',
                        '[exec-dry::cmd1] Completed with code 0',
                        '[exec-dry::cmd2] Executing ...',
                        '[exec-dry::cmd2] Completed with code 0',
                        'chunk 2...',
                        '[exec-dry::cmdA] Executing ...',
                        '[exec-dry::cmdA] Completed with code 0',
                    ]);
                });

                it('simple dependency case 2', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdB', 'echo hello', undefined, undefined, ['cmd1']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, true);

                    // console logの出力の順番も検証するため、deep.equalで検証する。
                    expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                        'chunk 1...',
                        '[exec-dry::cmd1] Executing ...',
                        '[exec-dry::cmd1] Completed with code 0',
                        '[exec-dry::cmd2] Executing ...',
                        '[exec-dry::cmd2] Completed with code 0',
                        'chunk 2...',
                        '[exec-dry::cmdA] Executing ...',
                        '[exec-dry::cmdA] Completed with code 0',
                        '[exec-dry::cmdB] Executing ...',
                        '[exec-dry::cmdB] Completed with code 0',
                    ]);
                });

                it('long dependency', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdB', 'echo hello', undefined, undefined, ['cmdA']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdC', 'echo hello', undefined, undefined, ['cmdB']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdD', 'echo hello', undefined, undefined, ['cmdC']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, true);

                    // console logの出力の順番も検証するため、deep.equalで検証する。
                    expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                        'chunk 1...',
                        '[exec-dry::cmd1] Executing ...',
                        '[exec-dry::cmd1] Completed with code 0',
                        '[exec-dry::cmd2] Executing ...',
                        '[exec-dry::cmd2] Completed with code 0',
                        'chunk 2...',
                        '[exec-dry::cmdA] Executing ...',
                        '[exec-dry::cmdA] Completed with code 0',
                        'chunk 3...',
                        '[exec-dry::cmdB] Executing ...',
                        '[exec-dry::cmdB] Completed with code 0',
                        'chunk 4...',
                        '[exec-dry::cmdC] Executing ...',
                        '[exec-dry::cmdC] Completed with code 0',
                        'chunk 5...',
                        '[exec-dry::cmdD] Executing ...',
                        '[exec-dry::cmdD] Completed with code 0',
                    ]);
                });

                it('DAO shared nodes', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdB', 'echo hello', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdC', 'echo hello', undefined, undefined, ['cmdA', 'cmdB']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdD', 'echo hello', undefined, undefined, ['cmdC']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, true);

                    // console logの出力の順番も検証するため、deep.equalで検証する。
                    expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                        'chunk 1...',
                        '[exec-dry::cmd1] Executing ...',
                        '[exec-dry::cmd1] Completed with code 0',
                        '[exec-dry::cmd2] Executing ...',
                        '[exec-dry::cmd2] Completed with code 0',
                        'chunk 2...',
                        '[exec-dry::cmdA] Executing ...',
                        '[exec-dry::cmdA] Completed with code 0',
                        '[exec-dry::cmdB] Executing ...',
                        '[exec-dry::cmdB] Completed with code 0',
                        'chunk 3...',
                        '[exec-dry::cmdC] Executing ...',
                        '[exec-dry::cmdC] Completed with code 0',
                        'chunk 4...',
                        '[exec-dry::cmdD] Executing ...',
                        '[exec-dry::cmdD] Completed with code 0',
                    ]);
                });

                it('multiple DependsOn', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdB', 'echo hello', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdC', 'echo hello', undefined, undefined, ['cmdA']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdD', 'echo hello', undefined, undefined, ['cmdB']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, true);

                    // console logの出力の順番も検証するため、deep.equalで検証する。
                    expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                        'chunk 1...',
                        '[exec-dry::cmd1] Executing ...',
                        '[exec-dry::cmd1] Completed with code 0',
                        '[exec-dry::cmd2] Executing ...',
                        '[exec-dry::cmd2] Completed with code 0',
                        'chunk 2...',
                        '[exec-dry::cmdA] Executing ...',
                        '[exec-dry::cmdA] Completed with code 0',
                        '[exec-dry::cmdB] Executing ...',
                        '[exec-dry::cmdB] Completed with code 0',
                        'chunk 3...',
                        '[exec-dry::cmdC] Executing ...',
                        '[exec-dry::cmdC] Completed with code 0',
                        '[exec-dry::cmdD] Executing ...',
                        '[exec-dry::cmdD] Completed with code 0',
                    ]);
                });

                it('multiple DependsOn case 2', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdB', 'echo hello', undefined, undefined, ['cmd2']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdC', 'echo hello', undefined, undefined, ['cmdA', 'cmdB']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, true);

                    // console logの出力の順番も検証するため、deep.equalで検証する。
                    expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                        'chunk 1...',
                        '[exec-dry::cmd1] Executing ...',
                        '[exec-dry::cmd1] Completed with code 0',
                        '[exec-dry::cmd2] Executing ...',
                        '[exec-dry::cmd2] Completed with code 0',
                        'chunk 2...',
                        '[exec-dry::cmdA] Executing ...',
                        '[exec-dry::cmdA] Completed with code 0',
                        '[exec-dry::cmdB] Executing ...',
                        '[exec-dry::cmdB] Completed with code 0',
                        'chunk 3...',
                        '[exec-dry::cmdC] Executing ...',
                        '[exec-dry::cmdC] Completed with code 0',
                    ]);
                });

                it('multiple shared nodes', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdB', 'echo hello', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdC', 'echo hello', undefined, undefined, ['cmdA', 'cmdB']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdE', 'echo hello', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdD', 'echo hello', undefined, undefined, ['cmdC', 'cmdE']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, true);

                    // console logの出力の順番も検証するため、deep.equalで検証する。
                    expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                        'chunk 1...',
                        '[exec-dry::cmd1] Executing ...',
                        '[exec-dry::cmd1] Completed with code 0',
                        '[exec-dry::cmd2] Executing ...',
                        '[exec-dry::cmd2] Completed with code 0',
                        'chunk 2...',
                        '[exec-dry::cmdA] Executing ...',
                        '[exec-dry::cmdA] Completed with code 0',
                        '[exec-dry::cmdB] Executing ...',
                        '[exec-dry::cmdB] Completed with code 0',
                        '[exec-dry::cmdE] Executing ...',
                        '[exec-dry::cmdE] Completed with code 0',
                        'chunk 3...',
                        '[exec-dry::cmdC] Executing ...',
                        '[exec-dry::cmdC] Completed with code 0',
                        'chunk 4...',
                        '[exec-dry::cmdD] Executing ...',
                        '[exec-dry::cmdD] Completed with code 0',
                    ]);
                });

                it('multiple shared nodes case 2', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello', undefined, undefined, []);
                    await runToAddSnipCommand(contexts, fileName, 'cmdB', 'echo hello', undefined, undefined, ['cmd1', 'cmd2']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdC', 'echo hello', undefined, undefined, ['cmd2', 'cmdA']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdD', 'echo hello', undefined, undefined, ['cmdB', 'cmdC']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, true);

                    // console logの出力の順番も検証するため、deep.equalで検証する。
                    expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                        'chunk 1...',
                        '[exec-dry::cmd1] Executing ...',
                        '[exec-dry::cmd1] Completed with code 0',
                        '[exec-dry::cmd2] Executing ...',
                        '[exec-dry::cmd2] Completed with code 0',
                        '[exec-dry::cmdA] Executing ...',
                        '[exec-dry::cmdA] Completed with code 0',
                        'chunk 2...',
                        '[exec-dry::cmdB] Executing ...',
                        '[exec-dry::cmdB] Completed with code 0',
                        '[exec-dry::cmdC] Executing ...',
                        '[exec-dry::cmdC] Completed with code 0',
                        'chunk 3...',
                        '[exec-dry::cmdD] Executing ...',
                        '[exec-dry::cmdD] Completed with code 0',
                    ]);
                });

                it('execute successfully when filter by tag', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello', undefined, ['tag1'], ['cmd2']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, ['tag1'], true);

                    // console logの出力の順番も検証するため、deep.equalで検証する。
                    expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                        'chunk 1...',
                        '[exec-dry::cmd2] Executing ...',
                        '[exec-dry::cmd2] Completed with code 0',
                        'chunk 2...',
                        '[exec-dry::cmdA] Executing ...',
                        '[exec-dry::cmdA] Completed with code 0',
                    ]);
                });

                it('execute successfully when filter by tag case 2', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello', undefined, ['tag1'], ['cmd2']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdB', 'echo hello', undefined, ['tag1'], ['cmd2']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, ['tag1'], true);

                    // console logの出力の順番も検証するため、deep.equalで検証する。
                    expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                        'chunk 1...',
                        '[exec-dry::cmd2] Executing ...',
                        '[exec-dry::cmd2] Completed with code 0',
                        'chunk 2...',
                        '[exec-dry::cmdA] Executing ...',
                        '[exec-dry::cmdA] Completed with code 0',
                        '[exec-dry::cmdB] Executing ...',
                        '[exec-dry::cmdB] Completed with code 0',
                    ]);
                });
            });

        });

        describe('file is not provided and dryRun = true', () => {
            describe('executable file exist', () => {
                const file1 = 'exec-tags-1.snip';
                const file2 = 'exec-tags-2.snip';

                beforeEach(async () => {
                    await runToCreateSnipFile(contexts, file1);
                    await runToAddSnipCommand(contexts, file1, 'cmd1', 'echo one', 'A', ['tag1']);
                    await runToCreateSnipFile(contexts, file2);
                    await runToAddSnipCommand(contexts, file2, 'cmd1', 'echo world', 'X', ['tag1', 'tag3']);
                    await runToAddSnipCommand(contexts, file2, 'cmd2', 'echo world', 'Y', ['tag2', 'tag3']);
                });

                it('should execute all commands in all snip files when no filters are provided', async () => {
                    await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);

                    sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] Executing ...`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] Completed with code 0`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd1] Executing ...`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd1] Completed with code 0`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd2] Executing ...`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd2] Completed with code 0`);
                });
                
                it('should execute only commands with matching name across all snip files', async () => {
                    await runToExecuteCommands(contextsToRun, undefined, 'cmd1', undefined, true);

                    sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] Executing ...`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] Completed with code 0`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd1] Executing ...`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd1] Completed with code 0`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmd2] Executing ...`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmd2] Completed with code 0`);
                });

                it('should execute only commands matching tags across all snip files', async () => {
                    await runToAddSnipCommand(contexts, file1, 'cmdM', 'echo two', 'B', ['tag2']);
                    await runToAddSnipCommand(contexts, file2, 'cmdN', 'echo world', 'Z');

                    await runToExecuteCommands(contextsToRun, undefined, undefined, ['tag2'], true);

                    sinon.assert.neverCalledWith(consoleStub, `[exec-tags-1::cmd1] Executing ...`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-tags-1::cmd1] Completed with code 0`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmd1] Executing ...`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmd1] Completed with code 0`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmdM] Executing ...`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmdM] Completed with code 0`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd2] Executing ...`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd2] Completed with code 0`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmdN] Executing ...`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmdN] Completed with code 0`);
                });

                it('should execute all commands when tags argument is empty array', async () => {
                    await runToAddSnipCommand(contexts, file1, 'cmdM', 'echo two', 'B', ['tag2']);
                    await runToAddSnipCommand(contexts, file2, 'cmdN', 'echo world', 'Z');

                    await runToExecuteCommands(contextsToRun, undefined, undefined, [], true);

                    sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] Executing ...`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] Completed with code 0`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd1] Executing ...`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd1] Completed with code 0`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd2] Executing ...`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd2] Completed with code 0`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmdM] Executing ...`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmdM] Completed with code 0`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmdN] Executing ...`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmdN] Completed with code 0`);
                });

                it('should execute only commands matching both name and tags across all snip files', async () => {
                    await runToExecuteCommands(contextsToRun, undefined, 'cmd1', ['tag3'], true);

                    sinon.assert.neverCalledWith(consoleStub, `[exec-tags-1::cmd1] Executing ...`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-tags-1::cmd1] Completed with code 0`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd1] Executing ...`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd1] Completed with code 0`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmd2] Executing ...`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmd2] Completed with code 0`);
                });

                describe('dependsOn scenario', () => {
                    beforeEach(async () => {
                        contextsToRun.logger = new Logger('verbose');
                        await runToAddSnipCommand(contexts, file1, 'cmdA', 'echo hello', undefined, undefined, ['cmd1']);
                    });

                    it('simple dependency', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello', undefined, undefined, ['cmd1']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);

                        // console logの出力の順番も検証するため、deep.equalで検証する。
                        expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                            'chunk 1...',
                            '[exec-tags-1::cmd1] Executing ...',
                            '[exec-tags-1::cmd1] Completed with code 0',
                            '[exec-tags-2::cmd1] Executing ...',
                            '[exec-tags-2::cmd1] Completed with code 0',
                            '[exec-tags-2::cmd2] Executing ...',
                            '[exec-tags-2::cmd2] Completed with code 0',
                            'chunk 2...',
                            '[exec-tags-1::cmdA] Executing ...',
                            '[exec-tags-1::cmdA] Completed with code 0',
                            '[exec-tags-2::cmdA] Executing ...',
                            '[exec-tags-2::cmdA] Completed with code 0',
                        ]);
                    });

                    it('simple dependency case 2', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdB', 'echo hello', undefined, undefined, ['cmd1']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);

                        // console logの出力の順番も検証するため、deep.equalで検証する。
                        expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                            'chunk 1...',
                            '[exec-tags-1::cmd1] Executing ...',
                            '[exec-tags-1::cmd1] Completed with code 0',
                            '[exec-tags-2::cmd1] Executing ...',
                            '[exec-tags-2::cmd1] Completed with code 0',
                            '[exec-tags-2::cmd2] Executing ...',
                            '[exec-tags-2::cmd2] Completed with code 0',
                            'chunk 2...',
                            '[exec-tags-1::cmdA] Executing ...',
                            '[exec-tags-1::cmdA] Completed with code 0',
                            '[exec-tags-2::cmdA] Executing ...',
                            '[exec-tags-2::cmdA] Completed with code 0',
                            '[exec-tags-2::cmdB] Executing ...',
                            '[exec-tags-2::cmdB] Completed with code 0',
                        ]);
                    });

                    it('long dependency', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdB', 'echo hello', undefined, undefined, ['cmdA']);
                        await runToAddSnipCommand(contexts, file2, 'cmdC', 'echo hello', undefined, undefined, ['cmdB']);
                        await runToAddSnipCommand(contexts, file2, 'cmdD', 'echo hello', undefined, undefined, ['cmdC']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);

                        // console logの出力の順番も検証するため、deep.equalで検証する。
                        expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                            'chunk 1...',
                            '[exec-tags-1::cmd1] Executing ...',
                            '[exec-tags-1::cmd1] Completed with code 0',
                            '[exec-tags-2::cmd1] Executing ...',
                            '[exec-tags-2::cmd1] Completed with code 0',
                            '[exec-tags-2::cmd2] Executing ...',
                            '[exec-tags-2::cmd2] Completed with code 0',
                            'chunk 2...',
                            '[exec-tags-1::cmdA] Executing ...',
                            '[exec-tags-1::cmdA] Completed with code 0',
                            '[exec-tags-2::cmdA] Executing ...',
                            '[exec-tags-2::cmdA] Completed with code 0',
                            'chunk 3...',
                            '[exec-tags-2::cmdB] Executing ...',
                            '[exec-tags-2::cmdB] Completed with code 0',
                            'chunk 4...',
                            '[exec-tags-2::cmdC] Executing ...',
                            '[exec-tags-2::cmdC] Completed with code 0',
                            'chunk 5...',
                            '[exec-tags-2::cmdD] Executing ...',
                            '[exec-tags-2::cmdD] Completed with code 0',
                        ]);
                    });

                    it('DAO shared nodes', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdB', 'echo hello', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdC', 'echo hello', undefined, undefined, ['cmdA', 'cmdB']);
                        await runToAddSnipCommand(contexts, file2, 'cmdD', 'echo hello', undefined, undefined, ['cmdC']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);

                        // console logの出力の順番も検証するため、deep.equalで検証する。
                        expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                            'chunk 1...',
                            '[exec-tags-1::cmd1] Executing ...',
                            '[exec-tags-1::cmd1] Completed with code 0',
                            '[exec-tags-2::cmd1] Executing ...',
                            '[exec-tags-2::cmd1] Completed with code 0',
                            '[exec-tags-2::cmd2] Executing ...',
                            '[exec-tags-2::cmd2] Completed with code 0',
                            'chunk 2...',
                            '[exec-tags-1::cmdA] Executing ...',
                            '[exec-tags-1::cmdA] Completed with code 0',
                            '[exec-tags-2::cmdA] Executing ...',
                            '[exec-tags-2::cmdA] Completed with code 0',
                            '[exec-tags-2::cmdB] Executing ...',
                            '[exec-tags-2::cmdB] Completed with code 0',
                            'chunk 3...',
                            '[exec-tags-2::cmdC] Executing ...',
                            '[exec-tags-2::cmdC] Completed with code 0',
                            'chunk 4...',
                            '[exec-tags-2::cmdD] Executing ...',
                            '[exec-tags-2::cmdD] Completed with code 0',
                        ]);
                    });

                    it('multiple DependsOn', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdB', 'echo hello', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdC', 'echo hello', undefined, undefined, ['cmdA']);
                        await runToAddSnipCommand(contexts, file2, 'cmdD', 'echo hello', undefined, undefined, ['cmdB']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);

                        // console logの出力の順番も検証するため、deep.equalで検証する。
                        expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                            'chunk 1...',
                            '[exec-tags-1::cmd1] Executing ...',
                            '[exec-tags-1::cmd1] Completed with code 0',
                            '[exec-tags-2::cmd1] Executing ...',
                            '[exec-tags-2::cmd1] Completed with code 0',
                            '[exec-tags-2::cmd2] Executing ...',
                            '[exec-tags-2::cmd2] Completed with code 0',
                            'chunk 2...',
                            '[exec-tags-1::cmdA] Executing ...',
                            '[exec-tags-1::cmdA] Completed with code 0',
                            '[exec-tags-2::cmdA] Executing ...',
                            '[exec-tags-2::cmdA] Completed with code 0',
                            '[exec-tags-2::cmdB] Executing ...',
                            '[exec-tags-2::cmdB] Completed with code 0',
                            'chunk 3...',
                            '[exec-tags-2::cmdC] Executing ...',
                            '[exec-tags-2::cmdC] Completed with code 0',
                            '[exec-tags-2::cmdD] Executing ...',
                            '[exec-tags-2::cmdD] Completed with code 0',
                        ]);
                    });

                    it('multiple DependsOn case 2', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdB', 'echo hello', undefined, undefined, ['cmd2']);
                        await runToAddSnipCommand(contexts, file2, 'cmdC', 'echo hello', undefined, undefined, ['cmdA', 'cmdB']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);

                        // console logの出力の順番も検証するため、deep.equalで検証する。
                        expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                            'chunk 1...',
                            '[exec-tags-1::cmd1] Executing ...',
                            '[exec-tags-1::cmd1] Completed with code 0',
                            '[exec-tags-2::cmd1] Executing ...',
                            '[exec-tags-2::cmd1] Completed with code 0',
                            '[exec-tags-2::cmd2] Executing ...',
                            '[exec-tags-2::cmd2] Completed with code 0',
                            'chunk 2...',
                            '[exec-tags-1::cmdA] Executing ...',
                            '[exec-tags-1::cmdA] Completed with code 0',
                            '[exec-tags-2::cmdA] Executing ...',
                            '[exec-tags-2::cmdA] Completed with code 0',
                            '[exec-tags-2::cmdB] Executing ...',
                            '[exec-tags-2::cmdB] Completed with code 0',
                            'chunk 3...',
                            '[exec-tags-2::cmdC] Executing ...',
                            '[exec-tags-2::cmdC] Completed with code 0',
                        ]);
                    });

                    it('multiple shared nodes', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdB', 'echo hello', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdC', 'echo hello', undefined, undefined, ['cmdA', 'cmdB']);
                        await runToAddSnipCommand(contexts, file2, 'cmdE', 'echo hello', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdD', 'echo hello', undefined, undefined, ['cmdC', 'cmdE']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);

                        // console logの出力の順番も検証するため、deep.equalで検証する。
                        expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                            'chunk 1...',
                            '[exec-tags-1::cmd1] Executing ...',
                            '[exec-tags-1::cmd1] Completed with code 0',
                            '[exec-tags-2::cmd1] Executing ...',
                            '[exec-tags-2::cmd1] Completed with code 0',
                            '[exec-tags-2::cmd2] Executing ...',
                            '[exec-tags-2::cmd2] Completed with code 0',
                            'chunk 2...',
                            '[exec-tags-1::cmdA] Executing ...',
                            '[exec-tags-1::cmdA] Completed with code 0',
                            '[exec-tags-2::cmdA] Executing ...',
                            '[exec-tags-2::cmdA] Completed with code 0',
                            '[exec-tags-2::cmdB] Executing ...',
                            '[exec-tags-2::cmdB] Completed with code 0',
                            '[exec-tags-2::cmdE] Executing ...',
                            '[exec-tags-2::cmdE] Completed with code 0',
                            'chunk 3...',
                            '[exec-tags-2::cmdC] Executing ...',
                            '[exec-tags-2::cmdC] Completed with code 0',
                            'chunk 4...',
                            '[exec-tags-2::cmdD] Executing ...',
                            '[exec-tags-2::cmdD] Completed with code 0',
                        ]);
                    });

                    it('multiple shared nodes case 2', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello', undefined, undefined, []);
                        await runToAddSnipCommand(contexts, file2, 'cmdB', 'echo hello', undefined, undefined, ['cmd1', 'cmd2']);
                        await runToAddSnipCommand(contexts, file2, 'cmdC', 'echo hello', undefined, undefined, ['cmd2', 'cmdA']);
                        await runToAddSnipCommand(contexts, file2, 'cmdD', 'echo hello', undefined, undefined, ['cmdB', 'cmdC']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);

                        // console logの出力の順番も検証するため、deep.equalで検証する。
                        expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                            'chunk 1...',
                            '[exec-tags-1::cmd1] Executing ...',
                            '[exec-tags-1::cmd1] Completed with code 0',
                            '[exec-tags-2::cmd1] Executing ...',
                            '[exec-tags-2::cmd1] Completed with code 0',
                            '[exec-tags-2::cmd2] Executing ...',
                            '[exec-tags-2::cmd2] Completed with code 0',
                            '[exec-tags-2::cmdA] Executing ...',
                            '[exec-tags-2::cmdA] Completed with code 0',
                            'chunk 2...',
                            '[exec-tags-1::cmdA] Executing ...',
                            '[exec-tags-1::cmdA] Completed with code 0',
                            '[exec-tags-2::cmdB] Executing ...',
                            '[exec-tags-2::cmdB] Completed with code 0',
                            '[exec-tags-2::cmdC] Executing ...',
                            '[exec-tags-2::cmdC] Completed with code 0',
                            'chunk 3...',
                            '[exec-tags-2::cmdD] Executing ...',
                            '[exec-tags-2::cmdD] Completed with code 0',
                        ]);
                    });

                    it('execute successfully when filter by tag', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello', undefined, ['tag1'], ['cmd1']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, ['tag1'], true);

                        // console logの出力の順番も検証するため、deep.equalで検証する。
                        expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                            'chunk 1...',
                            '[exec-tags-1::cmd1] Executing ...',
                            '[exec-tags-1::cmd1] Completed with code 0',
                            '[exec-tags-2::cmd1] Executing ...',
                            '[exec-tags-2::cmd1] Completed with code 0',
                            'chunk 2...',
                            '[exec-tags-2::cmdA] Executing ...',
                            '[exec-tags-2::cmdA] Completed with code 0',
                        ]);
                    });

                    it('execute successfully when filter by tag case 2', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello', undefined, ['tag1'], ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdB', 'echo hello', undefined, ['tag1'], ['cmd1']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, ['tag1'], true);

                        // console logの出力の順番も検証するため、deep.equalで検証する。
                        expect(consoleStub.args.map((a) => a[0])).to.deep.equal([
                            'chunk 1...',
                            '[exec-tags-1::cmd1] Executing ...',
                            '[exec-tags-1::cmd1] Completed with code 0',
                            '[exec-tags-2::cmd1] Executing ...',
                            '[exec-tags-2::cmd1] Completed with code 0',
                            'chunk 2...',
                            '[exec-tags-2::cmdA] Executing ...',
                            '[exec-tags-2::cmdA] Completed with code 0',
                            '[exec-tags-2::cmdB] Executing ...',
                            '[exec-tags-2::cmdB] Completed with code 0',
                        ]);
                    });
                });
            });

            describe('no executable file exist', () => {
                it('should do nothing when no snip files exist', async () => {
                    await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);
                    sinon.assert.notCalled(consoleStub);
                    sinon.assert.notCalled(consoleErrorStub);
                });

                it('should do nothing when no snip files exist but other file exists', async () => {
                    await writeFile('invalid.txt', contexts.workingDir, 'content');
                    await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);
                    sinon.assert.notCalled(consoleStub);
                    sinon.assert.notCalled(consoleErrorStub);
                });
            });

            describe('no executable command exist', () => {
                it('should do nothing when the named file has no command', async () => {
                    await runToCreateSnipFile(contexts, 'no-command.snip');

                    await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);
                    sinon.assert.notCalled(consoleStub);
                    sinon.assert.notCalled(consoleErrorStub);
                });
            });
        });

        describe('file is provided and dryRun = false', () => {
            const fileName = 'exec-dry.snip';
            const script1 = path.join(contexts.workingDir, 'tmp_exec1.js');
            const script2 = path.join(contexts.workingDir, 'tmp_exec2.js');

            beforeEach(async () => {
                await runToCreateSnipFile(contexts, fileName);
                await fs.promises.writeFile(script1, "console.log('out1'); process.exit(0);");
                await runToAddSnipCommand(contexts, fileName, 'cmd1', `node ${script1}`, 'A', ['tag2']);;

                await runToCreateSnipFile(contexts, 'no-command.snip');
            });

            describe('scenario except dependsOn', () => {
                beforeEach(async () => {
                    await fs.promises.writeFile(script2, "console.error('out2'); process.exit(1);");
                    await runToAddSnipCommand(contexts, fileName, 'cmd2', `node ${script2}`, 'B', ['tag1', 'tag2']);
                });
                
                it('should execute all commands in the specified file', async () => {
                    const nonTargetFile = 'non-taget.snip'
                    await runToCreateSnipFile(contexts, nonTargetFile);
                    await runToAddSnipCommand(contexts, nonTargetFile, 'cmd3', 'echo hello');

                    await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, false);
                    await new Promise(r => setTimeout(r, 500));

                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd1] Executing ...`);
                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd1] Completed with code 0`);
                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd1] node ${script1}`);
                    sinon.assert.calledWith(consoleStub, `out1\n`);
                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] Executing ...`);
                    sinon.assert.calledWith(consoleErrorStub, `[exec-dry::cmd2] Completed with code 1`);
                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] node ${script2}`);
                    sinon.assert.calledWith(consoleErrorStub, `out2\n`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd3] Executing ...`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd3] Completed with code 0`);
                });

                it('should execute only the named command in the specified file', async () => {
                    await runToExecuteCommands(contextsToRun, fileName, 'cmd2', undefined, false);
                    await new Promise(r => setTimeout(r, 500));

                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] Executing ...`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] Completed with code 0`);
                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] Executing ...`);
                    sinon.assert.calledWith(consoleErrorStub, `[exec-dry::cmd2] Completed with code 1`);
                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] node ${script2}`);
                    sinon.assert.calledWith(consoleErrorStub, `out2\n`);
                });

                it('should do nothing when the named command does not exist in the specified file', async () => {
                    await runToExecuteCommands(contextsToRun, fileName, 'cmd99', undefined, false);
                    await new Promise(r => setTimeout(r, 500));

                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] Executing ...`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] Completed with code 0`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd2] Executing ...`);
                    sinon.assert.neverCalledWith(consoleErrorStub, `[exec-dry::cmd2] Completed with code 1`);
                });

                it('should execute only commands matching tags in the specified file', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmd3', 'echo world', 'C');
                    await runToAddSnipCommand(contexts, fileName, 'cmd4', 'echo world', 'D', ['tag1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmd5', 'echo world', 'E', ['tag1', 'tag3']);

                    await runToExecuteCommands(contextsToRun, fileName, undefined, ['tag2'], false);
                    await new Promise(r => setTimeout(r, 500));

                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd1] Executing ...`);
                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd1] Completed with code 0`);
                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd1] node ${script1}`);
                    sinon.assert.calledWith(consoleStub, `out1\n`);
                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] Executing ...`);
                    sinon.assert.calledWith(consoleErrorStub, `[exec-dry::cmd2] Completed with code 1`);
                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] node ${script2}`);
                    sinon.assert.calledWith(consoleErrorStub, `out2\n`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd3] Executing ...`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd3] Completed with code 0`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd4] Executing ...`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd4] Completed with code 0`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd5] Executing ...`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd5] Completed with code 0`);
                });

                it('should execute only commands matching tags in the specified file', async () => {
                    await runToExecuteCommands(contextsToRun, fileName, undefined, [], false);
                    await new Promise(r => setTimeout(r, 500));

                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd1] Executing ...`);
                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd1] Completed with code 0`);
                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd1] node ${script1}`);
                    sinon.assert.calledWith(consoleStub, `out1\n`);
                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] Executing ...`);
                    sinon.assert.calledWith(consoleErrorStub, `[exec-dry::cmd2] Completed with code 1`);
                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] node ${script2}`);
                    sinon.assert.calledWith(consoleErrorStub, `out2\n`);
                });

                it('should execute only the command matching both name and tags in the specified file', async () => {
                    await runToExecuteCommands(contextsToRun, fileName, 'cmd2', ['tag2'], false);
                    await new Promise(r => setTimeout(r, 500));

                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] Executing ...`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] Completed with code 0`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] node ${script1}`);
                    sinon.assert.neverCalledWith(consoleStub, `out1\n`);
                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] Executing ...`);
                    sinon.assert.calledWith(consoleErrorStub, `[exec-dry::cmd2] Completed with code 1`);
                    sinon.assert.calledWith(consoleStub, `[exec-dry::cmd2] node ${script2}`);
                    sinon.assert.calledWith(consoleErrorStub, `out2\n`);
                });

                it('should do nothing no command matching both name and tags in the specified file', async () => {
                    await runToExecuteCommands(contextsToRun, fileName, 'cmd99', ['tag2'], false);
                    await new Promise(r => setTimeout(r, 500));

                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] Executing ...`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] Completed with code 0`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] node ${script1}`);
                    sinon.assert.neverCalledWith(consoleStub, `out1\n`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd2] Executing ...`);
                    sinon.assert.neverCalledWith(consoleErrorStub, `[exec-dry::cmd2] Completed with code 1`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd2] node ${script2}`);
                    sinon.assert.neverCalledWith(consoleErrorStub, `out2\n`);
                });

                it('should do nothing when the named file has no command', async () => {
                    await runToExecuteCommands(contextsToRun, 'no-command.snip', undefined, undefined, false);

                    sinon.assert.notCalled(consoleStub);
                    sinon.assert.notCalled(consoleErrorStub);
                });

                it('should do nothing when the specified file does not exist', async () => {
                    const fileName = 'exec-missing-false.snip';
                    await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, false);

                    sinon.assert.notCalled(consoleStub);
                    sinon.assert.notCalled(consoleErrorStub);
                });
            });

            describe('dependsOn scenario', () => {
                beforeEach(async () => {
                    contextsToRun.logger = new Logger('verbose');
                    await fs.promises.writeFile(script2, "console.log('out2'); process.exit(0);");
                    await runToAddSnipCommand(contexts, fileName, 'cmd2', `node ${script2}`, 'B', ['tag1', 'tag2']);
                });

                it('simple dependency', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello A', undefined, undefined, ['cmd1']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, false);

                    const chunk1 = logIndexOf('chunk 1...');
                    const cmd1Exec = logIndexOf('[exec-dry::cmd1] Executing ...');
                    const cmd2Exec = logIndexOf('[exec-dry::cmd2] Executing ...');
                    const cmd1Done = logIndexOf('[exec-dry::cmd1] Completed with code 0');
                    const cmd1Cmd = logIndexOf(`[exec-dry::cmd1] node ${script1}`);
                    const cmd1Out = logIndexOf('out1\n');
                    const cmd2Done = logIndexOf('[exec-dry::cmd2] Completed with code 0');
                    const cmd2Cmd = logIndexOf(`[exec-dry::cmd2] node ${script2}`);
                    const cmd2Out = logIndexOf('out2\n');
                    const chunk2 = logIndexOf('chunk 2...');
                    const cmdAExec = logIndexOf('[exec-dry::cmdA] Executing ...');
                    const cmdADone = logIndexOf('[exec-dry::cmdA] Completed with code 0');
                    const cmdACmd = logIndexOf(`[exec-dry::cmdA] echo hello A`);
                    const cmdAOut = logIndexOf('hello A\r\n');

                    expect(chunk1).to.be.lessThan(cmd1Exec);
                    expect(chunk1).to.be.lessThan(cmd2Exec);
                    expect(cmd1Exec).to.be.lessThan(cmd1Done);
                    expect(cmd1Done).to.be.lessThan(cmd1Cmd);
                    expect(cmd1Cmd).to.be.lessThan(cmd1Out);
                    expect(cmd2Exec).to.be.lessThan(cmd2Done);
                    expect(cmd2Done).to.be.lessThan(cmd2Cmd);
                    expect(cmd2Cmd).to.be.lessThan(cmd2Out);
                    expect(cmd1Out).to.be.lessThan(chunk2);
                    expect(cmd2Out).to.be.lessThan(chunk2);
                    expect(chunk2).to.be.lessThan(cmdAExec);
                    expect(cmdAExec).to.be.lessThan(cmdADone);
                    expect(cmdADone).to.be.lessThan(cmdACmd);
                    expect(cmdACmd).to.be.lessThan(cmdAOut);
                });

                it('simple dependency case 2', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello A', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdB', 'echo hello B', undefined, undefined, ['cmd1']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, false);

                    const chunk1 = logIndexOf('chunk 1...');
                    const cmd1Exec = logIndexOf('[exec-dry::cmd1] Executing ...');
                    const cmd2Exec = logIndexOf('[exec-dry::cmd2] Executing ...');
                    const cmd1Done = logIndexOf('[exec-dry::cmd1] Completed with code 0');
                    const cmd1Cmd = logIndexOf(`[exec-dry::cmd1] node ${script1}`);
                    const cmd1Out = logIndexOf('out1\n');
                    const cmd2Done = logIndexOf('[exec-dry::cmd2] Completed with code 0');
                    const cmd2Cmd = logIndexOf(`[exec-dry::cmd2] node ${script2}`);
                    const cmd2Out = logIndexOf('out2\n');
                    const chunk2 = logIndexOf('chunk 2...');
                    const cmdAExec = logIndexOf('[exec-dry::cmdA] Executing ...');
                    const cmdBExec = logIndexOf('[exec-dry::cmdB] Executing ...');
                    const cmdADone = logIndexOf('[exec-dry::cmdA] Completed with code 0');
                    const cmdACmd = logIndexOf('[exec-dry::cmdA] echo hello A');
                    const cmdAOut = logIndexOf('hello A\r\n');
                    const cmdBDone = logIndexOf('[exec-dry::cmdB] Completed with code 0');
                    const cmdBCmd = logIndexOf('[exec-dry::cmdB] echo hello B');
                    const cmdBOut = logIndexOf('hello B\r\n');

                    expect(chunk1).to.be.lessThan(cmd1Exec);
                    expect(chunk1).to.be.lessThan(cmd2Exec);
                    expect(cmd1Exec).to.be.lessThan(cmd1Done);
                    expect(cmd1Done).to.be.lessThan(cmd1Cmd);
                    expect(cmd1Cmd).to.be.lessThan(cmd1Out);
                    expect(cmd2Exec).to.be.lessThan(cmd2Done);
                    expect(cmd2Done).to.be.lessThan(cmd2Cmd);
                    expect(cmd2Cmd).to.be.lessThan(cmd2Out);
                    expect(cmd1Out).to.be.lessThan(chunk2);
                    expect(cmd2Out).to.be.lessThan(chunk2);
                    expect(chunk2).to.be.lessThan(cmdAExec);
                    expect(chunk2).to.be.lessThan(cmdBExec);
                    expect(cmdAExec).to.be.lessThan(cmdADone);
                    expect(cmdADone).to.be.lessThan(cmdACmd);
                    expect(cmdACmd).to.be.lessThan(cmdAOut);
                    expect(cmdBExec).to.be.lessThan(cmdBDone);
                    expect(cmdBDone).to.be.lessThan(cmdBCmd);
                    expect(cmdBCmd).to.be.lessThan(cmdBOut);
                });

                it('long dependency', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello A', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdB', 'echo hello B', undefined, undefined, ['cmdA']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdC', 'echo hello C', undefined, undefined, ['cmdB']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdD', 'echo hello D', undefined, undefined, ['cmdC']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, false);

                    const chunk1 = logIndexOf('chunk 1...');
                    const cmd1Exec = logIndexOf('[exec-dry::cmd1] Executing ...');
                    const cmd2Exec = logIndexOf('[exec-dry::cmd2] Executing ...');
                    const cmd1Done = logIndexOf('[exec-dry::cmd1] Completed with code 0');
                    const cmd1Cmd = logIndexOf(`[exec-dry::cmd1] node ${script1}`);
                    const cmd1Out = logIndexOf('out1\n');
                    const cmd2Done = logIndexOf('[exec-dry::cmd2] Completed with code 0');
                    const cmd2Cmd = logIndexOf(`[exec-dry::cmd2] node ${script2}`);
                    const cmd2Out = logIndexOf('out2\n');
                    const chunk2 = logIndexOf('chunk 2...');
                    const cmdAExec = logIndexOf('[exec-dry::cmdA] Executing ...');
                    const cmdADone = logIndexOf('[exec-dry::cmdA] Completed with code 0');
                    const cmdACmd = logIndexOf('[exec-dry::cmdA] echo hello A');
                    const cmdAOut = logIndexOf('hello A\r\n');
                    const chunk3 = logIndexOf('chunk 3...');
                    const cmdBExec = logIndexOf('[exec-dry::cmdB] Executing ...');
                    const cmdBDone = logIndexOf('[exec-dry::cmdB] Completed with code 0');
                    const cmdBCmd = logIndexOf('[exec-dry::cmdB] echo hello B');
                    const cmdBOut = logIndexOf('hello B\r\n');
                    const chunk4 = logIndexOf('chunk 4...');
                    const cmdCExec = logIndexOf('[exec-dry::cmdC] Executing ...');
                    const cmdCDone = logIndexOf('[exec-dry::cmdC] Completed with code 0');
                    const cmdCCmd = logIndexOf('[exec-dry::cmdC] echo hello C');
                    const cmdCOut = logIndexOf('hello C\r\n');
                    const chunk5 = logIndexOf('chunk 5...');
                    const cmdDExec = logIndexOf('[exec-dry::cmdD] Executing ...');
                    const cmdDDone = logIndexOf('[exec-dry::cmdD] Completed with code 0');
                    const cmdDCmd = logIndexOf('[exec-dry::cmdD] echo hello D');
                    const cmdDOut = logIndexOf('hello D\r\n');

                    expect(chunk1).to.be.lessThan(cmd1Exec);
                    expect(chunk1).to.be.lessThan(cmd2Exec);
                    expect(cmd1Exec).to.be.lessThan(cmd1Done);
                    expect(cmd1Done).to.be.lessThan(cmd1Cmd);
                    expect(cmd1Cmd).to.be.lessThan(cmd1Out);
                    expect(cmd2Exec).to.be.lessThan(cmd2Done);
                    expect(cmd2Done).to.be.lessThan(cmd2Cmd);
                    expect(cmd2Cmd).to.be.lessThan(cmd2Out);
                    expect(cmd1Out).to.be.lessThan(chunk2);
                    expect(cmd2Out).to.be.lessThan(chunk2);
                    expect(chunk2).to.be.lessThan(cmdAExec);
                    expect(cmdAExec).to.be.lessThan(cmdADone);
                    expect(cmdADone).to.be.lessThan(cmdACmd);
                    expect(cmdACmd).to.be.lessThan(cmdAOut);
                    expect(cmdAOut).to.be.lessThan(chunk3);
                    expect(chunk3).to.be.lessThan(cmdBExec);
                    expect(cmdBExec).to.be.lessThan(cmdBDone);
                    expect(cmdBDone).to.be.lessThan(cmdBCmd);
                    expect(cmdBCmd).to.be.lessThan(cmdBOut);
                    expect(cmdBOut).to.be.lessThan(chunk4);
                    expect(chunk4).to.be.lessThan(cmdCExec);
                    expect(cmdCExec).to.be.lessThan(cmdCDone);
                    expect(cmdCDone).to.be.lessThan(cmdCCmd);
                    expect(cmdCCmd).to.be.lessThan(cmdCOut);
                    expect(cmdCOut).to.be.lessThan(chunk5);
                    expect(chunk5).to.be.lessThan(cmdDExec);
                    expect(cmdDExec).to.be.lessThan(cmdDDone);
                    expect(cmdDDone).to.be.lessThan(cmdDCmd);
                    expect(cmdDCmd).to.be.lessThan(cmdDOut);
                });

                it('DAO shared nodes', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello A', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdB', 'echo hello B', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdC', 'echo hello C', undefined, undefined, ['cmdA', 'cmdB']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdD', 'echo hello D', undefined, undefined, ['cmdC']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, false);

                    const chunk1 = logIndexOf('chunk 1...');
                    const cmd1Exec = logIndexOf('[exec-dry::cmd1] Executing ...');
                    const cmd2Exec = logIndexOf('[exec-dry::cmd2] Executing ...');
                    const cmd1Done = logIndexOf('[exec-dry::cmd1] Completed with code 0');
                    const cmd1Cmd = logIndexOf(`[exec-dry::cmd1] node ${script1}`);
                    const cmd1Out = logIndexOf('out1\n');
                    const cmd2Done = logIndexOf('[exec-dry::cmd2] Completed with code 0');
                    const cmd2Cmd = logIndexOf(`[exec-dry::cmd2] node ${script2}`);
                    const cmd2Out = logIndexOf('out2\n');
                    const chunk2 = logIndexOf('chunk 2...');
                    const cmdAExec = logIndexOf('[exec-dry::cmdA] Executing ...');
                    const cmdBExec = logIndexOf('[exec-dry::cmdB] Executing ...');
                    const cmdADone = logIndexOf('[exec-dry::cmdA] Completed with code 0');
                    const cmdACmd = logIndexOf('[exec-dry::cmdA] echo hello A');
                    const cmdAOut = logIndexOf('hello A\r\n');
                    const cmdBDone = logIndexOf('[exec-dry::cmdB] Completed with code 0');
                    const cmdBCmd = logIndexOf('[exec-dry::cmdB] echo hello B');
                    const cmdBOut = logIndexOf('hello B\r\n');
                    const chunk3 = logIndexOf('chunk 3...');
                    const cmdCExec = logIndexOf('[exec-dry::cmdC] Executing ...');
                    const cmdCDone = logIndexOf('[exec-dry::cmdC] Completed with code 0');
                    const cmdCCmd = logIndexOf('[exec-dry::cmdC] echo hello C');
                    const cmdCOut = logIndexOf('hello C\r\n');
                    const chunk4 = logIndexOf('chunk 4...');
                    const cmdDExec = logIndexOf('[exec-dry::cmdD] Executing ...');
                    const cmdDDone = logIndexOf('[exec-dry::cmdD] Completed with code 0');
                    const cmdDCmd = logIndexOf('[exec-dry::cmdD] echo hello D');
                    const cmdDOut = logIndexOf('hello D\r\n');

                    expect(chunk1).to.be.lessThan(cmd1Exec);
                    expect(chunk1).to.be.lessThan(cmd2Exec);
                    expect(cmd1Exec).to.be.lessThan(cmd1Done);
                    expect(cmd1Done).to.be.lessThan(cmd1Cmd);
                    expect(cmd1Cmd).to.be.lessThan(cmd1Out);
                    expect(cmd2Exec).to.be.lessThan(cmd2Done);
                    expect(cmd2Done).to.be.lessThan(cmd2Cmd);
                    expect(cmd2Cmd).to.be.lessThan(cmd2Out);
                    expect(cmd1Out).to.be.lessThan(chunk2);
                    expect(cmd2Out).to.be.lessThan(chunk2);
                    expect(chunk2).to.be.lessThan(cmdAExec);
                    expect(chunk2).to.be.lessThan(cmdBExec);
                    expect(cmdAExec).to.be.lessThan(cmdADone);
                    expect(cmdADone).to.be.lessThan(cmdACmd);
                    expect(cmdACmd).to.be.lessThan(cmdAOut);
                    expect(cmdBExec).to.be.lessThan(cmdBDone);
                    expect(cmdBDone).to.be.lessThan(cmdBCmd);
                    expect(cmdBCmd).to.be.lessThan(cmdBOut);
                    expect(cmdAOut).to.be.lessThan(chunk3);
                    expect(cmdBOut).to.be.lessThan(chunk3);
                    expect(chunk3).to.be.lessThan(cmdCExec);
                    expect(cmdCExec).to.be.lessThan(cmdCDone);
                    expect(cmdCDone).to.be.lessThan(cmdCCmd);
                    expect(cmdCCmd).to.be.lessThan(cmdCOut);
                    expect(cmdCOut).to.be.lessThan(chunk4);
                    expect(chunk4).to.be.lessThan(cmdDExec);
                    expect(cmdDExec).to.be.lessThan(cmdDDone);
                    expect(cmdDDone).to.be.lessThan(cmdDCmd);
                    expect(cmdDCmd).to.be.lessThan(cmdDOut);
                });

                it('multiple DependsOn', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello A', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdB', 'echo hello B', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdC', 'echo hello C', undefined, undefined, ['cmdA']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdD', 'echo hello D', undefined, undefined, ['cmdB']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, false);

                    const chunk1 = logIndexOf('chunk 1...');
                    const cmd1Exec = logIndexOf('[exec-dry::cmd1] Executing ...');
                    const cmd2Exec = logIndexOf('[exec-dry::cmd2] Executing ...');
                    const cmd1Done = logIndexOf('[exec-dry::cmd1] Completed with code 0');
                    const cmd1Cmd = logIndexOf(`[exec-dry::cmd1] node ${script1}`);
                    const cmd1Out = logIndexOf('out1\n');
                    const cmd2Done = logIndexOf('[exec-dry::cmd2] Completed with code 0');
                    const cmd2Cmd = logIndexOf(`[exec-dry::cmd2] node ${script2}`);
                    const cmd2Out = logIndexOf('out2\n');
                    const chunk2 = logIndexOf('chunk 2...');
                    const cmdAExec = logIndexOf('[exec-dry::cmdA] Executing ...');
                    const cmdBExec = logIndexOf('[exec-dry::cmdB] Executing ...');
                    const cmdADone = logIndexOf('[exec-dry::cmdA] Completed with code 0');
                    const cmdACmd = logIndexOf('[exec-dry::cmdA] echo hello A');
                    const cmdAOut = logIndexOf('hello A\r\n');
                    const cmdBDone = logIndexOf('[exec-dry::cmdB] Completed with code 0');
                    const cmdBCmd = logIndexOf('[exec-dry::cmdB] echo hello B');
                    const cmdBOut = logIndexOf('hello B\r\n');
                    const chunk3 = logIndexOf('chunk 3...');
                    const cmdCExec = logIndexOf('[exec-dry::cmdC] Executing ...');
                    const cmdDExec = logIndexOf('[exec-dry::cmdD] Executing ...');
                    const cmdCDone = logIndexOf('[exec-dry::cmdC] Completed with code 0');
                    const cmdCCmd = logIndexOf('[exec-dry::cmdC] echo hello C');
                    const cmdCOut = logIndexOf('hello C\r\n');
                    const cmdDDone = logIndexOf('[exec-dry::cmdD] Completed with code 0');
                    const cmdDCmd = logIndexOf('[exec-dry::cmdD] echo hello D');
                    const cmdDOut = logIndexOf('hello D\r\n');

                    expect(chunk1).to.be.lessThan(cmd1Exec);
                    expect(chunk1).to.be.lessThan(cmd2Exec);
                    expect(cmd1Exec).to.be.lessThan(cmd1Done);
                    expect(cmd1Done).to.be.lessThan(cmd1Cmd);
                    expect(cmd1Cmd).to.be.lessThan(cmd1Out);
                    expect(cmd2Exec).to.be.lessThan(cmd2Done);
                    expect(cmd2Done).to.be.lessThan(cmd2Cmd);
                    expect(cmd2Cmd).to.be.lessThan(cmd2Out);
                    expect(cmd1Out).to.be.lessThan(chunk2);
                    expect(cmd2Out).to.be.lessThan(chunk2);
                    expect(chunk2).to.be.lessThan(cmdAExec);
                    expect(chunk2).to.be.lessThan(cmdBExec);
                    expect(cmdAExec).to.be.lessThan(cmdADone);
                    expect(cmdADone).to.be.lessThan(cmdACmd);
                    expect(cmdACmd).to.be.lessThan(cmdAOut);
                    expect(cmdBExec).to.be.lessThan(cmdBDone);
                    expect(cmdBDone).to.be.lessThan(cmdBCmd);
                    expect(cmdBCmd).to.be.lessThan(cmdBOut);
                    expect(cmdAOut).to.be.lessThan(chunk3);
                    expect(cmdBOut).to.be.lessThan(chunk3);
                    expect(chunk3).to.be.lessThan(cmdCExec);
                    expect(chunk3).to.be.lessThan(cmdDExec);
                    expect(cmdCExec).to.be.lessThan(cmdCDone);
                    expect(cmdCDone).to.be.lessThan(cmdCCmd);
                    expect(cmdCCmd).to.be.lessThan(cmdCOut);
                    expect(cmdDExec).to.be.lessThan(cmdDDone);
                    expect(cmdDDone).to.be.lessThan(cmdDCmd);
                    expect(cmdDCmd).to.be.lessThan(cmdDOut);
                });

                it('multiple DependsOn case 2', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello A', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdB', 'echo hello B', undefined, undefined, ['cmd2']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdC', 'echo hello C', undefined, undefined, ['cmdA', 'cmdB']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, false);

                    const chunk1 = logIndexOf('chunk 1...');
                    const cmd1Exec = logIndexOf('[exec-dry::cmd1] Executing ...');
                    const cmd2Exec = logIndexOf('[exec-dry::cmd2] Executing ...');
                    const cmd1Done = logIndexOf('[exec-dry::cmd1] Completed with code 0');
                    const cmd1Cmd = logIndexOf(`[exec-dry::cmd1] node ${script1}`);
                    const cmd1Out = logIndexOf('out1\n');
                    const cmd2Done = logIndexOf('[exec-dry::cmd2] Completed with code 0');
                    const cmd2Cmd = logIndexOf(`[exec-dry::cmd2] node ${script2}`);
                    const cmd2Out = logIndexOf('out2\n');
                    const chunk2 = logIndexOf('chunk 2...');
                    const cmdAExec = logIndexOf('[exec-dry::cmdA] Executing ...');
                    const cmdBExec = logIndexOf('[exec-dry::cmdB] Executing ...');
                    const cmdADone = logIndexOf('[exec-dry::cmdA] Completed with code 0');
                    const cmdACmd = logIndexOf('[exec-dry::cmdA] echo hello A');
                    const cmdAOut = logIndexOf('hello A\r\n');
                    const cmdBDone = logIndexOf('[exec-dry::cmdB] Completed with code 0');
                    const cmdBCmd = logIndexOf('[exec-dry::cmdB] echo hello B');
                    const cmdBOut = logIndexOf('hello B\r\n');
                    const chunk3 = logIndexOf('chunk 3...');
                    const cmdCExec = logIndexOf('[exec-dry::cmdC] Executing ...');
                    const cmdCDone = logIndexOf('[exec-dry::cmdC] Completed with code 0');
                    const cmdCCmd = logIndexOf('[exec-dry::cmdC] echo hello C');
                    const cmdCOut = logIndexOf('hello C\r\n');

                    expect(chunk1).to.be.lessThan(cmd1Exec);
                    expect(chunk1).to.be.lessThan(cmd2Exec);
                    expect(cmd1Exec).to.be.lessThan(cmd1Done);
                    expect(cmd1Done).to.be.lessThan(cmd1Cmd);
                    expect(cmd1Cmd).to.be.lessThan(cmd1Out);
                    expect(cmd2Exec).to.be.lessThan(cmd2Done);
                    expect(cmd2Done).to.be.lessThan(cmd2Cmd);
                    expect(cmd2Cmd).to.be.lessThan(cmd2Out);
                    expect(cmd1Out).to.be.lessThan(chunk2);
                    expect(cmd2Out).to.be.lessThan(chunk2);
                    expect(chunk2).to.be.lessThan(cmdAExec);
                    expect(chunk2).to.be.lessThan(cmdBExec);
                    expect(cmdAExec).to.be.lessThan(cmdADone);
                    expect(cmdADone).to.be.lessThan(cmdACmd);
                    expect(cmdACmd).to.be.lessThan(cmdAOut);
                    expect(cmdBExec).to.be.lessThan(cmdBDone);
                    expect(cmdBDone).to.be.lessThan(cmdBCmd);
                    expect(cmdBCmd).to.be.lessThan(cmdBOut);
                    expect(cmdAOut).to.be.lessThan(chunk3);
                    expect(cmdBOut).to.be.lessThan(chunk3);
                    expect(chunk3).to.be.lessThan(cmdCExec);
                    expect(cmdCExec).to.be.lessThan(cmdCDone);
                    expect(cmdCDone).to.be.lessThan(cmdCCmd);
                    expect(cmdCCmd).to.be.lessThan(cmdCOut);
                });

                it('multiple shared nodes', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello A', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdB', 'echo hello B', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdC', 'echo hello C', undefined, undefined, ['cmdA', 'cmdB']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdE', 'echo hello E', undefined, undefined, ['cmd1']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdD', 'echo hello D', undefined, undefined, ['cmdC', 'cmdE']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, false);

                    const chunk1 = logIndexOf('chunk 1...');
                    const cmd1Exec = logIndexOf('[exec-dry::cmd1] Executing ...');
                    const cmd2Exec = logIndexOf('[exec-dry::cmd2] Executing ...');
                    const cmd1Done = logIndexOf('[exec-dry::cmd1] Completed with code 0');
                    const cmd1Cmd = logIndexOf(`[exec-dry::cmd1] node ${script1}`);
                    const cmd1Out = logIndexOf('out1\n');
                    const cmd2Done = logIndexOf('[exec-dry::cmd2] Completed with code 0');
                    const cmd2Cmd = logIndexOf(`[exec-dry::cmd2] node ${script2}`);
                    const cmd2Out = logIndexOf('out2\n');
                    const chunk2 = logIndexOf('chunk 2...');
                    const cmdAExec = logIndexOf('[exec-dry::cmdA] Executing ...');
                    const cmdBExec = logIndexOf('[exec-dry::cmdB] Executing ...');
                    const cmdEExec = logIndexOf('[exec-dry::cmdE] Executing ...');
                    const cmdADone = logIndexOf('[exec-dry::cmdA] Completed with code 0');
                    const cmdACmd = logIndexOf('[exec-dry::cmdA] echo hello A');
                    const cmdAOut = logIndexOf('hello A\r\n');
                    const cmdBDone = logIndexOf('[exec-dry::cmdB] Completed with code 0');
                    const cmdBCmd = logIndexOf('[exec-dry::cmdB] echo hello B');
                    const cmdBOut = logIndexOf('hello B\r\n');
                    const cmdEDone = logIndexOf('[exec-dry::cmdE] Completed with code 0');
                    const cmdECmd = logIndexOf('[exec-dry::cmdE] echo hello E');
                    const cmdEOut = logIndexOf('hello E\r\n');
                    const chunk3 = logIndexOf('chunk 3...');
                    const cmdCExec = logIndexOf('[exec-dry::cmdC] Executing ...');
                    const cmdCDone = logIndexOf('[exec-dry::cmdC] Completed with code 0');
                    const cmdCCmd = logIndexOf('[exec-dry::cmdC] echo hello C');
                    const cmdCOut = logIndexOf('hello C\r\n');
                    const chunk4 = logIndexOf('chunk 4...');
                    const cmdDExec = logIndexOf('[exec-dry::cmdD] Executing ...');
                    const cmdDDone = logIndexOf('[exec-dry::cmdD] Completed with code 0');
                    const cmdDCmd = logIndexOf('[exec-dry::cmdD] echo hello D');
                    const cmdDOut = logIndexOf('hello D\r\n');

                    expect(chunk1).to.be.lessThan(cmd1Exec);
                    expect(chunk1).to.be.lessThan(cmd2Exec);
                    expect(cmd1Exec).to.be.lessThan(cmd1Done);
                    expect(cmd1Done).to.be.lessThan(cmd1Cmd);
                    expect(cmd1Cmd).to.be.lessThan(cmd1Out);
                    expect(cmd2Exec).to.be.lessThan(cmd2Done);
                    expect(cmd2Done).to.be.lessThan(cmd2Cmd);
                    expect(cmd2Cmd).to.be.lessThan(cmd2Out);
                    expect(cmd1Out).to.be.lessThan(chunk2);
                    expect(cmd2Out).to.be.lessThan(chunk2);
                    expect(chunk2).to.be.lessThan(cmdAExec);
                    expect(chunk2).to.be.lessThan(cmdBExec);
                    expect(chunk2).to.be.lessThan(cmdEExec);
                    expect(cmdAExec).to.be.lessThan(cmdADone);
                    expect(cmdADone).to.be.lessThan(cmdACmd);
                    expect(cmdACmd).to.be.lessThan(cmdAOut);
                    expect(cmdBExec).to.be.lessThan(cmdBDone);
                    expect(cmdBDone).to.be.lessThan(cmdBCmd);
                    expect(cmdBCmd).to.be.lessThan(cmdBOut);
                    expect(cmdEExec).to.be.lessThan(cmdEDone);
                    expect(cmdEDone).to.be.lessThan(cmdECmd);
                    expect(cmdECmd).to.be.lessThan(cmdEOut);
                    expect(cmdAOut).to.be.lessThan(chunk3);
                    expect(cmdBOut).to.be.lessThan(chunk3);
                    expect(cmdEOut).to.be.lessThan(chunk3);
                    expect(chunk3).to.be.lessThan(cmdCExec);
                    expect(cmdCExec).to.be.lessThan(cmdCDone);
                    expect(cmdCDone).to.be.lessThan(cmdCCmd);
                    expect(cmdCCmd).to.be.lessThan(cmdCOut);
                    expect(cmdCOut).to.be.lessThan(chunk4);
                    expect(chunk4).to.be.lessThan(cmdDExec);
                    expect(cmdDExec).to.be.lessThan(cmdDDone);
                    expect(cmdDDone).to.be.lessThan(cmdDCmd);
                    expect(cmdDCmd).to.be.lessThan(cmdDOut);
                });

                it('multiple shared nodes case 2', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello A', undefined, undefined, []);
                    await runToAddSnipCommand(contexts, fileName, 'cmdB', 'echo hello B', undefined, undefined, ['cmd1', 'cmd2']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdC', 'echo hello C', undefined, undefined, ['cmd2', 'cmdA']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdD', 'echo hello D', undefined, undefined, ['cmdB', 'cmdC']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, undefined, false);

                    const chunk1 = logIndexOf('chunk 1...');
                    const cmd1Exec = logIndexOf('[exec-dry::cmd1] Executing ...');
                    const cmd2Exec = logIndexOf('[exec-dry::cmd2] Executing ...');
                    const cmdAExec = logIndexOf('[exec-dry::cmdA] Executing ...');
                    const cmd1Done = logIndexOf('[exec-dry::cmd1] Completed with code 0');
                    const cmd1Cmd = logIndexOf(`[exec-dry::cmd1] node ${script1}`);
                    const cmd1Out = logIndexOf('out1\n');
                    const cmd2Done = logIndexOf('[exec-dry::cmd2] Completed with code 0');
                    const cmd2Cmd = logIndexOf(`[exec-dry::cmd2] node ${script2}`);
                    const cmd2Out = logIndexOf('out2\n');
                    const cmdADone = logIndexOf('[exec-dry::cmdA] Completed with code 0');
                    const cmdACmd = logIndexOf('[exec-dry::cmdA] echo hello A');
                    const cmdAOut = logIndexOf('hello A\r\n');
                    const chunk2 = logIndexOf('chunk 2...');
                    const cmdBExec = logIndexOf('[exec-dry::cmdB] Executing ...');
                    const cmdCExec = logIndexOf('[exec-dry::cmdC] Executing ...');
                    const cmdBDone = logIndexOf('[exec-dry::cmdB] Completed with code 0');
                    const cmdBCmd = logIndexOf('[exec-dry::cmdB] echo hello B');
                    const cmdBOut = logIndexOf('hello B\r\n');
                    const cmdCDone = logIndexOf('[exec-dry::cmdC] Completed with code 0');
                    const cmdCCmd = logIndexOf('[exec-dry::cmdC] echo hello C');
                    const cmdCOut = logIndexOf('hello C\r\n');
                    const chunk3 = logIndexOf('chunk 3...');
                    const cmdDExec = logIndexOf('[exec-dry::cmdD] Executing ...');
                    const cmdDDone = logIndexOf('[exec-dry::cmdD] Completed with code 0');
                    const cmdDCmd = logIndexOf('[exec-dry::cmdD] echo hello D');
                    const cmdDOut = logIndexOf('hello D\r\n');

                    expect(chunk1).to.be.lessThan(cmd1Exec);
                    expect(chunk1).to.be.lessThan(cmd2Exec);
                    expect(chunk1).to.be.lessThan(cmdAExec);
                    expect(cmd1Exec).to.be.lessThan(cmd1Done);
                    expect(cmd1Done).to.be.lessThan(cmd1Cmd);
                    expect(cmd1Cmd).to.be.lessThan(cmd1Out);
                    expect(cmd2Exec).to.be.lessThan(cmd2Done);
                    expect(cmd2Done).to.be.lessThan(cmd2Cmd);
                    expect(cmd2Cmd).to.be.lessThan(cmd2Out);
                    expect(cmdAExec).to.be.lessThan(cmdADone);
                    expect(cmdADone).to.be.lessThan(cmdACmd);
                    expect(cmdACmd).to.be.lessThan(cmdAOut);
                    expect(cmd1Out).to.be.lessThan(chunk2);
                    expect(cmd2Out).to.be.lessThan(chunk2);
                    expect(cmdAOut).to.be.lessThan(chunk2);
                    expect(chunk2).to.be.lessThan(cmdBExec);
                    expect(chunk2).to.be.lessThan(cmdCExec);
                    expect(cmdBExec).to.be.lessThan(cmdBDone);
                    expect(cmdBDone).to.be.lessThan(cmdBCmd);
                    expect(cmdBCmd).to.be.lessThan(cmdBOut);
                    expect(cmdCExec).to.be.lessThan(cmdCDone);
                    expect(cmdCDone).to.be.lessThan(cmdCCmd);
                    expect(cmdCCmd).to.be.lessThan(cmdCOut);
                    expect(cmdBOut).to.be.lessThan(chunk3);
                    expect(cmdCOut).to.be.lessThan(chunk3);
                    expect(chunk3).to.be.lessThan(cmdDExec);
                    expect(cmdDExec).to.be.lessThan(cmdDDone);
                    expect(cmdDDone).to.be.lessThan(cmdDCmd);
                    expect(cmdDCmd).to.be.lessThan(cmdDOut);
                });

                it('execute successfully when filter by tag', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello A', undefined, ['tag1'], ['cmd2']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, ['tag1'], false);

                    const chunk1 = logIndexOf('chunk 1...');
                    const cmd2Exec = logIndexOf('[exec-dry::cmd2] Executing ...');
                    const cmd2Done = logIndexOf('[exec-dry::cmd2] Completed with code 0');
                    const cmd2Cmd = logIndexOf(`[exec-dry::cmd2] node ${script2}`);
                    const cmd2Out = logIndexOf('out2\n');
                    const chunk2 = logIndexOf('chunk 2...');
                    const cmdAExec = logIndexOf('[exec-dry::cmdA] Executing ...');
                    const cmdADone = logIndexOf('[exec-dry::cmdA] Completed with code 0');
                    const cmdACmd = logIndexOf(`[exec-dry::cmdA] echo hello A`);
                    const cmdAOut = logIndexOf('hello A\r\n');

                    expect(chunk1).to.be.lessThan(cmd2Exec);
                    expect(cmd2Exec).to.be.lessThan(cmd2Done);
                    expect(cmd2Done).to.be.lessThan(cmd2Cmd);
                    expect(cmd2Cmd).to.be.lessThan(cmd2Out);
                    expect(cmd2Out).to.be.lessThan(chunk2);
                    expect(chunk2).to.be.lessThan(cmdAExec);
                    expect(cmdAExec).to.be.lessThan(cmdADone);
                    expect(cmdADone).to.be.lessThan(cmdACmd);
                    expect(cmdACmd).to.be.lessThan(cmdAOut);

                    sinon.assert.neverCalledWith(consoleStub, '[exec-dry::cmd1] Executing ...');
                    sinon.assert.neverCalledWith(consoleStub, '[exec-dry::cmd1] Completed with code 0');
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] node ${script1}`);
                    sinon.assert.neverCalledWith(consoleStub, 'out1\n');
                });

                it('execute successfully when filter by tag case 2', async () => {
                    await runToAddSnipCommand(contexts, fileName, 'cmdA', 'echo hello A', undefined, ['tag1'], ['cmd2']);
                    await runToAddSnipCommand(contexts, fileName, 'cmdB', 'echo hello B', undefined, ['tag1'], ['cmd2']);
                    await runToExecuteCommands(contextsToRun, fileName, undefined, ['tag1'], false);

                    const chunk1 = logIndexOf('chunk 1...');
                    const cmd2Exec = logIndexOf('[exec-dry::cmd2] Executing ...');
                    const cmd2Done = logIndexOf('[exec-dry::cmd2] Completed with code 0');
                    const cmd2Cmd = logIndexOf(`[exec-dry::cmd2] node ${script2}`);
                    const cmd2Out = logIndexOf('out2\n');
                    const chunk2 = logIndexOf('chunk 2...');
                    const cmdAExec = logIndexOf('[exec-dry::cmdA] Executing ...');
                    const cmdBExec = logIndexOf('[exec-dry::cmdB] Executing ...');
                    const cmdADone = logIndexOf('[exec-dry::cmdA] Completed with code 0');
                    const cmdACmd = logIndexOf('[exec-dry::cmdA] echo hello A');
                    const cmdAOut = logIndexOf('hello A\r\n');
                    const cmdBDone = logIndexOf('[exec-dry::cmdB] Completed with code 0');
                    const cmdBCmd = logIndexOf('[exec-dry::cmdB] echo hello B');
                    const cmdBOut = logIndexOf('hello B\r\n');

                    expect(chunk1).to.be.lessThan(cmd2Exec);
                    expect(cmd2Exec).to.be.lessThan(cmd2Done);
                    expect(cmd2Done).to.be.lessThan(cmd2Cmd);
                    expect(cmd2Cmd).to.be.lessThan(cmd2Out);
                    expect(cmd2Out).to.be.lessThan(chunk2);
                    expect(chunk2).to.be.lessThan(cmdAExec);
                    expect(chunk2).to.be.lessThan(cmdBExec);
                    expect(cmdAExec).to.be.lessThan(cmdADone);
                    expect(cmdADone).to.be.lessThan(cmdACmd);
                    expect(cmdACmd).to.be.lessThan(cmdAOut);
                    expect(cmdBExec).to.be.lessThan(cmdBDone);
                    expect(cmdBDone).to.be.lessThan(cmdBCmd);
                    expect(cmdBCmd).to.be.lessThan(cmdBOut);

                    sinon.assert.neverCalledWith(consoleStub, '[exec-dry::cmd1] Executing ...');
                    sinon.assert.neverCalledWith(consoleStub, '[exec-dry::cmd1] Completed with code 0');
                    sinon.assert.neverCalledWith(consoleStub, `[exec-dry::cmd1] node ${script1}`);
                    sinon.assert.neverCalledWith(consoleStub, 'out1\n');
                });
            });
        });

        describe('file is not provided and dryRun = false', () => {
            describe('executable file exist', () => {
                const file1 = 'exec-tags-1.snip';
                const file2 = 'exec-tags-2.snip';
                const script1 = path.join(contexts.workingDir, 'tmp_exec_tags_1.js');
                const script2 = path.join(contexts.workingDir, 'tmp_exec_tags_2.js');

                beforeEach(async () => {
                    await runToCreateSnipFile(contextsToRun, file1);
                    await fs.promises.writeFile(script1, "console.log('out1'); process.exit(0);");
                    await runToAddSnipCommand(contexts, file1, 'cmd1', `node ${script1}`, 'A', ['tag1']);
                });

                describe('scenario except dependsOn', () => {
                    beforeEach(async () => {
                        await runToCreateSnipFile(contexts, file2);
                        await fs.promises.writeFile(script2, "console.error('out2'); process.exit(1);");
                        await runToAddSnipCommand(contexts, file2, 'cmd1', `node ${script2}`, 'X', ['tag1', 'tag3']);
                    });
                    
                    it('should execute all commands in all snip files when no filters are provided', async () => {
                        const script3 = path.join(contexts.workingDir, 'tmp_exec_all_3.js');
                        await fs.promises.writeFile(script3, "console.log('out3'); process.exit(0);");
                        await runToAddSnipCommand(contexts, file2, 'cmd2', `node ${script3}`);

                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, false);
                        await new Promise(r => setTimeout(r, 500));

                        sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] Executing ...`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] Completed with code 0`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] node ${script1}`);
                        sinon.assert.calledWith(consoleStub, `out1\n`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd1] Executing ...`);
                        sinon.assert.calledWith(consoleErrorStub, `[exec-tags-2::cmd1] Completed with code 1`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd1] node ${script2}`);
                        sinon.assert.calledWith(consoleErrorStub, `out2\n`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd2] Executing ...`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd2] Completed with code 0`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd2] node ${script3}`);
                        sinon.assert.calledWith(consoleStub, `out3\n`);
                    });

                    it('should execute only commands with matching name across all snip files', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmd2', `echo hello}`);

                        await runToExecuteCommands(contextsToRun, undefined, 'cmd1', undefined, false);
                        await new Promise(r => setTimeout(r, 500));

                        sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] Executing ...`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] Completed with code 0`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] node ${script1}`);
                        sinon.assert.calledWith(consoleStub, `out1\n`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd1] Executing ...`);
                        sinon.assert.calledWith(consoleErrorStub, `[exec-tags-2::cmd1] Completed with code 1`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd1] node ${script2}`);
                        sinon.assert.calledWith(consoleErrorStub, `out2\n`);
                        sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmd2] Executing ...`);
                        sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmd2] Completed with code 0`);
                    });

                    it('should execute only commands matching tags across all snip files', async () => {
                        await runToAddSnipCommand(contexts, file1, 'cmdM', 'echo one', 'B', ['tag2']);
                        await runToAddSnipCommand(contexts, file2, 'cmd2', 'echo world', 'Y', ['tag2', 'tag3']);
                        await runToAddSnipCommand(contexts, file2, 'cmdN', 'echo world', 'Z');                    

                        await runToExecuteCommands(contextsToRun, undefined, undefined, ['tag1'], false);
                        await new Promise(r => setTimeout(r, 500));

                        sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] Executing ...`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] Completed with code 0`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] node ${script1}`);
                        sinon.assert.calledWith(consoleStub, `out1\n`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd1] Executing ...`);
                        sinon.assert.calledWith(consoleErrorStub, `[exec-tags-2::cmd1] Completed with code 1`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd1] node ${script2}`);
                        sinon.assert.calledWith(consoleErrorStub, `out2\n`);
                        sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmd2] Executing ...`);
                        sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmd2] Completed with code 0`);
                        sinon.assert.neverCalledWith(consoleStub, `[exec-tags-1::cmdM] Executing ...`);
                        sinon.assert.neverCalledWith(consoleStub, `[exec-tags-1::cmdM] Completed with code 0`);
                        sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmdN] Executing ...`);
                        sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmdN] Completed with code 0`);
                    });

                    it('should execute all commands when tags argument is empty array', async () => {
                        const script3 = path.join(contexts.workingDir, 'tmp_exec_all_3.js');
                        await fs.promises.writeFile(script3, "console.log('out3'); process.exit(0);");
                        await runToAddSnipCommand(contexts, file2, 'cmd2', `node ${script3}`, 'C');

                        await runToExecuteCommands(contextsToRun, undefined, undefined, [], false);
                        await new Promise(r => setTimeout(r, 500));

                        sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] Executing ...`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] Completed with code 0`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] node ${script1}`);
                        sinon.assert.calledWith(consoleStub, `out1\n`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd1] Executing ...`);
                        sinon.assert.calledWith(consoleErrorStub, `[exec-tags-2::cmd1] Completed with code 1`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd1] node ${script2}`);
                        sinon.assert.calledWith(consoleErrorStub, `out2\n`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd2] Executing ...`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd2] Completed with code 0`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd2] node ${script3}`);
                        sinon.assert.calledWith(consoleStub, `out3\n`);
                    });

                    it('should execute only commands matching both name and tags across all snip files', async () => {
                        const script3 = path.join(contexts.workingDir, 'tmp_exec_name_tags_3.js');
                        await fs.promises.writeFile(script3, "console.log('out3'); process.exit(0);");
                        await runToAddSnipCommand(contexts, file2, 'cmd2', `node ${script3}`, 'C', ['tag1']);

                        await runToExecuteCommands(contextsToRun, undefined, 'cmd1', ['tag3'], false);
                        await new Promise(r => setTimeout(r, 500));

                        sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd1] Executing ...`);
                        sinon.assert.calledWith(consoleErrorStub, `[exec-tags-2::cmd1] Completed with code 1`);
                        sinon.assert.calledWith(consoleStub, `[exec-tags-2::cmd1] node ${script2}`);
                        sinon.assert.calledWith(consoleErrorStub, `out2\n`);
                        sinon.assert.neverCalledWith(consoleStub, `[exec-tags-1::cmd1] Executing ...`);
                        sinon.assert.neverCalledWith(consoleStub, `[exec-tags-1::cmd1] Completed with code 0`);
                        sinon.assert.neverCalledWith(consoleStub, `[exec-tags-1::cmd1] node ${script1}`);
                        sinon.assert.neverCalledWith(consoleStub, `out1\n`);
                        sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmd2] Executing ...`);
                        sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmd2] Completed with code 0`);
                        sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmd2] node ${script3}`);
                        sinon.assert.neverCalledWith(consoleStub, `out3\n`);
                    });
                });

                describe('dependsOn scenario', () => {
                    beforeEach(async () => {
                        contextsToRun.logger = new Logger('verbose');
                        await runToCreateSnipFile(contexts, file2);
                        await fs.promises.writeFile(script2, "console.log('out2'); process.exit(0);");
                        await runToAddSnipCommand(contexts, file2, 'cmd1', `node ${script2}`, 'X', ['tag1', 'tag3']);
                        await runToAddSnipCommand(contexts, file2, 'cmd2', 'echo world', 'Y', ['tag2', 'tag3']);

                        await runToAddSnipCommand(contexts, file1, 'cmdA', 'echo hello', undefined, undefined, ['cmd1']);
                    });

                    it('simple dependency', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello A', undefined, undefined, ['cmd1']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, false);

                        const chunk1 = logIndexOf('chunk 1...');
                        const file1Cmd1Exec = logIndexOf('[exec-tags-1::cmd1] Executing ...');
                        const file1Cmd1Done = logIndexOf('[exec-tags-1::cmd1] Completed with code 0');
                        const file1Cmd1Cmd = logIndexOf(`[exec-tags-1::cmd1] node ${script1}`);
                        const file1Cmd1Out = logIndexOf('out1\n');
                        const file2Cmd1Exec = logIndexOf('[exec-tags-2::cmd1] Executing ...');
                        const file2Cmd1Done = logIndexOf('[exec-tags-2::cmd1] Completed with code 0');
                        const file2Cmd1Cmd = logIndexOf(`[exec-tags-2::cmd1] node ${script2}`);
                        const file2Cmd1Out = logIndexOf('out2\n');
                        const file2Cmd2Exec = logIndexOf('[exec-tags-2::cmd2] Executing ...');
                        const file2Cmd2Done = logIndexOf('[exec-tags-2::cmd2] Completed with code 0');
                        const file2Cmd2Cmd = logIndexOf(`[exec-tags-2::cmd2] echo world`);
                        const file2Cmd2Out = logIndexOf('world\r\n');
                        const chunk2 = logIndexOf('chunk 2...');
                        const file1CmdAExec = logIndexOf('[exec-tags-1::cmdA] Executing ...');
                        const file1CmdADone = logIndexOf('[exec-tags-1::cmdA] Completed with code 0');
                        const file1CmdACmd = logIndexOf(`[exec-tags-1::cmdA] echo hello`);
                        const file1CmdAOut = logIndexOf('hello\r\n');
                        const file2CmdAExec = logIndexOf('[exec-tags-2::cmdA] Executing ...');
                        const file2CmdADone = logIndexOf('[exec-tags-2::cmdA] Completed with code 0');
                        const file2CmdACmd = logIndexOf(`[exec-tags-2::cmdA] echo hello A`);
                        const file2CmdAOut = logIndexOf('hello A\r\n');

                        expect(chunk1).to.be.lessThan(file1Cmd1Exec);
                        expect(chunk1).to.be.lessThan(file2Cmd1Exec);
                        expect(chunk1).to.be.lessThan(file2Cmd2Exec);
                        expect(file1Cmd1Exec).to.be.lessThan(file1Cmd1Done);
                        expect(file1Cmd1Done).to.be.lessThan(file1Cmd1Cmd);
                        expect(file1Cmd1Cmd).to.be.lessThan(file1Cmd1Out);
                        expect(file2Cmd1Exec).to.be.lessThan(file2Cmd1Done);
                        expect(file2Cmd1Done).to.be.lessThan(file2Cmd1Cmd);
                        expect(file2Cmd1Cmd).to.be.lessThan(file2Cmd1Out);
                        expect(file2Cmd2Exec).to.be.lessThan(file2Cmd2Done);
                        expect(file2Cmd2Done).to.be.lessThan(file2Cmd2Cmd);
                        expect(file2Cmd2Cmd).to.be.lessThan(file2Cmd2Out);
                        expect(file1Cmd1Out).to.be.lessThan(chunk2);
                        expect(file2Cmd1Out).to.be.lessThan(chunk2);
                        expect(file2Cmd2Out).to.be.lessThan(chunk2);
                        expect(chunk2).to.be.lessThan(file1CmdAExec);
                        expect(chunk2).to.be.lessThan(file2CmdAExec);
                        expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
                        expect(file1CmdADone).to.be.lessThan(file1CmdACmd);
                        expect(file1CmdACmd).to.be.lessThan(file1CmdAOut);
                        expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
                        expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
                        expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
                    });

                    it('simple dependency case 2', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello A', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdB', 'echo hello B', undefined, undefined, ['cmd1']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, false);

                        const chunk1 = logIndexOf('chunk 1...');
                        const file1Cmd1Exec = logIndexOf('[exec-tags-1::cmd1] Executing ...');
                        const file1Cmd1Done = logIndexOf('[exec-tags-1::cmd1] Completed with code 0');
                        const file1Cmd1Cmd = logIndexOf(`[exec-tags-1::cmd1] node ${script1}`);
                        const file1Cmd1Out = logIndexOf('out1\n');
                        const file2Cmd1Exec = logIndexOf('[exec-tags-2::cmd1] Executing ...');
                        const file2Cmd1Done = logIndexOf('[exec-tags-2::cmd1] Completed with code 0');
                        const file2Cmd1Cmd = logIndexOf(`[exec-tags-2::cmd1] node ${script2}`);
                        const file2Cmd1Out = logIndexOf('out2\n');
                        const file2Cmd2Exec = logIndexOf('[exec-tags-2::cmd2] Executing ...');
                        const file2Cmd2Done = logIndexOf('[exec-tags-2::cmd2] Completed with code 0');
                        const file2Cmd2Cmd = logIndexOf(`[exec-tags-2::cmd2] echo world`);
                        const file2Cmd2Out = logIndexOf('world\r\n');
                        const chunk2 = logIndexOf('chunk 2...');
                        const file1CmdAExec = logIndexOf('[exec-tags-1::cmdA] Executing ...');
                        const file1CmdADone = logIndexOf('[exec-tags-1::cmdA] Completed with code 0');
                        const file1CmdACmd = logIndexOf(`[exec-tags-1::cmdA] echo hello`);
                        const file1CmdAOut = logIndexOf('hello\r\n');
                        const file2CmdAExec = logIndexOf('[exec-tags-2::cmdA] Executing ...');
                        const file2CmdADone = logIndexOf('[exec-tags-2::cmdA] Completed with code 0');
                        const file2CmdACmd = logIndexOf(`[exec-tags-2::cmdA] echo hello A`);
                        const file2CmdAOut = logIndexOf('hello A\r\n');
                        const file2CmdBExec = logIndexOf('[exec-tags-2::cmdB] Executing ...');
                        const file2CmdBDone = logIndexOf('[exec-tags-2::cmdB] Completed with code 0');
                        const file2CmdBCmd = logIndexOf(`[exec-tags-2::cmdB] echo hello B`);
                        const file2CmdBOut = logIndexOf('hello B\r\n');

                        expect(chunk1).to.be.lessThan(file1Cmd1Exec);
                        expect(chunk1).to.be.lessThan(file2Cmd1Exec);
                        expect(chunk1).to.be.lessThan(file2Cmd2Exec);
                        expect(file1Cmd1Exec).to.be.lessThan(file1Cmd1Done);
                        expect(file1Cmd1Done).to.be.lessThan(file1Cmd1Cmd);
                        expect(file1Cmd1Cmd).to.be.lessThan(file1Cmd1Out);
                        expect(file2Cmd1Exec).to.be.lessThan(file2Cmd1Done);
                        expect(file2Cmd1Done).to.be.lessThan(file2Cmd1Cmd);
                        expect(file2Cmd1Cmd).to.be.lessThan(file2Cmd1Out);
                        expect(file2Cmd2Exec).to.be.lessThan(file2Cmd2Done);
                        expect(file2Cmd2Done).to.be.lessThan(file2Cmd2Cmd);
                        expect(file2Cmd2Cmd).to.be.lessThan(file2Cmd2Out);
                        expect(file1Cmd1Out).to.be.lessThan(chunk2);
                        expect(file2Cmd1Out).to.be.lessThan(chunk2);
                        expect(file2Cmd2Out).to.be.lessThan(chunk2);
                        expect(chunk2).to.be.lessThan(file1CmdAExec);
                        expect(chunk2).to.be.lessThan(file2CmdAExec);
                        expect(chunk2).to.be.lessThan(file2CmdBExec);
                        expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
                        expect(file1CmdADone).to.be.lessThan(file1CmdACmd);
                        expect(file1CmdACmd).to.be.lessThan(file1CmdAOut);
                        expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
                        expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
                        expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
                        expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
                        expect(file2CmdBDone).to.be.lessThan(file2CmdBCmd);
                        expect(file2CmdBCmd).to.be.lessThan(file2CmdBOut);
                    });

                    it('long dependency', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello A', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdB', 'echo hello B', undefined, undefined, ['cmdA']);
                        await runToAddSnipCommand(contexts, file2, 'cmdC', 'echo hello C', undefined, undefined, ['cmdB']);
                        await runToAddSnipCommand(contexts, file2, 'cmdD', 'echo hello D', undefined, undefined, ['cmdC']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, false);

                        const chunk1 = logIndexOf('chunk 1...');
                        const file1Cmd1Exec = logIndexOf('[exec-tags-1::cmd1] Executing ...');
                        const file1Cmd1Done = logIndexOf('[exec-tags-1::cmd1] Completed with code 0');
                        const file1Cmd1Cmd = logIndexOf(`[exec-tags-1::cmd1] node ${script1}`);
                        const file1Cmd1Out = logIndexOf('out1\n');
                        const file2Cmd1Exec = logIndexOf('[exec-tags-2::cmd1] Executing ...');
                        const file2Cmd1Done = logIndexOf('[exec-tags-2::cmd1] Completed with code 0');
                        const file2Cmd1Cmd = logIndexOf(`[exec-tags-2::cmd1] node ${script2}`);
                        const file2Cmd1Out = logIndexOf('out2\n');
                        const file2Cmd2Exec = logIndexOf('[exec-tags-2::cmd2] Executing ...');
                        const file2Cmd2Done = logIndexOf('[exec-tags-2::cmd2] Completed with code 0');
                        const file2Cmd2Cmd = logIndexOf(`[exec-tags-2::cmd2] echo world`);
                        const file2Cmd2Out = logIndexOf('world\r\n');
                        const chunk2 = logIndexOf('chunk 2...');
                        const file1CmdAExec = logIndexOf('[exec-tags-1::cmdA] Executing ...');
                        const file1CmdADone = logIndexOf('[exec-tags-1::cmdA] Completed with code 0');
                        const file1CmdACmd = logIndexOf(`[exec-tags-1::cmdA] echo hello`);
                        const file1CmdAOut = logIndexOf('hello\r\n');
                        const file2CmdAExec = logIndexOf('[exec-tags-2::cmdA] Executing ...');
                        const file2CmdADone = logIndexOf('[exec-tags-2::cmdA] Completed with code 0');
                        const file2CmdACmd = logIndexOf(`[exec-tags-2::cmdA] echo hello A`);
                        const file2CmdAOut = logIndexOf('hello A\r\n');
                        const chunk3 = logIndexOf('chunk 3...');
                        const file2CmdBExec = logIndexOf('[exec-tags-2::cmdB] Executing ...');
                        const file2CmdBDone = logIndexOf('[exec-tags-2::cmdB] Completed with code 0');
                        const file2CmdBCmd = logIndexOf(`[exec-tags-2::cmdB] echo hello B`);
                        const file2CmdBOut = logIndexOf('hello B\r\n');
                        const chunk4 = logIndexOf('chunk 4...');
                        const file2CmdCExec = logIndexOf('[exec-tags-2::cmdC] Executing ...');
                        const file2CmdCDone = logIndexOf('[exec-tags-2::cmdC] Completed with code 0');
                        const file2CmdCCmd = logIndexOf(`[exec-tags-2::cmdC] echo hello C`);
                        const file2CmdCOut = logIndexOf('hello C\r\n');
                        const chunk5 = logIndexOf('chunk 5...');
                        const file2CmdDExec = logIndexOf('[exec-tags-2::cmdD] Executing ...');
                        const file2CmdDDone = logIndexOf('[exec-tags-2::cmdD] Completed with code 0');
                        const file2CmdDCmd = logIndexOf(`[exec-tags-2::cmdD] echo hello D`);
                        const file2CmdDOut = logIndexOf('hello D\r\n');

                        expect(chunk1).to.be.lessThan(file1Cmd1Exec);
                        expect(chunk1).to.be.lessThan(file2Cmd1Exec);
                        expect(chunk1).to.be.lessThan(file2Cmd2Exec);
                        expect(file1Cmd1Exec).to.be.lessThan(file1Cmd1Done);
                        expect(file1Cmd1Done).to.be.lessThan(file1Cmd1Cmd);
                        expect(file1Cmd1Cmd).to.be.lessThan(file1Cmd1Out);
                        expect(file2Cmd1Exec).to.be.lessThan(file2Cmd1Done);
                        expect(file2Cmd1Done).to.be.lessThan(file2Cmd1Cmd);
                        expect(file2Cmd1Cmd).to.be.lessThan(file2Cmd1Out);
                        expect(file2Cmd2Exec).to.be.lessThan(file2Cmd2Done);
                        expect(file2Cmd2Done).to.be.lessThan(file2Cmd2Cmd);
                        expect(file2Cmd2Cmd).to.be.lessThan(file2Cmd2Out);
                        expect(file1Cmd1Out).to.be.lessThan(chunk2);
                        expect(file2Cmd1Out).to.be.lessThan(chunk2);
                        expect(file2Cmd2Out).to.be.lessThan(chunk2);
                        expect(chunk2).to.be.lessThan(file1CmdAExec);
                        expect(chunk2).to.be.lessThan(file2CmdAExec);
                        expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
                        expect(file1CmdADone).to.be.lessThan(file1CmdACmd);
                        expect(file1CmdACmd).to.be.lessThan(file1CmdAOut);
                        expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
                        expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
                        expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
                        expect(file1CmdAOut).to.be.lessThan(chunk3);
                        expect(file2CmdAOut).to.be.lessThan(chunk3);
                        expect(chunk3).to.be.lessThan(file2CmdBExec);
                        expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
                        expect(file2CmdBDone).to.be.lessThan(file2CmdBCmd);
                        expect(file2CmdBCmd).to.be.lessThan(file2CmdBOut);
                        expect(file2CmdBOut).to.be.lessThan(chunk4);
                        expect(chunk4).to.be.lessThan(file2CmdCExec);
                        expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
                        expect(file2CmdCDone).to.be.lessThan(file2CmdCCmd);
                        expect(file2CmdCCmd).to.be.lessThan(file2CmdCOut);
                        expect(file2CmdCOut).to.be.lessThan(chunk5);
                        expect(chunk5).to.be.lessThan(file2CmdDExec);
                        expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
                        expect(file2CmdDDone).to.be.lessThan(file2CmdDCmd);
                        expect(file2CmdDCmd).to.be.lessThan(file2CmdDOut);
                    });

                    it('DAO shared nodes', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello A', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdB', 'echo hello B', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdC', 'echo hello C', undefined, undefined, ['cmdA', 'cmdB']);
                        await runToAddSnipCommand(contexts, file2, 'cmdD', 'echo hello D', undefined, undefined, ['cmdC']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, false);

                        const chunk1 = logIndexOf('chunk 1...');
                        const file1Cmd1Exec = logIndexOf('[exec-tags-1::cmd1] Executing ...');
                        const file1Cmd1Done = logIndexOf('[exec-tags-1::cmd1] Completed with code 0');
                        const file1Cmd1Cmd = logIndexOf(`[exec-tags-1::cmd1] node ${script1}`);
                        const file1Cmd1Out = logIndexOf('out1\n');
                        const file2Cmd1Exec = logIndexOf('[exec-tags-2::cmd1] Executing ...');
                        const file2Cmd1Done = logIndexOf('[exec-tags-2::cmd1] Completed with code 0');
                        const file2Cmd1Cmd = logIndexOf(`[exec-tags-2::cmd1] node ${script2}`);
                        const file2Cmd1Out = logIndexOf('out2\n');
                        const file2Cmd2Exec = logIndexOf('[exec-tags-2::cmd2] Executing ...');
                        const file2Cmd2Done = logIndexOf('[exec-tags-2::cmd2] Completed with code 0');
                        const file2Cmd2Cmd = logIndexOf(`[exec-tags-2::cmd2] echo world`);
                        const file2Cmd2Out = logIndexOf('world\r\n');
                        const chunk2 = logIndexOf('chunk 2...');
                        const file1CmdAExec = logIndexOf('[exec-tags-1::cmdA] Executing ...');
                        const file1CmdADone = logIndexOf('[exec-tags-1::cmdA] Completed with code 0');
                        const file1CmdACmd = logIndexOf(`[exec-tags-1::cmdA] echo hello`);
                        const file1CmdAOut = logIndexOf('hello\r\n');
                        const file2CmdAExec = logIndexOf('[exec-tags-2::cmdA] Executing ...');
                        const file2CmdADone = logIndexOf('[exec-tags-2::cmdA] Completed with code 0');
                        const file2CmdACmd = logIndexOf(`[exec-tags-2::cmdA] echo hello A`);
                        const file2CmdAOut = logIndexOf('hello A\r\n');
                        const file2CmdBExec = logIndexOf('[exec-tags-2::cmdB] Executing ...');
                        const file2CmdBDone = logIndexOf('[exec-tags-2::cmdB] Completed with code 0');
                        const file2CmdBCmd = logIndexOf(`[exec-tags-2::cmdB] echo hello B`);
                        const file2CmdBOut = logIndexOf('hello B\r\n');
                        const chunk3 = logIndexOf('chunk 3...');
                        const file2CmdCExec = logIndexOf('[exec-tags-2::cmdC] Executing ...');
                        const file2CmdCDone = logIndexOf('[exec-tags-2::cmdC] Completed with code 0');
                        const file2CmdCCmd = logIndexOf(`[exec-tags-2::cmdC] echo hello C`);
                        const file2CmdCOut = logIndexOf('hello C\r\n');
                        const chunk4 = logIndexOf('chunk 4...');
                        const file2CmdDExec = logIndexOf('[exec-tags-2::cmdD] Executing ...');
                        const file2CmdDDone = logIndexOf('[exec-tags-2::cmdD] Completed with code 0');
                        const file2CmdDCmd = logIndexOf(`[exec-tags-2::cmdD] echo hello D`);
                        const file2CmdDOut = logIndexOf('hello D\r\n');

                        expect(chunk1).to.be.lessThan(file1Cmd1Exec);
                        expect(chunk1).to.be.lessThan(file2Cmd1Exec);
                        expect(chunk1).to.be.lessThan(file2Cmd2Exec);
                        expect(file1Cmd1Exec).to.be.lessThan(file1Cmd1Done);
                        expect(file1Cmd1Done).to.be.lessThan(file1Cmd1Cmd);
                        expect(file1Cmd1Cmd).to.be.lessThan(file1Cmd1Out);
                        expect(file2Cmd1Exec).to.be.lessThan(file2Cmd1Done);
                        expect(file2Cmd1Done).to.be.lessThan(file2Cmd1Cmd);
                        expect(file2Cmd1Cmd).to.be.lessThan(file2Cmd1Out);
                        expect(file2Cmd2Exec).to.be.lessThan(file2Cmd2Done);
                        expect(file2Cmd2Done).to.be.lessThan(file2Cmd2Cmd);
                        expect(file2Cmd2Cmd).to.be.lessThan(file2Cmd2Out);
                        expect(file1Cmd1Out).to.be.lessThan(chunk2);
                        expect(file2Cmd1Out).to.be.lessThan(chunk2);
                        expect(file2Cmd2Out).to.be.lessThan(chunk2);
                        expect(chunk2).to.be.lessThan(file1CmdAExec);
                        expect(chunk2).to.be.lessThan(file2CmdAExec);
                        expect(chunk2).to.be.lessThan(file2CmdBExec);
                        expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
                        expect(file1CmdADone).to.be.lessThan(file1CmdACmd);
                        expect(file1CmdACmd).to.be.lessThan(file1CmdAOut);
                        expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
                        expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
                        expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
                        expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
                        expect(file2CmdBDone).to.be.lessThan(file2CmdBCmd);
                        expect(file2CmdBCmd).to.be.lessThan(file2CmdBOut);
                        expect(file1CmdAOut).to.be.lessThan(chunk3);
                        expect(file2CmdAOut).to.be.lessThan(chunk3);
                        expect(file2CmdBOut).to.be.lessThan(chunk3);
                        expect(chunk3).to.be.lessThan(file2CmdCExec);
                        expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
                        expect(file2CmdCDone).to.be.lessThan(file2CmdCCmd);
                        expect(file2CmdCCmd).to.be.lessThan(file2CmdCOut);
                        expect(file2CmdCOut).to.be.lessThan(chunk4);
                        expect(chunk4).to.be.lessThan(file2CmdDExec);
                        expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
                        expect(file2CmdDDone).to.be.lessThan(file2CmdDCmd);
                        expect(file2CmdDCmd).to.be.lessThan(file2CmdDOut);
                    });

                    it('multiple DependsOn', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello A', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdB', 'echo hello B', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdC', 'echo hello C', undefined, undefined, ['cmdA']);
                        await runToAddSnipCommand(contexts, file2, 'cmdD', 'echo hello D', undefined, undefined, ['cmdB']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, false);

                        const chunk1 = logIndexOf('chunk 1...');
                        const file1Cmd1Exec = logIndexOf('[exec-tags-1::cmd1] Executing ...');
                        const file1Cmd1Done = logIndexOf('[exec-tags-1::cmd1] Completed with code 0');
                        const file1Cmd1Cmd = logIndexOf(`[exec-tags-1::cmd1] node ${script1}`);
                        const file1Cmd1Out = logIndexOf('out1\n');
                        const file2Cmd1Exec = logIndexOf('[exec-tags-2::cmd1] Executing ...');
                        const file2Cmd1Done = logIndexOf('[exec-tags-2::cmd1] Completed with code 0');
                        const file2Cmd1Cmd = logIndexOf(`[exec-tags-2::cmd1] node ${script2}`);
                        const file2Cmd1Out = logIndexOf('out2\n');
                        const file2Cmd2Exec = logIndexOf('[exec-tags-2::cmd2] Executing ...');
                        const file2Cmd2Done = logIndexOf('[exec-tags-2::cmd2] Completed with code 0');
                        const file2Cmd2Cmd = logIndexOf(`[exec-tags-2::cmd2] echo world`);
                        const file2Cmd2Out = logIndexOf('world\r\n');
                        const chunk2 = logIndexOf('chunk 2...');
                        const file1CmdAExec = logIndexOf('[exec-tags-1::cmdA] Executing ...');
                        const file1CmdADone = logIndexOf('[exec-tags-1::cmdA] Completed with code 0');
                        const file1CmdACmd = logIndexOf(`[exec-tags-1::cmdA] echo hello`);
                        const file1CmdAOut = logIndexOf('hello\r\n');
                        const file2CmdAExec = logIndexOf('[exec-tags-2::cmdA] Executing ...');
                        const file2CmdADone = logIndexOf('[exec-tags-2::cmdA] Completed with code 0');
                        const file2CmdACmd = logIndexOf(`[exec-tags-2::cmdA] echo hello A`);
                        const file2CmdAOut = logIndexOf('hello A\r\n');
                        const file2CmdBExec = logIndexOf('[exec-tags-2::cmdB] Executing ...');
                        const file2CmdBDone = logIndexOf('[exec-tags-2::cmdB] Completed with code 0');
                        const file2CmdBCmd = logIndexOf(`[exec-tags-2::cmdB] echo hello B`);
                        const file2CmdBOut = logIndexOf('hello B\r\n');
                        const chunk3 = logIndexOf('chunk 3...');
                        const file2CmdCExec = logIndexOf('[exec-tags-2::cmdC] Executing ...');
                        const file2CmdCDone = logIndexOf('[exec-tags-2::cmdC] Completed with code 0');
                        const file2CmdCCmd = logIndexOf(`[exec-tags-2::cmdC] echo hello C`);
                        const file2CmdCOut = logIndexOf('hello C\r\n');
                        const file2CmdDExec = logIndexOf('[exec-tags-2::cmdD] Executing ...');
                        const file2CmdDDone = logIndexOf('[exec-tags-2::cmdD] Completed with code 0');
                        const file2CmdDCmd = logIndexOf(`[exec-tags-2::cmdD] echo hello D`);
                        const file2CmdDOut = logIndexOf('hello D\r\n');

                        expect(chunk1).to.be.lessThan(file1Cmd1Exec);
                        expect(chunk1).to.be.lessThan(file2Cmd1Exec);
                        expect(chunk1).to.be.lessThan(file2Cmd2Exec);
                        expect(file1Cmd1Exec).to.be.lessThan(file1Cmd1Done);
                        expect(file1Cmd1Done).to.be.lessThan(file1Cmd1Cmd);
                        expect(file1Cmd1Cmd).to.be.lessThan(file1Cmd1Out);
                        expect(file2Cmd1Exec).to.be.lessThan(file2Cmd1Done);
                        expect(file2Cmd1Done).to.be.lessThan(file2Cmd1Cmd);
                        expect(file2Cmd1Cmd).to.be.lessThan(file2Cmd1Out);
                        expect(file2Cmd2Exec).to.be.lessThan(file2Cmd2Done);
                        expect(file2Cmd2Done).to.be.lessThan(file2Cmd2Cmd);
                        expect(file2Cmd2Cmd).to.be.lessThan(file2Cmd2Out);
                        expect(file1Cmd1Done).to.be.lessThan(chunk2);
                        expect(file2Cmd1Done).to.be.lessThan(chunk2);
                        expect(file2Cmd2Done).to.be.lessThan(chunk2);
                        expect(chunk2).to.be.lessThan(file1CmdAExec);
                        expect(chunk2).to.be.lessThan(file2CmdAExec);
                        expect(chunk2).to.be.lessThan(file2CmdBExec);
                        expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
                        expect(file1CmdADone).to.be.lessThan(file1CmdACmd);
                        expect(file1CmdACmd).to.be.lessThan(file1CmdAOut);
                        expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
                        expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
                        expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
                        expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
                        expect(file2CmdBDone).to.be.lessThan(file2CmdBCmd);
                        expect(file2CmdBCmd).to.be.lessThan(file2CmdBOut);
                        expect(file1CmdADone).to.be.lessThan(chunk3);
                        expect(file2CmdADone).to.be.lessThan(chunk3);
                        expect(file2CmdBDone).to.be.lessThan(chunk3);
                        expect(chunk3).to.be.lessThan(file2CmdCExec);
                        expect(chunk3).to.be.lessThan(file2CmdDExec);
                        expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
                        expect(file2CmdCDone).to.be.lessThan(file2CmdCCmd);
                        expect(file2CmdCCmd).to.be.lessThan(file2CmdCOut);
                        expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
                        expect(file2CmdDDone).to.be.lessThan(file2CmdDCmd);
                        expect(file2CmdDCmd).to.be.lessThan(file2CmdDOut);
                    });

                    it('multiple DependsOn case 2', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello A', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdB', 'echo hello B', undefined, undefined, ['cmd2']);
                        await runToAddSnipCommand(contexts, file2, 'cmdC', 'echo hello C', undefined, undefined, ['cmdA', 'cmdB']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, false);

                        const chunk1 = logIndexOf('chunk 1...');
                        const file1Cmd1Exec = logIndexOf('[exec-tags-1::cmd1] Executing ...');
                        const file1Cmd1Done = logIndexOf('[exec-tags-1::cmd1] Completed with code 0');
                        const file1Cmd1Cmd = logIndexOf(`[exec-tags-1::cmd1] node ${script1}`);
                        const file1Cmd1Out = logIndexOf('out1\n');
                        const file2Cmd1Exec = logIndexOf('[exec-tags-2::cmd1] Executing ...');
                        const file2Cmd1Done = logIndexOf('[exec-tags-2::cmd1] Completed with code 0');
                        const file2Cmd1Cmd = logIndexOf(`[exec-tags-2::cmd1] node ${script2}`);
                        const file2Cmd1Out = logIndexOf('out2\n');
                        const file2Cmd2Exec = logIndexOf('[exec-tags-2::cmd2] Executing ...');
                        const file2Cmd2Done = logIndexOf('[exec-tags-2::cmd2] Completed with code 0');
                        const file2Cmd2Cmd = logIndexOf(`[exec-tags-2::cmd2] echo world`);
                        const file2Cmd2Out = logIndexOf('world\r\n');
                        const chunk2 = logIndexOf('chunk 2...');
                        const file1CmdAExec = logIndexOf('[exec-tags-1::cmdA] Executing ...');
                        const file1CmdADone = logIndexOf('[exec-tags-1::cmdA] Completed with code 0');
                        const file1CmdACmd = logIndexOf(`[exec-tags-1::cmdA] echo hello`);
                        const file1CmdAOut = logIndexOf('hello\r\n');
                        const file2CmdAExec = logIndexOf('[exec-tags-2::cmdA] Executing ...');
                        const file2CmdADone = logIndexOf('[exec-tags-2::cmdA] Completed with code 0');
                        const file2CmdACmd = logIndexOf(`[exec-tags-2::cmdA] echo hello A`);
                        const file2CmdAOut = logIndexOf('hello A\r\n');
                        const file2CmdBExec = logIndexOf('[exec-tags-2::cmdB] Executing ...');
                        const file2CmdBDone = logIndexOf('[exec-tags-2::cmdB] Completed with code 0');
                        const file2CmdBCmd = logIndexOf(`[exec-tags-2::cmdB] echo hello B`);
                        const file2CmdBOut = logIndexOf('hello B\r\n');
                        const chunk3 = logIndexOf('chunk 3...');
                        const file2CmdCExec = logIndexOf('[exec-tags-2::cmdC] Executing ...');
                        const file2CmdCDone = logIndexOf('[exec-tags-2::cmdC] Completed with code 0');
                        const file2CmdCCmd = logIndexOf(`[exec-tags-2::cmdC] echo hello C`);
                        const file2CmdCOut = logIndexOf('hello C\r\n');

                        expect(chunk1).to.be.lessThan(file1Cmd1Exec);
                        expect(chunk1).to.be.lessThan(file2Cmd1Exec);
                        expect(chunk1).to.be.lessThan(file2Cmd2Exec);
                        expect(file1Cmd1Exec).to.be.lessThan(file1Cmd1Done);
                        expect(file1Cmd1Done).to.be.lessThan(file1Cmd1Cmd);
                        expect(file1Cmd1Cmd).to.be.lessThan(file1Cmd1Out);
                        expect(file2Cmd1Exec).to.be.lessThan(file2Cmd1Done);
                        expect(file2Cmd1Done).to.be.lessThan(file2Cmd1Cmd);
                        expect(file2Cmd1Cmd).to.be.lessThan(file2Cmd1Out);
                        expect(file2Cmd2Exec).to.be.lessThan(file2Cmd2Done);
                        expect(file2Cmd2Done).to.be.lessThan(file2Cmd2Cmd);
                        expect(file2Cmd2Cmd).to.be.lessThan(file2Cmd2Out);
                        expect(file1Cmd1Done).to.be.lessThan(chunk2);
                        expect(file2Cmd1Done).to.be.lessThan(chunk2);
                        expect(file2Cmd2Done).to.be.lessThan(chunk2);
                        expect(chunk2).to.be.lessThan(file1CmdAExec);
                        expect(chunk2).to.be.lessThan(file2CmdAExec);
                        expect(chunk2).to.be.lessThan(file2CmdBExec);
                        expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
                        expect(file1CmdADone).to.be.lessThan(file1CmdACmd);
                        expect(file1CmdACmd).to.be.lessThan(file1CmdAOut);
                        expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
                        expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
                        expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
                        expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
                        expect(file2CmdBDone).to.be.lessThan(file2CmdBCmd);
                        expect(file2CmdBCmd).to.be.lessThan(file2CmdBOut);
                        expect(file1CmdADone).to.be.lessThan(chunk3);
                        expect(file2CmdADone).to.be.lessThan(chunk3);
                        expect(file2CmdBDone).to.be.lessThan(chunk3);
                        expect(chunk3).to.be.lessThan(file2CmdCExec);
                        expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
                        expect(file2CmdCDone).to.be.lessThan(file2CmdCCmd);
                        expect(file2CmdCCmd).to.be.lessThan(file2CmdCOut);
                    });

                    it('multiple shared nodes', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello A', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdB', 'echo hello B', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdC', 'echo hello C', undefined, undefined, ['cmdA', 'cmdB']);
                        await runToAddSnipCommand(contexts, file2, 'cmdE', 'echo hello E', undefined, undefined, ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdD', 'echo hello D', undefined, undefined, ['cmdC', 'cmdE']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, false);

                        const chunk1 = logIndexOf('chunk 1...');
                        const file1Cmd1Exec = logIndexOf('[exec-tags-1::cmd1] Executing ...');
                        const file1Cmd1Done = logIndexOf('[exec-tags-1::cmd1] Completed with code 0');
                        const file1Cmd1Cmd = logIndexOf(`[exec-tags-1::cmd1] node ${script1}`);
                        const file1Cmd1Out = logIndexOf('out1\n');
                        const file2Cmd1Exec = logIndexOf('[exec-tags-2::cmd1] Executing ...');
                        const file2Cmd1Done = logIndexOf('[exec-tags-2::cmd1] Completed with code 0');
                        const file2Cmd1Cmd = logIndexOf(`[exec-tags-2::cmd1] node ${script2}`);
                        const file2Cmd1Out = logIndexOf('out2\n');
                        const file2Cmd2Exec = logIndexOf('[exec-tags-2::cmd2] Executing ...');
                        const file2Cmd2Done = logIndexOf('[exec-tags-2::cmd2] Completed with code 0');
                        const file2Cmd2Cmd = logIndexOf(`[exec-tags-2::cmd2] echo world`);
                        const file2Cmd2Out = logIndexOf('world\r\n');
                        const chunk2 = logIndexOf('chunk 2...');
                        const file1CmdAExec = logIndexOf('[exec-tags-1::cmdA] Executing ...');
                        const file1CmdADone = logIndexOf('[exec-tags-1::cmdA] Completed with code 0');
                        const file1CmdACmd = logIndexOf(`[exec-tags-1::cmdA] echo hello`);
                        const file1CmdAOut = logIndexOf('hello\r\n');
                        const file2CmdAExec = logIndexOf('[exec-tags-2::cmdA] Executing ...');
                        const file2CmdADone = logIndexOf('[exec-tags-2::cmdA] Completed with code 0');
                        const file2CmdACmd = logIndexOf(`[exec-tags-2::cmdA] echo hello A`);
                        const file2CmdAOut = logIndexOf('hello A\r\n');
                        const file2CmdBExec = logIndexOf('[exec-tags-2::cmdB] Executing ...');
                        const file2CmdBDone = logIndexOf('[exec-tags-2::cmdB] Completed with code 0');
                        const file2CmdBCmd = logIndexOf(`[exec-tags-2::cmdB] echo hello B`);
                        const file2CmdBOut = logIndexOf('hello B\r\n');
                        const file2CmdEExec = logIndexOf('[exec-tags-2::cmdE] Executing ...');
                        const file2CmdEDone = logIndexOf('[exec-tags-2::cmdE] Completed with code 0');
                        const file2CmdECmd = logIndexOf(`[exec-tags-2::cmdE] echo hello E`);
                        const file2CmdEOut = logIndexOf('hello E\r\n');
                        const chunk3 = logIndexOf('chunk 3...');
                        const file2CmdCExec = logIndexOf('[exec-tags-2::cmdC] Executing ...');
                        const file2CmdCDone = logIndexOf('[exec-tags-2::cmdC] Completed with code 0');
                        const file2CmdCCmd = logIndexOf(`[exec-tags-2::cmdC] echo hello C`);
                        const file2CmdCOut = logIndexOf('hello C\r\n');
                        const chunk4 = logIndexOf('chunk 4...');
                        const file2CmdDExec = logIndexOf('[exec-tags-2::cmdD] Executing ...');
                        const file2CmdDDone = logIndexOf('[exec-tags-2::cmdD] Completed with code 0');
                        const file2CmdDCmd = logIndexOf(`[exec-tags-2::cmdD] echo hello D`);
                        const file2CmdDOut = logIndexOf('hello D\r\n');

                        expect(chunk1).to.be.lessThan(file1Cmd1Exec);
                        expect(chunk1).to.be.lessThan(file2Cmd1Exec);
                        expect(chunk1).to.be.lessThan(file2Cmd2Exec);
                        expect(file1Cmd1Exec).to.be.lessThan(file1Cmd1Done);
                        expect(file1Cmd1Done).to.be.lessThan(file1Cmd1Cmd);
                        expect(file1Cmd1Cmd).to.be.lessThan(file1Cmd1Out);
                        expect(file2Cmd1Exec).to.be.lessThan(file2Cmd1Done);
                        expect(file2Cmd1Done).to.be.lessThan(file2Cmd1Cmd);
                        expect(file2Cmd1Cmd).to.be.lessThan(file2Cmd1Out);
                        expect(file2Cmd2Exec).to.be.lessThan(file2Cmd2Done);
                        expect(file2Cmd2Done).to.be.lessThan(file2Cmd2Cmd);
                        expect(file2Cmd2Cmd).to.be.lessThan(file2Cmd2Out);
                        expect(file1Cmd1Done).to.be.lessThan(chunk2);
                        expect(file2Cmd1Done).to.be.lessThan(chunk2);
                        expect(file2Cmd2Done).to.be.lessThan(chunk2);
                        expect(chunk2).to.be.lessThan(file1CmdAExec);
                        expect(chunk2).to.be.lessThan(file2CmdAExec);
                        expect(chunk2).to.be.lessThan(file2CmdBExec);
                        expect(chunk2).to.be.lessThan(file2CmdEExec);
                        expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
                        expect(file1CmdADone).to.be.lessThan(file1CmdACmd);
                        expect(file1CmdACmd).to.be.lessThan(file1CmdAOut);
                        expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
                        expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
                        expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
                        expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
                        expect(file2CmdBDone).to.be.lessThan(file2CmdBCmd);
                        expect(file2CmdBCmd).to.be.lessThan(file2CmdBOut);
                        expect(file2CmdEExec).to.be.lessThan(file2CmdEDone);
                        expect(file2CmdEDone).to.be.lessThan(file2CmdECmd);
                        expect(file2CmdECmd).to.be.lessThan(file2CmdEOut);
                        expect(file1CmdADone).to.be.lessThan(chunk3);
                        expect(file2CmdADone).to.be.lessThan(chunk3);
                        expect(file2CmdBDone).to.be.lessThan(chunk3);
                        expect(file2CmdEDone).to.be.lessThan(chunk3);
                        expect(chunk3).to.be.lessThan(file2CmdCExec);
                        expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
                        expect(file2CmdCDone).to.be.lessThan(file2CmdCCmd);
                        expect(file2CmdCCmd).to.be.lessThan(file2CmdCOut);
                        expect(file2CmdCOut).to.be.lessThan(chunk4);
                        expect(chunk4).to.be.lessThan(file2CmdDExec);
                        expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
                        expect(file2CmdDDone).to.be.lessThan(file2CmdDCmd);
                        expect(file2CmdDCmd).to.be.lessThan(file2CmdDOut);
                    });

                    it('multiple shared nodes case 2', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello A', undefined, undefined, []);
                        await runToAddSnipCommand(contexts, file2, 'cmdB', 'echo hello B', undefined, undefined, ['cmd1', 'cmd2']);
                        await runToAddSnipCommand(contexts, file2, 'cmdC', 'echo hello C', undefined, undefined, ['cmd2', 'cmdA']);
                        await runToAddSnipCommand(contexts, file2, 'cmdD', 'echo hello D', undefined, undefined, ['cmdB', 'cmdC']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, false);

                        const chunk1 = logIndexOf('chunk 1...');
                        const file1Cmd1Exec = logIndexOf('[exec-tags-1::cmd1] Executing ...');
                        const file1Cmd1Done = logIndexOf('[exec-tags-1::cmd1] Completed with code 0');
                        const file1Cmd1Cmd = logIndexOf(`[exec-tags-1::cmd1] node ${script1}`);
                        const file1Cmd1Out = logIndexOf('out1\n');
                        const file2Cmd1Exec = logIndexOf('[exec-tags-2::cmd1] Executing ...');
                        const file2Cmd1Done = logIndexOf('[exec-tags-2::cmd1] Completed with code 0');
                        const file2Cmd1Cmd = logIndexOf(`[exec-tags-2::cmd1] node ${script2}`);
                        const file2Cmd1Out = logIndexOf('out2\n');
                        const file2Cmd2Exec = logIndexOf('[exec-tags-2::cmd2] Executing ...');
                        const file2Cmd2Done = logIndexOf('[exec-tags-2::cmd2] Completed with code 0');
                        const file2Cmd2Cmd = logIndexOf(`[exec-tags-2::cmd2] echo world`);
                        const file2Cmd2Out = logIndexOf('world\r\n');
                        const file2CmdAExec = logIndexOf('[exec-tags-2::cmdA] Executing ...');
                        const file2CmdADone = logIndexOf('[exec-tags-2::cmdA] Completed with code 0');
                        const file2CmdACmd = logIndexOf(`[exec-tags-2::cmdA] echo hello A`);
                        const file2CmdAOut = logIndexOf('hello A\r\n');
                        const chunk2 = logIndexOf('chunk 2...');
                        const file1CmdAExec = logIndexOf('[exec-tags-1::cmdA] Executing ...');
                        const file1CmdADone = logIndexOf('[exec-tags-1::cmdA] Completed with code 0');
                        const file1CmdACmd = logIndexOf(`[exec-tags-1::cmdA] echo hello`);
                        const file1CmdAOut = logIndexOf('hello\r\n');
                        const file2CmdBExec = logIndexOf('[exec-tags-2::cmdB] Executing ...');
                        const file2CmdBDone = logIndexOf('[exec-tags-2::cmdB] Completed with code 0');
                        const file2CmdBCmd = logIndexOf(`[exec-tags-2::cmdB] echo hello B`);
                        const file2CmdBOut = logIndexOf('hello B\r\n');
                        const file2CmdCExec = logIndexOf('[exec-tags-2::cmdC] Executing ...');
                        const file2CmdCDone = logIndexOf('[exec-tags-2::cmdC] Completed with code 0');
                        const file2CmdCCmd = logIndexOf(`[exec-tags-2::cmdC] echo hello C`);
                        const file2CmdCOut = logIndexOf('hello C\r\n');
                        const chunk3 = logIndexOf('chunk 3...');
                        const file2CmdDExec = logIndexOf('[exec-tags-2::cmdD] Executing ...');
                        const file2CmdDDone = logIndexOf('[exec-tags-2::cmdD] Completed with code 0');
                        const file2CmdDCmd = logIndexOf(`[exec-tags-2::cmdD] echo hello D`);
                        const file2CmdDOut = logIndexOf('hello D\r\n');

                        expect(chunk1).to.be.lessThan(file1Cmd1Exec);
                        expect(chunk1).to.be.lessThan(file2Cmd1Exec);
                        expect(chunk1).to.be.lessThan(file2Cmd2Exec);
                        expect(chunk1).to.be.lessThan(file2CmdAExec);
                        expect(file1Cmd1Exec).to.be.lessThan(file1Cmd1Done);
                        expect(file1Cmd1Done).to.be.lessThan(file1Cmd1Cmd);
                        expect(file1Cmd1Cmd).to.be.lessThan(file1Cmd1Out);
                        expect(file2Cmd1Exec).to.be.lessThan(file2Cmd1Done);
                        expect(file2Cmd1Done).to.be.lessThan(file2Cmd1Cmd);
                        expect(file2Cmd1Cmd).to.be.lessThan(file2Cmd1Out);
                        expect(file2Cmd2Exec).to.be.lessThan(file2Cmd2Done);
                        expect(file2Cmd2Done).to.be.lessThan(file2Cmd2Cmd);
                        expect(file2Cmd2Cmd).to.be.lessThan(file2Cmd2Out);
                        expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
                        expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
                        expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
                        expect(file1Cmd1Done).to.be.lessThan(chunk2);
                        expect(file2Cmd1Done).to.be.lessThan(chunk2);
                        expect(file2Cmd2Done).to.be.lessThan(chunk2);
                        expect(file2CmdADone).to.be.lessThan(chunk2);
                        expect(chunk2).to.be.lessThan(file1CmdAExec);
                        expect(chunk2).to.be.lessThan(file2CmdBExec);
                        expect(chunk2).to.be.lessThan(file2CmdCExec);
                        expect(file1CmdAExec).to.be.lessThan(file1CmdADone);
                        expect(file1CmdADone).to.be.lessThan(file1CmdACmd);
                        expect(file1CmdACmd).to.be.lessThan(file1CmdAOut);
                        expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
                        expect(file2CmdBDone).to.be.lessThan(file2CmdBCmd);
                        expect(file2CmdBCmd).to.be.lessThan(file2CmdBOut);
                        expect(file2CmdCExec).to.be.lessThan(file2CmdCDone);
                        expect(file2CmdCDone).to.be.lessThan(file2CmdCCmd);
                        expect(file2CmdCCmd).to.be.lessThan(file2CmdCOut);
                        expect(file1CmdADone).to.be.lessThan(chunk3);
                        expect(file2CmdBDone).to.be.lessThan(chunk3);
                        expect(file2CmdCDone).to.be.lessThan(chunk3);
                        expect(chunk3).to.be.lessThan(file2CmdDExec);
                        expect(file2CmdDExec).to.be.lessThan(file2CmdDDone);
                        expect(file2CmdDDone).to.be.lessThan(file2CmdDCmd);
                        expect(file2CmdDCmd).to.be.lessThan(file2CmdDOut);
                    });

                    it('execute successfully when filter by tag', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello A', undefined, ['tag1'], ['cmd1']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, ['tag1'], false);

                        const chunk1 = logIndexOf('chunk 1...');
                        const file1Cmd1Exec = logIndexOf('[exec-tags-1::cmd1] Executing ...');
                        const file1Cmd1Done = logIndexOf('[exec-tags-1::cmd1] Completed with code 0');
                        const file1Cmd1Cmd = logIndexOf(`[exec-tags-1::cmd1] node ${script1}`);
                        const file1Cmd1Out = logIndexOf('out1\n');
                        const file2Cmd1Exec = logIndexOf('[exec-tags-2::cmd1] Executing ...');
                        const file2Cmd1Done = logIndexOf('[exec-tags-2::cmd1] Completed with code 0');
                        const file2Cmd1Cmd = logIndexOf(`[exec-tags-2::cmd1] node ${script2}`);
                        const file2Cmd1Out = logIndexOf('out2\n');
                        const chunk2 = logIndexOf('chunk 2...');
                        const file2CmdAExec = logIndexOf('[exec-tags-2::cmdA] Executing ...');
                        const file2CmdADone = logIndexOf('[exec-tags-2::cmdA] Completed with code 0');
                        const file2CmdACmd = logIndexOf(`[exec-tags-2::cmdA] echo hello A`);
                        const file2CmdAOut = logIndexOf('hello A\r\n');

                        expect(chunk1).to.be.lessThan(file1Cmd1Exec);
                        expect(chunk1).to.be.lessThan(file2Cmd1Exec);
                        expect(file1Cmd1Exec).to.be.lessThan(file1Cmd1Done);
                        expect(file1Cmd1Done).to.be.lessThan(file1Cmd1Cmd);
                        expect(file1Cmd1Cmd).to.be.lessThan(file1Cmd1Out);
                        expect(file2Cmd1Exec).to.be.lessThan(file2Cmd1Done);
                        expect(file2Cmd1Done).to.be.lessThan(file2Cmd1Cmd);
                        expect(file2Cmd1Cmd).to.be.lessThan(file2Cmd1Out);
                        expect(file1Cmd1Out).to.be.lessThan(chunk2);
                        expect(file2Cmd1Out).to.be.lessThan(chunk2);
                        expect(chunk2).to.be.lessThan(file2CmdAExec);
                        expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
                        expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
                        expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);

                        sinon.assert.neverCalledWith(consoleStub, '[exec-tags-2::cmd2] Executing ...');
                        sinon.assert.neverCalledWith(consoleStub, '[exec-tags-2::cmd2] Completed with code 0');
                        sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmd2] echo world`);
                        sinon.assert.neverCalledWith(consoleStub, 'world\r\n');
                        sinon.assert.neverCalledWith(consoleStub, '[exec-tags-1::cmdA] Executing ...');
                        sinon.assert.neverCalledWith(consoleStub, '[exec-tags-1::cmdA] Completed with code 0');
                        sinon.assert.neverCalledWith(consoleStub, `[exec-tags-1::cmdA] echo hello`);
                        sinon.assert.neverCalledWith(consoleStub, 'hello\r\n');
                    });

                    it('execute successfully when filter by tag case 2', async () => {
                        await runToAddSnipCommand(contexts, file2, 'cmdA', 'echo hello A', undefined, ['tag1'], ['cmd1']);
                        await runToAddSnipCommand(contexts, file2, 'cmdB', 'echo hello B', undefined, ['tag1'], ['cmd1']);
                        await runToExecuteCommands(contextsToRun, undefined, undefined, ['tag1'], false);

                        const chunk1 = logIndexOf('chunk 1...');
                        const file1Cmd1Exec = logIndexOf('[exec-tags-1::cmd1] Executing ...');
                        const file1Cmd1Done = logIndexOf('[exec-tags-1::cmd1] Completed with code 0');
                        const file1Cmd1Cmd = logIndexOf(`[exec-tags-1::cmd1] node ${script1}`);
                        const file1Cmd1Out = logIndexOf('out1\n');
                        const file2Cmd1Exec = logIndexOf('[exec-tags-2::cmd1] Executing ...');
                        const file2Cmd1Done = logIndexOf('[exec-tags-2::cmd1] Completed with code 0');
                        const file2Cmd1Cmd = logIndexOf(`[exec-tags-2::cmd1] node ${script2}`);
                        const file2Cmd1Out = logIndexOf('out2\n');
                        const chunk2 = logIndexOf('chunk 2...');
                        const file2CmdAExec = logIndexOf('[exec-tags-2::cmdA] Executing ...');
                        const file2CmdADone = logIndexOf('[exec-tags-2::cmdA] Completed with code 0');
                        const file2CmdACmd = logIndexOf(`[exec-tags-2::cmdA] echo hello A`);
                        const file2CmdAOut = logIndexOf('hello A\r\n');
                        const file2CmdBExec = logIndexOf('[exec-tags-2::cmdB] Executing ...');
                        const file2CmdBDone = logIndexOf('[exec-tags-2::cmdB] Completed with code 0');
                        const file2CmdBCmd = logIndexOf(`[exec-tags-2::cmdB] echo hello B`);
                        const file2CmdBOut = logIndexOf('hello B\r\n');

                        expect(chunk1).to.be.lessThan(file1Cmd1Exec);
                        expect(chunk1).to.be.lessThan(file2Cmd1Exec);
                        expect(file1Cmd1Exec).to.be.lessThan(file1Cmd1Done);
                        expect(file1Cmd1Done).to.be.lessThan(file1Cmd1Cmd);
                        expect(file1Cmd1Cmd).to.be.lessThan(file1Cmd1Out);
                        expect(file2Cmd1Exec).to.be.lessThan(file2Cmd1Done);
                        expect(file2Cmd1Done).to.be.lessThan(file2Cmd1Cmd);
                        expect(file2Cmd1Cmd).to.be.lessThan(file2Cmd1Out);
                        expect(file1Cmd1Out).to.be.lessThan(chunk2);
                        expect(file2Cmd1Out).to.be.lessThan(chunk2);
                        expect(chunk2).to.be.lessThan(file2CmdAExec);
                        expect(chunk2).to.be.lessThan(file2CmdBExec);
                        expect(file2CmdAExec).to.be.lessThan(file2CmdADone);
                        expect(file2CmdADone).to.be.lessThan(file2CmdACmd);
                        expect(file2CmdACmd).to.be.lessThan(file2CmdAOut);
                        expect(file2CmdBExec).to.be.lessThan(file2CmdBDone);
                        expect(file2CmdBDone).to.be.lessThan(file2CmdBCmd);
                        expect(file2CmdBCmd).to.be.lessThan(file2CmdBOut);

                        sinon.assert.neverCalledWith(consoleStub, '[exec-tags-2::cmd2] Executing ...');
                        sinon.assert.neverCalledWith(consoleStub, '[exec-tags-2::cmd2] Completed with code 0');
                        sinon.assert.neverCalledWith(consoleStub, `[exec-tags-2::cmd2] echo world`);
                        sinon.assert.neverCalledWith(consoleStub, 'world\r\n');
                        sinon.assert.neverCalledWith(consoleStub, '[exec-tags-1::cmdA] Executing ...');
                        sinon.assert.neverCalledWith(consoleStub, '[exec-tags-1::cmdA] Completed with code 0');
                        sinon.assert.neverCalledWith(consoleStub, `[exec-tags-1::cmdA] echo hello`);
                        sinon.assert.neverCalledWith(consoleStub, 'hello\r\n');
                    });
                });

            });

            describe('no executable file exist', () => {
                it('should do nothing when no snip files exist', async () => {
                    await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, false);
                    sinon.assert.notCalled(consoleStub);
                    sinon.assert.notCalled(consoleErrorStub);
                });

                it('should do nothing when no snip files exist but other file exists', async () => {
                    await writeFile('invalid.txt', contexts.workingDir, 'content');
                    await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, false);
                    sinon.assert.notCalled(consoleStub);
                    sinon.assert.notCalled(consoleErrorStub);
                });
            });

            describe('no executable command exist', () => {
                it('should do nothing when the named file has no command', async () => {
                    await runToCreateSnipFile(contexts, 'no-command.snip');

                    await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, false);
                    sinon.assert.notCalled(consoleStub);
                    sinon.assert.notCalled(consoleErrorStub);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, 'test-file.snip', undefined, undefined, true);
                        sinon.assert.calledWith(consoleStub, `command 'A' has invalid dependencies: C, D`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, 'test-file.snip', 'A', undefined, true);
                        sinon.assert.calledWith(consoleStub, `command 'A' has invalid dependencies: B`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, 'test-file.snip', undefined, ['tag1'], true);
                        sinon.assert.calledWith(consoleStub, `command 'A' has invalid dependencies: B`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, 'test-file.snip', 'A', ['tag1'], true);
                        sinon.assert.calledWith(consoleStub, `command 'A' has invalid dependencies: B, C`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, 'test-file.snip', undefined, undefined, true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, 'test-file.snip', 'A', undefined, true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, 'test-file.snip', undefined, ['tag1'], true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, 'test-file.snip', 'A', ['tag1'], true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, 'test-file.snip', undefined, undefined, true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, 'test-file.snip', undefined, ['tag1'], true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, 'test-file.snip', undefined, undefined, true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, 'test-file.snip', undefined, ['tag1'], true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
                    });

                    it('should abort because in case of multiple dependsOn when no arguement is passed',  async () => {
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, 'test-file.snip', undefined, undefined, true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
                    });

                    it('should abort because in case of multiple dependsOn when tag arguement is passed',  async () => {
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, 'test-file.snip', undefined, ['tag1'], true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
                    });

                    it('should abort because in case of multiple dependsOn(case2) when no arguement is passed',  async () => {
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, 'test-file.snip', undefined, undefined, true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
                    });

                    it('should abort because in case of multiple dependsOn(case2) when tag arguement is passed',  async () => {
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, 'test-file.snip', undefined, undefined, true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
                    });
                });

                describe('dependency is broken when filter by name or tag', () => {
                    const fileName = 'exec-dry.snip';

                    beforeEach(async () => {
                        await runToCreateSnipFile(contexts, fileName);
                        await runToAddSnipCommand(contexts, fileName, 'cmd1', 'echo hello', 'A', ['tag2']);
                        await runToAddSnipCommand(contexts, fileName, 'cmd2', 'echo world', 'B', ['tag1', 'tag2'], ['cmd1']);

                        await runToCreateSnipFile(contexts, 'no-command.snip');
                    });

                    it('name', async () => {
                        await runToExecuteCommands(contextsToRun, fileName, 'cmd2', undefined, true);
                        sinon.assert.calledWith(consoleStub, `command 'cmd2' has invalid dependencies: cmd1`);
                    });

                    it('tag', async () => {
                        await runToExecuteCommands(contextsToRun, fileName, undefined, ['tag1'], true);
                        sinon.assert.calledWith(consoleStub, `command 'cmd2' has invalid dependencies: cmd1`);
                    });

                    it('name & tag', async () => {
                        await runToExecuteCommands(contextsToRun, fileName, 'cmd2', ['tag1'], true);
                        sinon.assert.calledWith(consoleStub, `command 'cmd2' has invalid dependencies: cmd1`);
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
                    await writeFile('valid-file.snip', contexts.workingDir, validContent);
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
                    
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);
                        sinon.assert.calledWith(consoleStub, `command 'A' has invalid dependencies: C, D`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, undefined, 'A', undefined, true);
                        sinon.assert.calledWith(consoleStub, `command 'A' has invalid dependencies: B`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, undefined, undefined, ['tag1'], true);
                        sinon.assert.calledWith(consoleStub, `command 'A' has invalid dependencies: B`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, undefined, 'A', ['tag1'], true);
                        sinon.assert.calledWith(consoleStub, `command 'A' has invalid dependencies: B, C`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, undefined, 'A', undefined, true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, undefined, undefined, ['tag1'], true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, undefined, 'A', ['tag1'], true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, undefined, undefined, ['tag1'], true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, undefined, undefined, ['tag1'], true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, undefined, undefined, ['tag1'], true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('test-file.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);
                        sinon.assert.calledWith(consoleStub, `Circular dependency detected.`);
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
                        await writeFile('file1.snip', contexts.workingDir, content);

                        await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);
                        sinon.assert.calledWith(consoleStub, `[valid-file::A] Executing ...`);
                        sinon.assert.calledWith(consoleStub, `[valid-file::A] Completed with code 0`);
                        sinon.assert.calledWith(consoleStub, `[valid-file::B] Executing ...`);
                        sinon.assert.calledWith(consoleStub, `[valid-file::B] Completed with code 0`);
                        sinon.assert.calledWith(consoleStub, `[file1::A] Executing ...`);
                        sinon.assert.calledWith(consoleStub, `[file1::A] Completed with code 0`);
                        sinon.assert.calledWith(consoleStub, `[file1::B] Executing ...`);
                        sinon.assert.calledWith(consoleStub, `[file1::B] Completed with code 0`);
                        
                    });
                });

                describe('dependency is broken when filter by name or tag', () => {
                    const fileName = 'exec-dry.snip';

                    beforeEach(async () => {
                        await runToCreateSnipFile(contexts, fileName);
                        await runToAddSnipCommand(contexts, fileName, 'cmd1', 'echo hello', 'A', ['tag2']);
                        await runToAddSnipCommand(contexts, fileName, 'cmd2', 'echo world', 'B', ['tag1', 'tag2'], ['cmd1']);

                        await runToCreateSnipFile(contexts, 'no-command.snip');
                    });

                    it('name', async () => {
                        await runToExecuteCommands(contextsToRun, undefined, 'cmd2', undefined, true);
                        sinon.assert.calledWith(consoleStub, `command 'cmd2' has invalid dependencies: cmd1`);
                    });

                    it('tag', async () => {
                        await runToExecuteCommands(contextsToRun, undefined, undefined, ['tag1'], true);
                        sinon.assert.calledWith(consoleStub, `command 'cmd2' has invalid dependencies: cmd1`);
                    });

                    it('name & tag', async () => {
                        await runToExecuteCommands(contextsToRun, undefined, 'cmd2', ['tag1'], true);
                        sinon.assert.calledWith(consoleStub, `command 'cmd2' has invalid dependencies: cmd1`);
                    });
                });
            });
        });

        describe('error handling', () => {
            const createContextsToRun = (logDetail: logDetail) => {
                return {
                    workingDir: TEST_WORKING_DIR,
                    logger: new Logger(logDetail),
                    commandConfig: {
                        encoding: 'utf-8'
                    }
                } as Contexts;
            }

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read file: ${TEST_WORKING_DIR}/empty-desc.snip`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when file is provided and logDetail is ${value} and read fails`, async () => {
                    const cause = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'readFile').rejects(cause);

                    contextsToRun = createContextsToRun(value as logDetail);
                    await runToExecuteCommands(contextsToRun, 'empty-desc.snip', undefined, undefined, true);
                    assertion(cause);
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read file: ${TEST_WORKING_DIR}/empty-desc.snip`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when file is not provided and logDetail is ${value} and read fails`, async () => {
                    const file1 = 'empty-desc.snip';
                    await runToCreateSnipFile(contexts, file1);
                    await runToAddSnipCommand(contexts, file1, 'cmd1', 'echo one', 'A', ['tag1']);

                    const cause = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'readFile').rejects(cause);

                    contextsToRun = createContextsToRun(value as logDetail);
                    await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);
                    assertion(cause);
                });
            });

            [
                { value: 'verbose', assertion: (e: Error) => {
                    sinon.assert.calledWith(consoleErrorStub, `Something went wrong`);
                    sinon.assert.calledWith(
                        consoleStub, 
                        sinon.match.instanceOf(Error)
                            .and(sinon.match.has('message', `Failed to read directory: ${TEST_WORKING_DIR}`))
                            .and(sinon.match.has('cause', e))
                    );
                }},
                { value: 'normal', assertion: () => sinon.assert.notCalled(consoleStub)},
                { value: undefined, assertion: () => sinon.assert.notCalled(consoleStub)}
            ].forEach(({value, assertion}) => {
                it(`should log error when logDetail is ${value} and read dir fails`, async () => {
                    const cause = new Error('disk full');
                    fsStub = sinon.stub(fs.promises, 'readdir').rejects(cause);

                    contextsToRun = createContextsToRun(value as logDetail);
                    await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, true);
                    assertion(cause);
                });
            });

            [
                { value: 'verbose'}, { value: 'normal'}, { value: undefined }
            ].forEach(({value}) => {
                it(`should abort when the command exit with code other than 0 when logDetail is ${value}`, async () => {
                    const file1 = 'exec-tags-1.snip';
                    const script1 = path.join(contexts.workingDir, 'tmp_exec_tags_1.js');
                    const script2 = path.join(contexts.workingDir, 'tmp_exec_tags_2.js');
                    await runToCreateSnipFile(contextsToRun, file1);
                    await fs.promises.writeFile(script1, "console.error('out1'); process.exit(1);");
                    await runToAddSnipCommand(contexts, file1, 'cmd1', `node ${script1}`, 'A', ['tag1']);
                    await runToCreateSnipFile(contexts, file1);
                    await fs.promises.writeFile(script2, "console.log('out2'); process.exit(0);");
                    await runToAddSnipCommand(contexts, file1, 'cmd1', `node ${script2}`, 'X', ['tag1', 'tag3'], ['cmd1']);

                    contextsToRun = createContextsToRun(value as logDetail);
                    await runToExecuteCommands(contextsToRun, undefined, undefined, undefined, false);

                    sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] Executing ...`);
                    sinon.assert.calledWith(consoleErrorStub, `[exec-tags-1::cmd1] Completed with code 1`);
                    sinon.assert.calledWith(consoleStub, `[exec-tags-1::cmd1] node ${script1}`);
                    sinon.assert.calledWith(consoleErrorStub, `out1\n`);
                    sinon.assert.calledWith(consoleStub, `command 'cmd1' failed with code 1`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-tags-1::cmd2] Executing ...`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-tags-1::cmd2] Completed with code 0`);
                    sinon.assert.neverCalledWith(consoleStub, `[exec-tags-1::cmd2] node ${script2}`);
                    sinon.assert.neverCalledWith(consoleStub, `out2\n`);
                });
            });
        });
    });

    describe('runToShowConfig', () => {
        const testLocalConfig: IConfig = {
            command: {
                run: {
                    encoding: 'cp932'
                }
            },
            working_dir: './local'
        } as IConfig;

        const testGlobalConfig: IConfig = {
            command: {
                run: {
                    encoding: 'utf-16'
                }
            }
        } as IConfig;

        let testConfig: Config;

        describe('local and global', () => {

            beforeEach(() => {
                testConfig = new Config(testLocalConfig, testGlobalConfig);
            })

            it('current', async () => {
                await runToShowConfig(contexts, testConfig, 'current');
                sinon.assert.calledWith(consoleStub, 
`command:
  run:
    encoding: cp932
working_dir: ./local
`);

            });
            
            it('global', async () => {
                await runToShowConfig(contexts, testConfig, 'global');
                sinon.assert.calledWith(consoleStub, 
`command:
  run:
    encoding: utf-16
`);
            });

            it('local', async () => {
                await runToShowConfig(contexts, testConfig, 'local');
                sinon.assert.calledWith(consoleStub, 
`command:
  run:
    encoding: cp932
working_dir: ./local
`);
            });

            it('default', async () => {
                await runToShowConfig(contexts, testConfig, 'default');
                sinon.assert.calledWith(consoleStub, 
`command:
  run:
    encoding: utf-8
working_dir: ${process.cwd()}
`);
            });
        });

        describe('no local and global', () => {
            beforeEach(() => {
                testConfig = new Config({} as IConfig, testGlobalConfig);
            })

            it('current', async () => {
                await runToShowConfig(contexts, testConfig, 'current');
                sinon.assert.calledWith(consoleStub, 
`command:
  run:
    encoding: utf-16
working_dir: ${process.cwd()}
`);

            });
            
            it('global', async () => {
                await runToShowConfig(contexts, testConfig, 'global');
                sinon.assert.calledWith(consoleStub, 
`command:
  run:
    encoding: utf-16
`);
            });

            it('local', async () => {
                await runToShowConfig(contexts, testConfig, 'local');
                sinon.assert.calledWith(consoleStub, 
`{}
`);
            });

            it('default', async () => {
                await runToShowConfig(contexts, testConfig, 'default');
                sinon.assert.calledWith(consoleStub, 
`command:
  run:
    encoding: utf-8
working_dir: ${process.cwd()}
`);
            });
        });

        describe('local and no global', () => {
            beforeEach(() => {
                testConfig = new Config(testLocalConfig, {} as IConfig);
            })

            it('current', async () => {
                await runToShowConfig(contexts, testConfig, 'current');
                sinon.assert.calledWith(consoleStub, 
`command:
  run:
    encoding: cp932
working_dir: ./local
`);

            });
            
            it('global', async () => {
                await runToShowConfig(contexts, testConfig, 'global');
                sinon.assert.calledWith(consoleStub, 
`{}
`);
            });

            it('local', async () => {
                await runToShowConfig(contexts, testConfig, 'local');
                sinon.assert.calledWith(consoleStub, 
`command:
  run:
    encoding: cp932
working_dir: ./local
`);
            });

            it('default', async () => {
                await runToShowConfig(contexts, testConfig, 'default');
                sinon.assert.calledWith(consoleStub, 
`command:
  run:
    encoding: utf-8
working_dir: ${process.cwd()}
`);
            });
        });

        describe('no local and no global', () => {
            beforeEach(() => {
                testConfig = new Config({} as IConfig, {} as IConfig);
            })

            it('current', async () => {
                await runToShowConfig(contexts, testConfig, 'current');
                sinon.assert.calledWith(consoleStub, 
`command:
  run:
    encoding: utf-8
working_dir: ${process.cwd()}
`);

            });
            
            it('global', async () => {
                await runToShowConfig(contexts, testConfig, 'global');
                sinon.assert.calledWith(consoleStub, 
`{}
`);
            });

            it('local', async () => {
                await runToShowConfig(contexts, testConfig, 'local');
                sinon.assert.calledWith(consoleStub, 
`{}
`);
            });

            it('default', async () => {
                await runToShowConfig(contexts, testConfig, 'default');
                sinon.assert.calledWith(consoleStub, 
`command:
  run:
    encoding: utf-8
working_dir: ${process.cwd()}
`);
            });
        });        
    });
});
