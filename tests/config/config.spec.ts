import { expect } from 'chai';
import yaml from 'js-yaml';
import { Config } from '../../src/config/config.ts';
import { IConfig } from '../../src/utils/interfaces.ts';
import * as sinon from 'sinon';
import os from 'os';
import { MOCK_CWD_PATH, MOCK_HOME_PATH, MOCK_NOCONFIG_PATH, __dirname } from '../utils/testUtils.ts';

describe('config', () => {
    const defaultConfig: IConfig = {
        command: { run: { encoding: 'utf-8' } },
        working_dir: process.cwd()
    } as unknown as IConfig;

    const verifyDump = (config: Config, current: IConfig, local:IConfig, global:IConfig) => {
        expect(config.dump('current', 'yml')).to.eql(yaml.dump(current));
        expect(config.dump('current')).to.eql(current);
        expect(config.dump('local', 'yml')).to.eql(yaml.dump(local));
        expect(config.dump('local')).to.eql(local);
        expect(config.dump('global', 'yml')).to.eql(yaml.dump(global));
        expect(config.dump('global')).to.eql(global);
        expect(config.dump('default', 'yml')).to.eql(yaml.dump(defaultConfig));
        expect(config.dump('default')).to.eql(defaultConfig);
    }

    describe('constructor and dump', () => {
        it('local command.run.encoding and working_dir has value and global command.run.encoding has value', () => {
            const local = {
                command: { run: { encoding: 'cp932' } },
                working_dir: './local'
            } as IConfig;
            const global = {
                command: { run: { encoding: 'utf-16' } }
            } as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: 'cp932' } },
                working_dir: './local'
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        it('local command.run.encoding and working_dir are empty string and global command.run.encoding has value', () => {
            const local = {
                command: { run: { encoding: '' } },
                working_dir: ''
            } as IConfig;
            const global = {
                command: { run: { encoding: 'utf-16' } }
            } as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: '' } },
                working_dir: ''
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run.encoding and working_dir are ${value} and global command.run.encoding has value`, () => {
                const local = {
                    command: { run: { encoding: value } },
                    working_dir: value
                } as unknown as IConfig;
                const global = {
                    command: { run: { encoding: 'utf-16' } }
                } as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-16' } },
                    working_dir: process.cwd()
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        it('local command.run is empty object and working_dir has value and global command.run.encoding has value', () => {
            const local = {
                command: { run: {} },
                working_dir: './local'
            } as unknown as IConfig;
            const global = {
                command: { run: { encoding: 'utf-16' } }
            } as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: 'utf-16' } },
                working_dir: './local'
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run is ${value} and working_dir has value and global command.run.encoding has value`, () => {
                const local = {
                    command: { run: value },
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: { run: { encoding: 'utf-16' } }
                } as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-16' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });
        

        it('local command is empty object and working_dir has value and global command.run.encoding has value', () => {
            const local = {
                command: {},
                working_dir: './local'
            } as unknown as IConfig;
            const global = {
                command: { run: { encoding: 'utf-16' } }
            } as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: 'utf-16' } },
                working_dir: './local'
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command is ${value} and working_dir has value and global command.run.encoding has value`, () => {
                const local = {
                    command: value,
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: { run: { encoding: 'utf-16' } }
                } as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-16' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });
        

        it('local config is empty and global command.run.encoding has value', () => {
            const local = {} as unknown as IConfig;
            const global = {
                command: { run: { encoding: 'utf-16' } }
            } as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: 'utf-16' } },
                working_dir: process.cwd()
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        // ------ global command.run.encoding is empty string
        it('local command.run.encoding and working_dir has value and global command.run.encoding is empty string', () => {
            const local = {
                command: { run: { encoding: 'cp932' } },
                working_dir: './local'
            } as IConfig;
            const global = {
                command: { run: { encoding: '' } }
            } as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: 'cp932' } },
                working_dir: './local'
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        it('local command.run.encoding and working_dir are empty string and global command.run.encoding is empty string', () => {
            const local = {
                command: { run: { encoding: '' } },
                working_dir: ''
            } as IConfig;
            const global = {
                command: { run: { encoding: '' } }
            } as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: '' } },
                working_dir: ''
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run.encoding and working_dir are ${value} and global command.run.encoding is empty string`, () => {
                const local = {
                    command: { run: { encoding: value } },
                    working_dir: value
                } as unknown as IConfig;
                const global = {
                    command: { run: { encoding: '' } }
                } as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: '' } },
                    working_dir: process.cwd()
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        it('local command.run is empty object and working_dir has value and global command.run.encoding is empty string', () => {
            const local = {
                command: { run: {} },
                working_dir: './local'
            } as unknown as IConfig;
            const global = {
                command: { run: { encoding: '' } }
            } as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: '' } },
                working_dir: './local'
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run is ${value} and working_dir has value and global command.run.encoding is empty string`, () => {
                const local = {
                    command: { run: value },
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: { run: { encoding: '' } }
                } as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: '' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });
        

        it('local command is empty object and working_dir has value and global command.run.encoding is empty string', () => {
            const local = {
                command: {},
                working_dir: './local'
            } as unknown as IConfig;
            const global = {
                command: { run: { encoding: '' } }
            } as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: '' } },
                working_dir: './local'
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command is ${value} and working_dir has value and global command.run.encoding is empty string`, () => {
                const local = {
                    command: value,
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: { run: { encoding: '' } }
                } as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: '' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        it('local config is empty and global command.run.encoding is empty string', () => {
            const local = {} as unknown as IConfig;
            const global = {
                command: { run: { encoding: '' } }
            } as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: '' } },
                working_dir: process.cwd()
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        // ------ global command.run.encoding is null
        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run.encoding and working_dir has value and global command.run.encoding is ${value}`, () => {
                const local = {
                    command: { run: { encoding: 'cp932' } },
                    working_dir: './local'
                } as IConfig;
                const global = {
                    command: { run: { encoding: value } }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'cp932' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run.encoding and working_dir are empty string and global command.run.encoding is ${value}`, () => {
                const local = {
                    command: { run: { encoding: '' } },
                    working_dir: ''
                } as IConfig;
                const global = {
                    command: { run: { encoding: value } }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: '' } },
                    working_dir: ''
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run.encoding and working_dir are ${value} and global command.run.encoding is ${value}`, () => {
                const local = {
                    command: { run: { encoding: value } },
                    working_dir: null
                } as unknown as IConfig;
                const global = {
                    command: { run: { encoding: value } }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: process.cwd()
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run is empty object and working_dir has value and global command.run.encoding is ${value}`, () => {
                const local = {
                    command: { run: {} },
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: { run: { encoding: value } }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run is ${value} and working_dir has value and global command.run.encoding is ${value}`, () => {
                const local = {
                    command: { run: value },
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: { run: { encoding: value } }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command is empty object and working_dir has value and global command.run.encoding is ${value}`, () => {
                const local = {
                    command: {},
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: { run: { encoding: value } }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command is ${value} and working_dir has value and global command.run.encoding is ${value}`, () => {
                const local = {
                    command: value,
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: { run: { encoding: value } }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local config is empty and global command.run.encoding is ${value}`, () => {
                const local = {} as unknown as IConfig;
                const global = {
                    command: { run: { encoding: value } }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: process.cwd()
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        // ------ global command.run is empty object
        it('local command.run.encoding and working_dir has value and global command.run is empty object', () => {
            const local = {
                command: { run: { encoding: 'cp932' } },
                working_dir: './local'
            } as IConfig;
            const global = {
                command: { run: {} }
            } as unknown as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: 'cp932' } },
                working_dir: './local'
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        it('local command.run.encoding and working_dir are empty string and global command.run is empty object', () => {
            const local = {
                command: { run: { encoding: '' } },
                working_dir: ''
            } as IConfig;
            const global = {
                command: { run: {} }
            } as unknown as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: '' } },
                working_dir: ''
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run.encoding and working_dir are ${value} and global command.run is empty object`, () => {
                const local = {
                    command: { run: { encoding: value } },
                    working_dir: null
                } as unknown as IConfig;
                const global = {
                    command: { run: {} }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: process.cwd()
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        it('local command.run is empty object and working_dir has value and global command.run is empty object', () => {
            const local = {
                command: { run: {} },
                working_dir: './local'
            } as unknown as IConfig;
            const global = {
                command: { run: {} }
            } as unknown as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: 'utf-8' } },
                working_dir: './local'
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run is ${value} and working_dir has value and global command.run is empty object`, () => {
                const local = {
                    command: { run: value },
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: { run: {} }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        it('local command is empty object and working_dir has value and global command.run is empty object', () => {
            const local = {
                command: {},
                working_dir: './local'
            } as unknown as IConfig;
            const global = {
                command: { run: {} }
            } as unknown as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: 'utf-8' } },
                working_dir: './local'
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command is ${value} and working_dir has value and global command.run is empty object`, () => {
                const local = {
                    command: value,
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: { run: {} }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        it('local config is empty and global command.run is empty object', () => {
            const local = {} as unknown as IConfig;
            const global = {
                command: { run: {} }
            } as unknown as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: 'utf-8' } },
                working_dir: process.cwd()
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        // ------ global command.run is null
        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run.encoding and working_dir has value and global command.run is ${value}`, () => {
                const local = {
                    command: { run: { encoding: 'cp932' } },
                    working_dir: './local'
                } as IConfig;
                const global = {
                    command: { run: value }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'cp932' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run.encoding and working_dir are empty string and global command.run is ${value}`, () => {
                const local = {
                    command: { run: { encoding: '' } },
                    working_dir: ''
                } as IConfig;
                const global = {
                    command: { run: value }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: '' } },
                    working_dir: ''
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run.encoding and working_dir are ${value} and global command.run is ${value}`, () => {
                const local = {
                    command: { run: { encoding: value } },
                    working_dir: value
                } as unknown as IConfig;
                const global = {
                    command: { run: value }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: process.cwd()
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run is empty object and working_dir has value and global command.run is ${value}`, () => {
                const local = {
                    command: { run: {} },
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: { run: value }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run is ${value} and working_dir has value and global command.run is ${value}`, () => {
                const local = {
                    command: { run: value },
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: { run: value }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command is empty object and working_dir has value and global command.run is ${value}`, () => {
                const local = {
                    command: {},
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: { run: value }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command is ${value} and working_dir has value and global command.run is ${value}`, () => {
                const local = {
                    command: value,
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: { run: value }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local config is empty and global command.run is ${value}`, () => {
                const local = {} as unknown as IConfig;
                const global = {
                    command: { run: value }
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: process.cwd()
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        // ------ global command is empty object
        it('local command.run.encoding and working_dir has value and global command is empty object', () => {
            const local = {
                command: { run: { encoding: 'cp932' } },
                working_dir: './local'
            } as IConfig;
            const global = {
                command: {}
            } as unknown as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: 'cp932' } },
                working_dir: './local'
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        it('local command.run.encoding and working_dir are empty string and global command is empty object', () => {
            const local = {
                command: { run: { encoding: '' } },
                working_dir: ''
            } as IConfig;
            const global = {
                command: {}
            } as unknown as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: '' } },
                working_dir: ''
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run.encoding and working_dir are ${value} and global command is empty object`, () => {
                const local = {
                    command: { run: { encoding: value } },
                    working_dir: value
                } as unknown as IConfig;
                const global = {
                    command: {}
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: process.cwd()
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        it('local command.run is empty object and working_dir has value and global command is empty object', () => {
            const local = {
                command: { run: {} },
                working_dir: './local'
            } as unknown as IConfig;
            const global = {
                command: {}
            } as unknown as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: 'utf-8' } },
                working_dir: './local'
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run is ${value} and working_dir has value and global command is empty object`, () => {
                const local = {
                    command: { run: value },
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: {}
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        it('local command is empty object and working_dir has value and global command is empty object', () => {
            const local = {
                command: {},
                working_dir: './local'
            } as unknown as IConfig;
            const global = {
                command: {}
            } as unknown as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: 'utf-8' } },
                working_dir: './local'
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command is ${value} and working_dir has value and global command is empty object`, () => {
                const local = {
                    command: value,
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: {}
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        it('local config is empty and global command is empty object', () => {
            const local = {} as unknown as IConfig;
            const global = {
                command: {}
            } as unknown as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: 'utf-8' } },
                working_dir: process.cwd()
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        // ------ global command is null
        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run.encoding and working_dir has value and global command is ${value}`, () => {
                const local = {
                    command: { run: { encoding: 'cp932' } },
                    working_dir: './local'
                } as IConfig;
                const global = {
                    command: value
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'cp932' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run.encoding and working_dir are empty string and global command is ${value}`, () => {
                const local = {
                    command: { run: { encoding: '' } },
                    working_dir: ''
                } as IConfig;
                const global = {
                    command: value
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: '' } },
                    working_dir: ''
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run.encoding and working_dir are ${value} and global command is ${value}`, () => {
                const local = {
                    command: { run: { encoding: value } },
                    working_dir: value
                } as unknown as IConfig;
                const global = {
                    command: value
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: process.cwd()
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run is empty object and working_dir has value and global command is ${value}`, () => {
                const local = {
                    command: { run: {} },
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: value
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run is ${value} and working_dir has value and global command is ${value}`, () => {
                const local = {
                    command: { run: value },
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: value
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command is empty object and working_dir has value and global command is ${value}`, () => {
                const local = {
                    command: {},
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: value
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command is ${value} and working_dir has value and global command is ${value}`, () => {
                const local = {
                    command: value,
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {
                    command: value
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local config is empty and global command is ${value}`, () => {
                const local = {} as unknown as IConfig;
                const global = {
                    command: value
                } as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: process.cwd()
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        // ------ global config is empty
        it('local command.run.encoding and working_dir has value and global config is empty', () => {
            const local = {
                command: { run: { encoding: 'cp932' } },
                working_dir: './local'
            } as IConfig;
            const global = {} as unknown as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: 'cp932' } },
                working_dir: './local'
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        it('local command.run.encoding and working_dir are empty string and global config is empty', () => {
            const local = {
                command: { run: { encoding: '' } },
                working_dir: ''
            } as IConfig;
            const global = {} as unknown as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: '' } },
                working_dir: ''
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run.encoding and working_dir are ${value} and global config is empty`, () => {
                const local = {
                    command: { run: { encoding: value } },
                    working_dir: value
                } as unknown as IConfig;
                const global = {} as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: process.cwd()
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        it('local command.run is empty object and working_dir has value and global config is empty', () => {
            const local = {
                command: { run: {} },
                working_dir: './local'
            } as unknown as IConfig;
            const global = {} as unknown as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: 'utf-8' } },
                working_dir: './local'
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command.run is ${value} and working_dir has value and global config is empty`, () => {
                const local = {
                    command: { run: value },
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {} as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        it('local command is empty object and working_dir has value and global config is empty', () => {
            const local = {
                command: {},
                working_dir: './local'
            } as unknown as IConfig;
            const global = {} as unknown as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: 'utf-8' } },
                working_dir: './local'
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });

        [
            {value: null}, {value: undefined}
        ].forEach(({value}) => {
            it(`local command is ${value} and working_dir has value and global config is empty`, () => {
                const local = {
                    command: value,
                    working_dir: './local'
                } as unknown as IConfig;
                const global = {} as unknown as IConfig;

                const config = new Config(local, global);
                const currentExpect = {
                    command: { run: { encoding: 'utf-8' } },
                    working_dir: './local'
                } as IConfig;

                verifyDump(config, currentExpect, local, global);
            });
        });

        it('local config is empty and global config is empty', () => {
            const local = {} as unknown as IConfig;
            const global = {} as unknown as IConfig;

            const config = new Config(local, global);
            const currentExpect = {
                command: { run: { encoding: 'utf-8' } },
                working_dir: process.cwd()
            } as IConfig;

            verifyDump(config, currentExpect, local, global);
        });
    });

    describe('load', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('local config exists and global config exists', async () => {
            const mockProcess = sinon.stub(process, 'cwd').returns(MOCK_CWD_PATH);
            const mockOs = sinon.stub(os, 'homedir').resolves(MOCK_HOME_PATH);

            const local = {
                command: { run: { encoding: 'cp932' } },
                working_dir: '../../../samples/tests'
            } as IConfig;
            const global = {
                command: { run: { encoding: 'utf-16' } }
            } as IConfig;
            const currentExpect = {
                command: { run: { encoding: 'cp932' } },
                working_dir: '../../../samples/tests'
            } as IConfig;

            const result = await Config.load();

            verifyDump(result, currentExpect, local, global);
        });

        it('no local config exists and global config exists', async () => {
            const mockProcess = sinon.stub(process, 'cwd').returns(MOCK_NOCONFIG_PATH);
            const mockOs = sinon.stub(os, 'homedir').resolves(MOCK_HOME_PATH);

            const global = {
                command: { run: { encoding: 'utf-16' } }
            } as IConfig;
            const currentExpect = {
                command: { run: { encoding: 'utf-16' } },
                working_dir: __dirname
            } as IConfig;

            const result = await Config.load();

            verifyDump(result, currentExpect, {} as IConfig, global);
        });

        it('local config exists and no global config exists', async () => {
            const mockProcess = sinon.stub(process, 'cwd').returns(MOCK_CWD_PATH);
            const mockOs = sinon.stub(os, 'homedir').resolves(MOCK_NOCONFIG_PATH);

            const local = {
                command: { run: { encoding: 'cp932' } },
                working_dir: '../../../samples/tests'
            } as IConfig;
            const currentExpect = {
                command: { run: { encoding: 'cp932' } },
                working_dir: '../../../samples/tests'
            } as IConfig;

            const result = await Config.load();

            verifyDump(result, currentExpect, local, {} as IConfig);
        });

        it('no local config exists and no global config exists', async () => {
            const mockProcess = sinon.stub(process, 'cwd').returns(MOCK_NOCONFIG_PATH);
            const mockOs = sinon.stub(os, 'homedir').resolves(MOCK_NOCONFIG_PATH);

            const currentExpect = {
                command: { run: { encoding: 'utf-8' } },
                working_dir: __dirname
            } as IConfig;

            const result = await Config.load();

            verifyDump(result, currentExpect, {} as IConfig, {} as IConfig);
        });
    });
});