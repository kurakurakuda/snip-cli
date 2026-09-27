import path from "path";
import { spawn } from "child_process";
import { snipToJson } from "../reader/visitor.ts";
import { deleteFile, readDir, readFile, renameFile, writeFile } from "../utils/filesystems.ts";
import type { Command, Contexts, SnipCommand } from "../utils/interfaces.ts";
import { jsonToSnip } from "../writer/generator.ts";
import { Logger, type logDetail } from "../utils/logger.ts";
import { CliAbortError } from "../utils/error.ts";
import { Config, type ConfigScope } from "../config/config.ts";
import iconv from "iconv-lite";

type ExecuteableCommandLayers = Record<number, { snipName: string, commands: Command[] }[]>

const extractSnipName = (file: string) => {
    if (file.endsWith('.snip')) {
        return file.substring(0, file.length - 5)
    }
    return file;
}

const listupAllSnipInDir = async (dir: string) => {
    const dirEntries = await readDir(dir);
    return await dirEntries.filter(entry => entry.isFile() && path.extname(entry.name) === '.snip')
                            .map(entry => extractSnipName(entry.name));  
}

const loadSnipsInDir = async (files: string[], dir: string) => {
    const snips = await Promise.all(files.map(async name => {
        const snip = await loadSnipCommand(`${name}.snip`, dir);
        return { name: name, snip: snip };
    }));
    return snips.filter((s): s is { name: string; snip: SnipCommand } => s.snip !== null);
}

const loadSnipCommand = async (file: string, dir: string) => {
    const content = await readFile(file, dir);
    return content ? snipToJson(content) : null;
}

const loadSnipCommandOrThrow = async (file: string, dir: string) => {
    const snip = await loadSnipCommand(file, dir);
    if (snip) {
        return snip;
    }
    throw new CliAbortError(`${file} is not found`);
}

const findCommand = (snipCommand: SnipCommand, name: string): Command | null => {
    const commands = snipCommand.commands?.filter(c => name === c.name);
    if (!commands || commands.length === 0) {
        return null;
    }
    if (commands.length > 1) {
        throw new Error(`Multile command '${name}' are found`);
    }

    return commands[0];
}

const findCommandOrThrow = (snipCommand: SnipCommand, name: string): Command => {
    const command = findCommand(snipCommand, name);
    if (command) {
        return command;
    }
    throw new CliAbortError(`command '${name}' is not found`);
}

const printSnipDetails = (logger:Logger, name: string, snip?: SnipCommand, logDetail?: logDetail) => {
    logger.appendLog(`${name}`, 'log', logDetail);
    if (snip) {
        logger.appendLog(`─────────`, 'log', logDetail);
        logger.appendLog(`Description : ${snip.description?? ''}`, 'log', logDetail);
        logger.appendLog(`Tags        : ${snip.tags ? snip.tags.join(', ') : ''}`, 'log', logDetail);
        logger.appendLog(`Commands    : ${snip.commands ? snip.commands.map(c => c.name).join(', ') : ''}`, 'log', logDetail);
        logger.appendLog(``, 'log', logDetail);
    }

}

const printCommandDetails = (logger: Logger, command: Command, showDetail?: boolean, logDetail?: logDetail) => {
    logger.appendLog(`${command.name}`, 'log', logDetail);
    if (showDetail) {
        logger.appendLog(`─────────`, 'log', logDetail);
        logger.appendLog(`Command     : ${command.command?? ''}`, 'log', logDetail);
        logger.appendLog(`Description : ${command.description?? ''}`, 'log', logDetail);
        logger.appendLog(`Tags        : ${command.tags ? command.tags.join(', ') : ''}`, 'log', logDetail);
        logger.appendLog(`DependsOn   : ${command.dependsOn ? command.dependsOn.join(', ') : ''}`, 'log', logDetail);
        logger.appendLog(``, 'log', logDetail);
    }
}

const checkIfSnipAlreadyExist = async (file: string, dir: string) => {
    if (await readFile(file, dir)) {
        throw new CliAbortError(`${file} already exists`);
    }
}

const saveSnipCommand = async (file: string, dir: string, snipCommand: SnipCommand) => {
    const content = await jsonToSnip(snipCommand);
    await writeFile(file, dir, content);
}

