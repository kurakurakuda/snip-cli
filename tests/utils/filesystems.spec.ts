import * as sinon from 'sinon';
import { expect, assert } from 'chai';
import * as fs from 'fs';
import { deleteFile, readDir, readFile, renameFile, writeFile } from '../../src/utils/filesystems.ts';
import { cleanupTestFiles, TEST_WORKING_DIR } from './testUtils.ts';

describe('filesystems', () => {
    let consoleStub: sinon.SinonStub;
    let writeStub: sinon.SinonStub;
    
    beforeEach(() => {
        consoleStub = sinon.stub(console, 'error').callsFake(() => {});
    });

    afterEach(async () => {
        consoleStub.resetHistory();
        sinon.restore();
        await cleanupTestFiles();
    });

    it('able to write the file and able to read its file succesfully', async () => {
        await writeFile('out.txt', TEST_WORKING_DIR, 'hello world');
        const result = await readFile('out.txt', TEST_WORKING_DIR);
        expect(result).to.equal('hello world');
    });

    it('able to delete the file succesfully', async () => {
        await writeFile('out.txt', TEST_WORKING_DIR, 'hello world');
        const result = await deleteFile('out.txt', TEST_WORKING_DIR);
        expect(result).to.true;

        const file = await readFile('out.txt', TEST_WORKING_DIR);
        expect(file).to.be.null;
    });

    it('able to rename the file and able to read its file succesfully', async () => {
        await writeFile('out.txt', TEST_WORKING_DIR, 'hello world');
        const result = await renameFile('out.txt', TEST_WORKING_DIR, 'renamed.txt');
        expect(result).to.equal(`${TEST_WORKING_DIR}/renamed.txt`);
        const result2 = await readFile('renamed.txt', TEST_WORKING_DIR);
        expect(result2).to.equal('hello world');

        const file = await readFile('out.txt', TEST_WORKING_DIR);
        expect(file).to.be.null;
    });

    it('able to read file and directories successfully', async () => {
        await writeFile('out.txt', TEST_WORKING_DIR, 'hello world');
        await fs.promises.mkdir(`${TEST_WORKING_DIR}/dir`);
        await fs.promises.mkdir(`${TEST_WORKING_DIR}/dir.snip`);
        await writeFile('out2.txt', `${TEST_WORKING_DIR}/dir`, 'hello world');

        const result = await readDir(TEST_WORKING_DIR);
        expect(result.length).to.equal(3);
        expect(result.filter(r => r.isFile() && r.name === 'out.txt').length).to.equal(1);
        expect(result.filter(r => r.isDirectory() && r.name === 'dir').length).to.equal(1);
        expect(result.filter(r => r.isDirectory() && r.name === 'dir.snip').length).to.equal(1);
    });

    it('returns null when reading the file but does not exist', async () => {
        const result = await readFile('missing.txt', TEST_WORKING_DIR);
        expect(result).to.be.null;
    });

    it('returns empty array when reading the directory but does not exist', async () => {
        const result = await readDir(`${TEST_WORKING_DIR}/missing`);
        expect(result).to.deep.equal([]);
    });

    it('returns null when renaming the file but does not exist', async () => {
        const result = await renameFile('missing.txt', TEST_WORKING_DIR, 'target.txt');
        expect(result).to.be.null;
    });

    it('returns false when the target file to delete does not exist', async () => {
        const result = await deleteFile('missing.txt', TEST_WORKING_DIR);
        expect(result).to.be.false;
    });

    it('logs an error and rethrows when read fails', async () => {
        const error = new Error('disk full');
        sinon.stub(fs.promises, 'readFile').rejects(error);

        try {
            await readFile('bad.txt', TEST_WORKING_DIR);
            assert.fail('Expected readFile to throw');
        } catch (err) {
            expect((err as Error).message).to.equal(`Failed to read file: ${TEST_WORKING_DIR}/bad.txt`);
            expect((err as Error).cause).to.equal(error);
        }
    });

    it('failed when reading the directory having .snip exist', async () => {
        await fs.promises.mkdir(`${TEST_WORKING_DIR}/dir.snip`);
        try {
            await readFile('dir.snip', TEST_WORKING_DIR);
            assert.fail('Expected readFile to throw');
        } catch (err) {
            // Getting exception is as expected.
            expect((err as Error).message).to.equal(`Failed to read file: ${TEST_WORKING_DIR}/dir.snip`);
            expect(((err as Error).cause as NodeJS.ErrnoException).code).to.equal('EISDIR');
        }
    });

    it('logs an error and rethrows when read directory', async () => {
        const error = new Error('disk full');
        writeStub = sinon.stub(fs.promises, 'readdir').rejects(error);

        try {
            await readDir(TEST_WORKING_DIR);
            assert.fail('Expected readFile to throw');
        } catch (err) {
            expect((err as Error).message).to.equal(`Failed to read directory: ${TEST_WORKING_DIR}`);
            expect((err as Error).cause).to.equal(error);
        }
    });

    it('logs an error and rethrows when write fails', async () => {
        const error = new Error('disk full');
        writeStub = sinon.stub(fs.promises, 'writeFile').rejects(error);

        try {
            await writeFile('bad.txt', TEST_WORKING_DIR, 'x');
            assert.fail('Expected writeFile to throw');
        } catch (err) {
            expect((err as Error).message).to.equal(`Failed to save file: ${TEST_WORKING_DIR}/bad.txt`);
            expect((err as Error).cause).to.equal(error);
        }
    });

    it('logs an error and rethrows when unlink fails', async () => {
        const error = new Error('disk full');
        writeStub = sinon.stub(fs.promises, 'unlink').rejects(error);

        try {
            await deleteFile('bad.txt', TEST_WORKING_DIR);
            assert.fail('Expected unlink to throw');
        } catch (err) {
            expect((err as Error).message).to.equal(`Failed to delete file: ${TEST_WORKING_DIR}/bad.txt`);
            expect((err as Error).cause).to.equal(error);
        }
    });

    it('logs an error and rethrows when rename fails', async () => {
        const error = new Error('disk full');
        writeStub = sinon.stub(fs.promises, 'rename').rejects(error);

        try {
            await renameFile('bad.txt', TEST_WORKING_DIR, 'target.txt');
            assert.fail('Expected rename to throw');
        } catch (err) {
            expect((err as Error).message).to.equal(`Failed to rename file: ${TEST_WORKING_DIR}/bad.txt`);
            expect((err as Error).cause).to.equal(error);
        }
    });
});
