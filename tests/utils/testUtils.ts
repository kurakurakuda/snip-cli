import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
// Get the absolute path to the project root directory
export const __dirname = path.resolve(dirname(__filename), '../../');

export const CLI_PATH = path.resolve(__dirname, './dist/index.js'); // CLIファイルへのパスを調整してください
export const TEST_WORKING_DIR = path.resolve(__dirname, './samples/tests');

export const HOOK_MODULE_PATH = path.resolve(__dirname, './tests/utils/mock-hook.cjs');
export const MOCK_HOME_PATH =path.resolve(__dirname, './tests/resources/global');
export const MOCK_CWD_PATH = path.resolve(__dirname, './tests/resources/local');
export const MOCK_NOCONFIG_PATH = path.resolve(__dirname, '../tests/resources');

export const cleanupTestFiles = async () => {
    const entries = await fs.readdir(TEST_WORKING_DIR, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(TEST_WORKING_DIR, entry.name);
        try {
            await fs.rm(fullPath, { recursive: true, force: true });
        } catch (e) {
            // 
        }
    }
}