const validateDependsOnCycling = (commandName: string, dependsOn: string[], graph: Record<string, string[]>, visited: Set<string>) => {
    const validate = (target: string, visiting: Set<string>) => {
        if (visiting.has(target)) {
            throw new CliAbortError(`Circular dependency detected.`);
        }
        if (!graph[target] || graph[target].length === 0 || visited.has(target)) {
            return visiting;
        }
        visiting.add(target);
        graph[target].forEach(p => validate(p, visiting));
        visiting.delete(target);
        visited.add(target);
    }
    
    for (const p of dependsOn) {
        const visiting: Set<string> = new Set();
        visiting.add(commandName);
        visited.add(commandName);
        validate(p, visiting);
    }
}

const createSnipFile = async (contexts: Contexts, file: string, description?: string, log?: boolean) => {
    const dir = contexts.workingDir;
    const logger = contexts.logger;
    await checkIfSnipAlreadyExist(file, dir);
    const snipCommand = { description } as SnipCommand;
    await saveSnipCommand(file, dir, snipCommand);
    logger.appendLog(`Created a file`, 'log', 'verbose');
    printSnipDetails(logger, extractSnipName(file), snipCommand, 'verbose');
}

const editSnipFile = async (contexts: Contexts, file: string, description?: string, tags?: string[]) => {
    const dir = contexts.workingDir;
    const logger = contexts.logger;
    if (description === undefined && tags === undefined) {
        throw new CliAbortError(`Nothing to update as 'description' and 'tag' were not passed`, 'verbose');
    }
    const snipCommand = await loadSnipCommandOrThrow(file, dir);

    if (description !== undefined) {
        snipCommand.description = description;
    }
    if (tags) {
        snipCommand.tags = tags.filter(t => t === "" || t === '').length > 0 ? [] : [...new Set(tags)];
    }
    await saveSnipCommand(file, dir, snipCommand);
    logger.appendLog(`Updated a file`, 'log', 'verbose');
    printSnipDetails(logger, extractSnipName(file), snipCommand, 'verbose');
}

const addTagToSnipFile = async (contexts: Contexts, file: string, tag: string) => {
    const dir = contexts.workingDir;
    const logger = contexts.logger;
    const snipCommand = await loadSnipCommandOrThrow(file, dir);
    if (snipCommand.tags?.find(t => t === tag)) {
        throw new CliAbortError(`${tag} is already added`);
    }

    snipCommand.tags = [...(snipCommand.tags || []), tag];
    await saveSnipCommand(file, dir, snipCommand);
    logger.appendLog(`A tag was added`, 'log', 'verbose');
    printSnipDetails(logger, extractSnipName(file), snipCommand, 'verbose');
}

const removeTagFromSnipFile = async (contexts: Contexts, file: string, tag: string) => {
    const dir = contexts.workingDir;
    const logger = contexts.logger;
    const snipCommand = await loadSnipCommandOrThrow(file, dir);

    if (!snipCommand.tags || !snipCommand.tags.find(t => t === tag)) {
        throw new CliAbortError(`${tag} is not tagged`);
    }

    snipCommand.tags = snipCommand.tags.filter(t => t !== tag)
    await saveSnipCommand(file, dir, snipCommand);
    logger.appendLog(`A tag was removed`, 'log', 'verbose');
    printSnipDetails(logger, extractSnipName(file), snipCommand, 'verbose');  
}

const renameSnipFile = async (contexts: Contexts, file: string,  newName: string) => {
    const dir = contexts.workingDir;
    const logger = contexts.logger;
    if (file === newName) {
        throw new CliAbortError(`${file} was not renamed as newName is same.`);
    }

    await checkIfSnipAlreadyExist(newName, dir);
    const result = await renameFile(file, dir, newName);
    if (!result) {
        throw new CliAbortError(`${file} is not found`);
    }
    logger.appendLog(`${file} was renamed to ${newName}`, 'log', 'verbose'); 
}

