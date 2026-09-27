import type { IArg, IOption } from "../utils/interfaces.ts";
import yargs from "yargs";

export const arg = (key: string, desc : string): IArg => {
    return {
        key: key,
        opt: {
            type: 'string' as const,
            describe: desc,
            coerce: (value: string) => {
                if (value.length === 0) {
                    throw new Error(`Empty string is not allowed: ${key}`);
                }
                return value;
            }
        }
    }
}

export const option = (key: string, type: "array" | "string" | "boolean",  desc: string, 
                        alias?: string, demandOption?: string ): IOption => {
    return {
        key: key,
        opt: {
            type: type,
            describe: desc,
            alias: alias,
            demandOption: demandOption,
            requiresArg: type === "array" || type === "string"
        }
    }
}

export const commandOption = (desc: string, errorMsg?: string): IOption => option('command', 'string', desc, 'c', errorMsg);
export const descriptionOption = (desc: string): IOption => option('description', 'string', desc, 'd');
export const tagOption = (desc: string): IOption => option('tag', 'array', desc, 't');
export const dependsOnOption = (desc: string): IOption => option('depends-on', 'array', desc, 'p');

export const builder = (yargs: yargs.Argv, args:IArg[], options?: IOption[]) => {
    args.forEach((arg: IArg) => {
        yargs.positional(arg.key, arg.opt);
    });
    options?.forEach((option: IOption) => {
        yargs.option(option.key, option.opt);
    });
    
    const logOption = option('log', 'boolean', 'Output Log');
    yargs.option(logOption.key, logOption.opt);

    yargs.check((args) => {
        const invalidArrayOptions = options?.filter((option: IOption) => 
            option.opt.type !== 'array' && Array.isArray(args[option.key])
        )?? [];
        if (invalidArrayOptions.length > 0) {
            return `A ${invalidArrayOptions[0].key} does not accept multiple values`;
        }

        return true;
    });

    return yargs;
};