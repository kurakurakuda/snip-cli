import os from 'os';
import yaml from 'js-yaml';
import { readFile } from "../utils/filesystems.ts";
import type { IConfig } from '../utils/interfaces.ts';

export type ConfigScope = 'global' | 'local' | 'default' | 'current';

export class Config {
    public readonly current: IConfig;

    private readonly localConfig: IConfig;
    private readonly globalConfig: IConfig;
    private static readonly DEFAULT_CONFIG: IConfig = {
        command: {
            run: {
                encoding: 'utf-8'
            }
        },
        working_dir: process.cwd()
    }

    public constructor(localConfig: IConfig, globalConfig: IConfig) {
        this.localConfig = localConfig;
        this.globalConfig = globalConfig;

        const current = {};
        [Config.DEFAULT_CONFIG, globalConfig, localConfig].forEach(c => this.deepCopyAndMerge(current, c));
        this.current = current as unknown as IConfig;
    }

    public static async load(): Promise<Config> {
        const cwd = process.cwd();
        const rootDir = await os.homedir();
        const localConfig = await this.loadYml(cwd);
        const globalConfig = await this.loadYml(rootDir);
        return new Config(localConfig, globalConfig);
    }

    public dump(scope: ConfigScope, format?: 'yml') {
        const config = {
            global: this.globalConfig,
            local: this.localConfig,
            default: Config.DEFAULT_CONFIG,
            current: this.current
        }[scope];
        return this.getConfigWithFormat(config, format);
    }

    private static async loadYml(dir: string): Promise<IConfig>  {
        const yml = await readFile('.snipconfig.yml', dir);
        return ( yml ? yaml.load(yml) : {} ) as IConfig ;
    }

    private deepCopyAndMerge(target: Record<string, any>, source: Record<string, any>) {
        Object.keys(source).forEach(k => {
            if (this.isRecord(source[k])) {
                // 上書きを前提とする
                if (!this.isRecord(target[k])) {
                    target[k] = {};
                }
                this.deepCopyAndMerge(target[k], source[k]);
            } else {
                if (source[k] !== null && source[k] !== undefined) {
                    target[k] = source[k];
                }
            }
        });
    }

    private isRecord(obj: any) {
        return obj && typeof obj === "object" && !Array.isArray(obj);
    }

    private getConfigWithFormat(config: any, format?: 'yml'): IConfig | string {
        switch (format) {
            case 'yml':
                return yaml.dump(config);
            default:
                return config;
        }
    }
}