const removeSnipFile = async (contexts: Contexts, file: string, log?: boolean) => {
    const dir = contexts.workingDir;
    const logger = contexts.logger;
    const result = await deleteFile(file, dir);
    if (!result) {
        throw new CliAbortError(`${file} is not found`);
    }
    logger.appendLog(`Removed the file: ${file}`, 'log', 'verbose');  
}

const addSnipCommand = async (contexts: Contexts, file: string, name: string, command: string, 
                                        description?: string, tags?: string[], dependsOn?: string[]) => {
    const dir = contexts.workingDir;
    const logger = contexts.logger;
    const snipCommand = await loadSnipCommandOrThrow(file, dir);
    if (snipCommand.commands?.filter(c => c.name === name).length > 0) {
        throw new CliAbortError(`command '${name}' already exists`);
    }

    if (dependsOn?.includes(name)) {
        throw new CliAbortError(`command cannot depend on itself`);
    }

    const existingCommandNames = snipCommand.commands?.map(c => c.name) ?? [];
    const invalidDependsOn = dependsOn?.filter(dp => existingCommandNames.indexOf(dp) === -1) ?? [];
    if (invalidDependsOn.length > 0) {
        throw new CliAbortError(`command '${name}' has invalid dependencies: ${invalidDependsOn.join(', ')}`);
    }

    const newCommand = {
        name: name,
        command: command,
        description: description,
        tags: tags ? [...new Set(tags)] : undefined,
        dependsOn: dependsOn ? [...new Set(dependsOn)] : undefined
    } as Command;

    snipCommand.commands = [...(snipCommand.commands || []), newCommand];
    await saveSnipCommand(file, dir, snipCommand);
    logger.appendLog(`A command was added`, 'log', 'verbose'); 
    printCommandDetails(logger, newCommand, true, 'verbose');
}

const editSnipCommand = async (contexts: Contexts, file: string, target: string, 
                        name?: string, command?: string, description?: string, tags?: string[], dependsOn?: string[]) => {
    const dir = contexts.workingDir;
    const logger = contexts.logger;
    if (name === undefined && command === undefined
        && description === undefined && tags === undefined
        && dependsOn === undefined) {
            throw new CliAbortError(
                `Nothing to update as 'name' and 'command' and 'description' and 'tag' and 'dependsOn' were not passed`, 
                'verbose');
    }

    const snipCommand = await loadSnipCommandOrThrow(file, dir);
    const targetSnipCommand = findCommandOrThrow(snipCommand, target);

    if (name) {
        if (target === name) {
            throw new CliAbortError(`command was not updated to '${name}' as its name is same`);
        }
        if (snipCommand.commands.filter(c => c.name === name).length > 0) {
            throw new CliAbortError(`command was not updated to '${name}' as its name already exits`);
        }
        
        // name変えたら、依存関係壊れる
        const brokenDependencyCommands = snipCommand.commands.filter(c => c.dependsOn?.includes(target)).map(c => c.name);
        if (brokenDependencyCommands.length > 0) {
            throw new CliAbortError(`command ${target} still is depended on ${brokenDependencyCommands.join(', ')}`);
        }
        targetSnipCommand.name = name;
    }

    if (command !== undefined) {
        targetSnipCommand.command = command;
    }

    if (description !== undefined) {
        targetSnipCommand.description = description;
    }

    if (tags) {
        targetSnipCommand.tags = tags.filter(t => t === "" || t === '').length > 0 ? [] : [...new Set(tags)];
    }

    if (dependsOn) {
        if (dependsOn.includes(targetSnipCommand.name)) {
            throw new CliAbortError(`command cannot depend on itself`);
        }

        const validatedDependsOn = dependsOn.filter(d => d === "" || d === '').length > 0 ? [] : [...new Set(dependsOn)];
        const existingOtherCommands = snipCommand.commands.filter(c => c.name !== targetSnipCommand.name || c.name !== target);
        const existingOtherCommandNames = existingOtherCommands.map(c => c.name);
        const invalidDependsOn = validatedDependsOn.filter(dp => dp && existingOtherCommandNames.indexOf(dp) === -1);
        if (invalidDependsOn.length > 0) {
            throw new CliAbortError(`command '${targetSnipCommand.name}' has invalid dependencies: ${invalidDependsOn.join(', ')}`);
        }

        // 循環チェック
        const dependencyGraph = existingOtherCommands.reduce<Record<string, string[]>>((currMap, command) => {
                                    currMap[command.name] = command.dependsOn?? [];
                                    return currMap;
                                }, {});
        const visitedDependsOn  = new Set<string>();
        validateDependsOnCycling(targetSnipCommand.name, validatedDependsOn, dependencyGraph, visitedDependsOn);
        targetSnipCommand.dependsOn = validatedDependsOn;
    }


    await saveSnipCommand(file, dir, snipCommand);
    logger.appendLog(`A command was updated`, 'log', 'verbose'); 
    printCommandDetails(logger, targetSnipCommand, true, 'verbose');
}

