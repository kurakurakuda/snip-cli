import type { PositionalOptions, Options } from "yargs";
import type { Logger } from "./logger.ts";

export interface IArg {
    key: string;
    opt: PositionalOptions;
}

export interface IOption {
    key: string;
    opt: Options
}

export interface Command {
    name: string,
    command: string,
    description: string,
    tags: string[],
    dependsOn: string[]
}

export interface SnipCommand {
    description: string,
    tags: string[],
    commands: Command[]
}

export interface IConfig {
    command: {
        run: {
            encoding: string
        }
    },
    working_dir: string
}

export type Contexts = {
    commandConfig: Record<string, unknown>,
    workingDir: string,
    logger: Logger
}