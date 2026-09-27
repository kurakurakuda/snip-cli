// Node.js起動時に os と process を差し替える
const os = require('os');
const path = require('path');

// os.homedir() を差し替え
const originalHomedir = os.homedir.bind(os);
os.homedir = () => process.env.MOCK_HOME ?? originalHomedir();

// process.cwd() を差し替え
const originalCwd = process.cwd.bind(process);
process.cwd = () => process.env.MOCK_CWD ?? originalCwd();