const addTagToSnipCommand = async (contexts: Contexts, file: string, name: string, tag: string) => {
    const dir = contexts.workingDir;
    const logger = contexts.logger;
    const snipCommand = await loadSnipCommandOrThrow(file, dir);
    const command = findCommandOrThrow(snipCommand, name);
    if (command.tags?.find(t => t === tag)) {
        throw new CliAbortError(`${tag} is already added`);
    }
    
    command.tags = [...(command.tags || []), tag];
    await saveSnipCommand(file, dir, snipCommand);
    logger.appendLog(`A tag was added`, 'log', 'verbose'); 
    printCommandDetails(logger, command, true, 'verbose');
}

const removeTagFromSnipCommand = async (contexts: Contexts, file: string, name: string, tag: string) => {
    const dir = contexts.workingDir;
    const logger = contexts.logger;
    const snipCommand = await loadSnipCommandOrThrow(file, dir);
    const command = findCommandOrThrow(snipCommand, name);
    if (!command.tags || !command.tags.find(t => t === tag)) {
        throw new CliAbortError(`'${tag}' is not tagged`);
    }
    
    command.tags = command.tags.filter(t => t !== tag);
    await saveSnipCommand(file, dir, snipCommand);
    logger.appendLog(`A tag was removed`, 'log', 'verbose'); 
    printCommandDetails(logger, command, true, 'verbose');
}

const removeSnipCommand = async (contexts: Contexts, file: string, name: string) => {
    const dir = contexts.workingDir;
    const logger = contexts.logger;
    const snipCommand = await loadSnipCommandOrThrow(file, dir);

    const remainingSnipCommand = snipCommand.commands?.filter(c => name !== c.name);
    if (!remainingSnipCommand || snipCommand.commands.length === remainingSnipCommand.length) {
        throw new CliAbortError(`command '${name}' is not found`);
    }

    const remainingCommandDependsOn = new Set(remainingSnipCommand.flatMap(c => c.dependsOn ?? []));
    if (remainingCommandDependsOn.has(name)) {
        throw new CliAbortError(`'${name}' is still referenced by ${remainingSnipCommand.filter(c => c.dependsOn?.includes(name)).map(c => c.name).join(', ')}`);
    }

    snipCommand.commands = remainingSnipCommand;
    await saveSnipCommand(file, dir, snipCommand);
    logger.appendLog(`Remove a command ${name} in the file: ${file}`, 'log', 'verbose')
}

const findSnipFiles = async (contexts: Contexts, matchString?: string, tags?: string[], detail? : boolean) => {
    const dir = contexts.workingDir;
    const logger = contexts.logger;
    const fileNames = await listupAllSnipInDir(dir);
    if (!(matchString || (tags && tags.filter(t => t).length > 0) || detail)) {
        fileNames.forEach(name => logger.appendLog(`${name}`))
        return;
    }

    const snips = await loadSnipsInDir(fileNames, dir);
    snips.filter(s => {
        return (!matchString || s.name.includes(matchString) || s.snip.description?.includes(matchString))
                && (!(tags && tags.filter(t => t).length > 0) || tags.filter(t => s.snip.tags?.includes(t)).length > 0);
        }).forEach(s => printSnipDetails(logger, s.name, detail ? s.snip : undefined));
}

const findCommands = async (contexts: Contexts, file: string, matchString?: string, tags?: string[], detail? : boolean) => {
    const dir = contexts.workingDir;
    const logger = contexts.logger;
    const snipCommand = await loadSnipCommand(file, dir);
    snipCommand?.commands?.filter(c => {
        return (!matchString || c.name?.includes(matchString) 
                || c.command?.includes(matchString) || c.description?.includes(matchString))
            && (!(tags && tags.filter(t => t).length > 0) || tags.filter(t => c.tags?.includes(t)).length > 0);
        }).forEach(c => printCommandDetails(logger, c, detail));
}

const listupSnipTags = async (contexts: Contexts) => {
    const dir = contexts.workingDir;
    const logger = contexts.logger;
    const fileNames = await listupAllSnipInDir(dir);
    const snips = await loadSnipsInDir(fileNames, dir);
    [...new Set(snips.flatMap(s => s.snip.tags?? []))].sort().forEach(t => logger.appendLog(t));
}

const listupCommandTags = async (contexts: Contexts, file: string) => {
    const dir = contexts.workingDir;
    const logger = contexts.logger;
    const snipCommand = await loadSnipCommand(file, dir);
    [...new Set(snipCommand?.commands?.flatMap(c => c.tags?? []))].sort().forEach(t => logger.appendLog(t));
}

const showDescription = async (contexts: Contexts, file: string, name?: string) => {
    const dir = contexts.workingDir;
    const logger = contexts.logger;
    const snipCommand = await loadSnipCommandOrThrow(file, dir);

    if (name) {
        const command = findCommandOrThrow(snipCommand, name);
        printCommandDetails(logger, command, true);
    } else {
        printSnipDetails(logger, file.substring(0, file.length - 5), snipCommand)
    }
}

const executeCommands = async (contexts: Contexts, file?: string,  name?: string, tags?: string[], dryRun? : boolean) => {
    const dir = contexts.workingDir;
    const logger = contexts.logger;
    const encoding = contexts.commandConfig['encoding'] as string;
    
    // 実行対象 commandを取得する
    let snipMap: { name: string; snip: SnipCommand; }[] | null;
    if (file) {
        const snipCommand = await loadSnipCommand(file, dir);
        snipMap = snipCommand ? [ { name: extractSnipName(file) , snip: snipCommand} ] : []    
    } else {
        const fileNames = await listupAllSnipInDir(dir);
        snipMap = await loadSnipsInDir(fileNames, dir);
    }

    const executableCommandLayers: ExecuteableCommandLayers = snipMap.reduce<ExecuteableCommandLayers>((layerMap, currSnipMap) => {
            const snip = currSnipMap.snip;
            let remainingCommands: Command[] = snip.commands?.filter(c => {
                        // 実行対象であるかを、フィルタリング
                        if (!c.command) return false;
                        if (name && c.name !== name) return false;
                        if (tags && tags.length > 0) return c.tags?.filter(t => tags.includes(t)).length > 0;
                        return true;
                    }) ?? [];
            const commandNames = new Set(remainingCommands.flatMap(c => c.name ? [c.name] : []));
            for (const c of remainingCommands) {
                const invalidDependsOn = c.dependsOn?.filter(dp => !commandNames.has(dp)) ?? [];
                if (invalidDependsOn.length > 0) {
                    throw new CliAbortError(`command '${c.name}' has invalid dependencies: ${invalidDependsOn.join(', ')}`);
                }
            }
            let chunkedCommandNameSet: Set<string> = new Set<string>();
            let i = 0;
            while (remainingCommands.length > 0) {
                const chunk: Command[] = [];
                const notChunked: Command[] = [];
                const chunked = new Set<string>();
                for (const c of remainingCommands) {
                    const dependsOn = c.dependsOn ?? [];
                    if (dependsOn.length === 0
                        || dependsOn.filter(dp => !chunkedCommandNameSet.has(dp)).length === 0) {
                        chunk.push(c);
                        chunked.add(c.name);
                        continue;
                    }
                    notChunked.push(c);
                }

                // 循環チェック
                if (chunked.size === 0) throw new CliAbortError(`Circular dependency detected.`);
                
                if (layerMap[i]) layerMap[i].push({ snipName: currSnipMap.name, commands: chunk});
                else layerMap[i] = [{ snipName: currSnipMap.name, commands: chunk}];

                chunkedCommandNameSet = new Set<string>([...chunkedCommandNameSet, ...chunked]);
                remainingCommands = [...notChunked];
                i++;
            }
            return layerMap;
        }, {}
    );

    for (let i = 0; i < Object.keys(executableCommandLayers).length; i++) {
        logger.printStream(`chunk ${i+1}...`, 'log', 'verbose');
        const commandMap = executableCommandLayers[i];
        await Promise.all(
            commandMap.flatMap(map => {
                const snipName = map.snipName;
                const commands = map.commands;
                return commands.map(c => {
                    const logPrefix = `${snipName}::${c.name}`;
                    logger.printStreamWithPrefix('Executing ...', logPrefix);
                    if (dryRun) {
                        logger.printStreamWithPrefix('Completed with code 0', logPrefix);
                        return Promise.resolve();
                    }
                    
                    return new Promise<void>((resolve, reject) => {
                        const outBuffer = [] as Buffer[];
                        const errBuffer = [] as Buffer[];
                        const subprocess = spawn(c.command, { shell: true });
                        subprocess.stdout?.on('data', (data) => outBuffer.push(data));
                        subprocess.stderr?.on('data', (data) => errBuffer.push(data));
                        subprocess?.on('close', (code) => {
                            if (code === 0) logger.printStreamWithPrefix('Completed with code 0', logPrefix);
                            else logger.printStreamWithPrefix(`Completed with code ${code}`, logPrefix, 'error');

                            logger.printStreamWithPrefix(c.command, logPrefix);
                            
                            if (outBuffer.length > 0) logger.printStream(iconv.decode(Buffer.concat(outBuffer), encoding));
                            if (errBuffer.length > 0) logger.printStream(iconv.decode(Buffer.concat(errBuffer), encoding), 'error');

                            if (code === 0) resolve();
                            else reject(new CliAbortError(`command '${c.name}' failed with code ${code}`));
                        });
                    });
                });
            })
        );
    }
}

const showConfig = async (contexts: Contexts, config: Config, scope: ConfigScope) => {
    const logger = contexts.logger;
    logger.appendLog(config.dump(scope?? 'current', 'yml'));
}

const withTryCatch = <Args extends any[], T> (
                        fn: (contexts: Contexts, ...args: Args) => Promise<T>
                    ) => async (contexts: Contexts, ...args: Args) => {
                        const logger = contexts.logger;
                        try {
                            await fn(contexts, ...args);
                        } catch(error) {
                            if (error instanceof CliAbortError) {
                                logger.appendLog(error.message, 'log', error.logDetail);
                            } else {
                                logger.appendLog(`Something went wrong`, 'error');
                                logger.appendLog(error, 'log', 'verbose');
                            }
                        } finally {
                            logger.printLogs();
                        }
                    }

export const runToCreateSnipFile = withTryCatch(createSnipFile);
export const runToEditSnipFile = withTryCatch(editSnipFile);
export const runToAddTagToSnipFile = withTryCatch(addTagToSnipFile);
export const runToRemoveTagFromSnipFile = withTryCatch(removeTagFromSnipFile);
export const runToRenameSnipFile = withTryCatch(renameSnipFile);
export const runToRemoveSnipFile = withTryCatch(removeSnipFile);
export const runToAddSnipCommand = withTryCatch(addSnipCommand);
export const runToEditSnipCommand = withTryCatch(editSnipCommand);
export const runToAddTagToSnipCommand = withTryCatch(addTagToSnipCommand);
export const runToRemoveTagFromSnipCommand = withTryCatch(removeTagFromSnipCommand);
export const runToRemoveSnipCommand = withTryCatch(removeSnipCommand);
export const runToFindSnipFiles = withTryCatch(findSnipFiles);
export const runToFindCommands = withTryCatch(findCommands);
export const runToListupSnipTags = withTryCatch(listupSnipTags);
export const runToListupCommandTags = withTryCatch(listupCommandTags);
export const runToShowDescription = withTryCatch(showDescription);
export const runToExecuteCommands = withTryCatch(executeCommands);
export const runToShowConfig = withTryCatch(showConfig);