#!/usr/bin/env node

import yargs, { type CommandModule } from "yargs";
import { hideBin } from "yargs/helpers";
import { arg, 
        builder, 
        commandOption, 
        dependsOnOption, 
        descriptionOption, 
        option, 
        tagOption } from './builder/builder.ts';
import { runToAddSnipCommand, 
        runToAddTagToSnipCommand, 
        runToAddTagToSnipFile, 
        runToCreateSnipFile, 
        runToEditSnipCommand, 
        runToEditSnipFile, 
        runToExecuteCommands, 
        runToFindCommands, 
        runToFindSnipFiles, 
        runToListupCommandTags, 
        runToListupSnipTags, 
        runToRemoveSnipCommand, 
        runToRemoveSnipFile, 
        runToRemoveTagFromSnipCommand, 
        runToRemoveTagFromSnipFile, 
        runToRenameSnipFile, 
        runToShowConfig, 
        runToShowDescription} from "./handler/handler.ts";
import { Config, type ConfigScope } from "./config/config.ts";
import type { Contexts } from "./utils/interfaces.ts";
import { Logger } from "./utils/logger.ts";


const config = await Config.load();

const createBasicConfig = (config: Config, log?: boolean) => {
    return {
        workingDir: config.current.working_dir,
        logger : new Logger(log === true ? 'verbose' : 'normal')
    } as Contexts;
    
}

const createCommand: CommandModule  = {
    command: 'create <file>',
    describe: 'Create .snip file',
    builder: (yargs) => builder(yargs, 
        [arg('file', 'A file name to create')],
        [descriptionOption('Add a description for the created file')]
    ),
    handler: async (argv) => {
        const fileName = `${argv.file}.snip`;
        const decsription = argv.description as string;
        const contexts = createBasicConfig(config, argv.log as boolean);
        await runToCreateSnipFile(contexts, fileName, decsription);
    }
};

const addCommand: CommandModule  = {
    command: 'add <file> <name>',
    describe: 'Add a command to .snip file',
    builder: (yargs) => builder(yargs, 
        [ 
            arg('file', 'A file name to add a command to'),
            arg('name', 'A command name to add')
        ],
        [
            commandOption('A command to be executed', 'A command is required.'),
            descriptionOption('Add a description for the command'),
            tagOption('Add tags for the command'),
            dependsOnOption('Add dependsOn for the command')
        ]
    ),
    handler: async (argv) => {
        const fileName = `${argv.file}.snip`;
        const name = argv.name as string;
        const command = argv.command as string;
        const description = argv.description as string;
        const tags = argv.tag as string[];
        const dependsOn = argv['depends-on'] as string[];
        const contexts = createBasicConfig(config, argv.log as boolean);
        await runToAddSnipCommand(contexts, fileName, name, command, description, tags, dependsOn);
    }
};

const editCommand: CommandModule  = {
    command: 'edit <file> [name] [newName]',
    describe: 'Edit a command to .snip file',
    builder: (yargs) => builder(yargs, 
        [ 
            arg('file', 'A file name to edit'),
            arg('name', 'A command name to edit'),
            arg('newName', 'A new command name')
        ],
        [
            commandOption('A command to be executed'),
            descriptionOption('Edit a description for the file, or the command'),
            tagOption('Edit a tag for the file or, the command'),
            dependsOnOption('Edit dependsOn for the command. Use "" to remove all dependencies.')
        ]
    ).check((argv) => {
        if (argv.command && !argv.name) {
            throw new Error(`--command can only be used when editing a command.`);
        }
        if (argv['depends-on'] && !argv.name) {
            throw new Error(`--depends-on can only be used when editing a command.`);
        }
        return true;
    }),
    handler: async (argv) => {
        const fileName = `${argv.file}.snip`;
        const name = argv.name as string;
        const newName = argv.newName as string;
        const command = argv.command as string;
        const description = argv.description as string;
        const tags = argv.tag as string[];
        const dependsOn = argv['depends-on'] as string[];
        const contexts = createBasicConfig(config, argv.log as boolean);
        if (name) {
            await runToEditSnipCommand(contexts, fileName, name, newName, command, description, tags, dependsOn);
        } else {
            await runToEditSnipFile(contexts, fileName, description, tags);
        }
    }
};

const removeCommand: CommandModule  = {
    command: 'remove <file> [name]',
    describe: 'Remove a command to .snip file',
    builder: (yargs) => builder(yargs, 
        [ 
            arg('file', 'A file name to remove'),
            arg('name', 'A command name to remove')
        ]
    ),
    handler: async (argv) => {
        const fileName = `${argv.file}.snip`;
        const contexts = createBasicConfig(config, argv.log as boolean);
        if (argv.name) {
            const name = argv.name as string;
            await runToRemoveSnipCommand(contexts, fileName, name);
        } else {
            await runToRemoveSnipFile(contexts, fileName);
        }
    }
};

const renameCommand: CommandModule  = {
    command: 'rename <file> <newName>',
    describe: 'Rename .snip file',
    builder: (yargs) => builder(yargs, 
        [ 
            arg('file', 'A file name to rename'),
            arg('newName', 'A new file name')
        ]
    ),
    handler: async (argv) => {
        const fileName = `${argv.file}.snip`;
        const newName = `${argv.newName}.snip`;
        const contexts = createBasicConfig(config, argv.log as boolean);
        await runToRenameSnipFile(contexts, fileName, newName);
    }
};

const find: CommandModule  = {
    command: 'find [file]',
    describe: 'Find .snip file or commands',
    builder: (yargs) => builder(yargs, 
        [arg('file', 'A file name to find')],
        [
            option('match', 'string', 'A search text to match', 'm'),
            tagOption('Edit a tag for the command'),
            option('detail', 'boolean', 'Show the dateil of the commands', 'd')
        ]
    ),
    handler: async (argv) => {
        const matchString = argv.match as string;
        const tag = argv.tag as string[];
        const detailOption = argv.detail as boolean;
        const contexts = createBasicConfig(config, argv.log as boolean);
        if (argv.file) {
            const file = `${argv.file}.snip`;
            await runToFindCommands(contexts, file, matchString, tag, detailOption);
        } else {
            await runToFindSnipFiles(contexts, matchString, tag, detailOption);
        }
    }
};

const runCommand: CommandModule  = {
    command: 'run [file] [name]',
    describe: 'Run a command in .snip file',
    builder: (yargs) => builder(yargs, 
        [ 
            arg('file', 'A file name'),
            arg('name', 'A command name to run')
        ],
        [
            tagOption('Edit a tag for the command'),
            option('dry-run', 'boolean', 'Run as dry-run')
        ]
    ),
    handler: async (argv) => {
        const fileName = argv.file ? `${argv.file}.snip` : undefined;
        const name = argv.name as string;
        const tags = argv.tag as string[];
        const dryRun = argv["dry-run"] as boolean;
        const contexts = createBasicConfig(config, argv.log as boolean);
        contexts.commandConfig = config.current.command.run;
        await runToExecuteCommands(contexts, fileName, name, tags, dryRun);
    }
};

const descCommand: CommandModule  = {
    command: 'desc <file> [name]',
    describe: 'Show the description of .snip file or command',
    builder: (yargs) => builder(yargs, 
        [ 
            arg('file', 'A file name to show description'),
            arg('name', 'A command name to show description')
        ],
    ),
    handler: async (argv) => {
        const fileName = `${argv.file}.snip`;
        const name = argv.name as string;
        const contexts = createBasicConfig(config, argv.log as boolean);
        await runToShowDescription(contexts, fileName, name);
    }
};

const tagCommand: CommandModule = {
    command: 'tag',
    describe: 'Tagging to file or command',
    builder: (yargs) => yargs
                        .command(tagAddCommand)
                        .command(tagRemoveCommand)
                        .command(tagListCommand)
                        .demandCommand(1, 'You need to specify a subcommand (add, remove, list)'),
    handler:() => {}
}

const tagAddCommand: CommandModule = {
    command: 'add <file> <target> [tag]',
    describe: 'Add a tag to file or command',
    builder: (yargs) => builder(yargs, 
        [ 
            arg('file', 'A file name to add'),
            arg('target', 'A tag name, or a command name when tag is set'),
            arg('tag', 'A tag name for the specified command ')
        ],
    ),
    handler: async (argv) => {
        const file = `${argv.file}.snip`;
        const commandTag = argv.tag as string;
        const contexts = createBasicConfig(config, argv.log as boolean);
        if (commandTag) {
            const name = argv.target as string;
            await runToAddTagToSnipCommand(contexts, file, name, commandTag);
        } else {
            const fileTag = argv.target as string;
            await runToAddTagToSnipFile(contexts, file, fileTag);
        }
    }
}

const tagRemoveCommand: CommandModule = {
    command: 'remove <file> <target> [tag]',
    describe: 'Remove a tag from file or command',
    builder: (yargs) => builder(yargs, 
        [ 
            arg('file', 'A file name to remove'),
            arg('target', 'A tag name, or a command name when tag is set'),
            arg('tag', 'A tag name for the specified command ')
        ],
    ),
    handler: async (argv) => {
        const file = `${argv.file}.snip`;
        const commandTag = argv.tag as string;
        const contexts = createBasicConfig(config, argv.log as boolean);
        if (commandTag) {
            const name = argv.target as string;
            await runToRemoveTagFromSnipCommand(contexts, file, name, commandTag);
        } else {
            const fileTag = argv.target as string;
            await runToRemoveTagFromSnipFile(contexts, file, fileTag);
        }
    }
}

const tagListCommand: CommandModule = {
    command: 'list [file]',
    describe: 'List up tags from file or command',
    builder: (yargs) => builder(yargs, [ arg('file', 'A file name to list up') ]),
    handler: async (argv) => {
        const contexts = createBasicConfig(config, argv.log as boolean);
        if (argv.file) {
            const file = `${argv.file}.snip`;
            await runToListupCommandTags(contexts, file);
        } else {
            await runToListupSnipTags(contexts);
        }
    }
}

const configCommand: CommandModule = {
    command: 'config',
    describe: 'Show configurations',
    builder: (yargs) => builder(yargs, [], [
                option('global', 'boolean', 'Show the global configuration'),
                option('local', 'boolean', 'Show the local configuration'),
                option('default', 'boolean', 'Show the default configuration')
            ])
        .conflicts({
            global: ['local', 'default'],
            local:  ['global', 'default'],
            default: ['global', 'local'],
        })
        .group(['global', 'local', 'default'], 'Config scope (choose one):'),
    handler: async (argv) => {
        let scope: ConfigScope = 'current';
        if (argv.global) {
            scope = 'global'
        } else if (argv.local) {
            scope = 'local'
        } else if (argv.default) {
            scope = 'default'
        }
        const contexts = createBasicConfig(config, argv.log as boolean);
        await runToShowConfig(contexts, config, scope);
    }
}

const main = async () => {
    try {
        yargs(hideBin(process.argv))
            .scriptName("snip")
            .command(createCommand)
            .command(addCommand)
            .command(editCommand)
            .command(removeCommand)
            .command(renameCommand)
            .command(find)
            .command(runCommand)
            .command(descCommand)
            .command(tagCommand)
            .command(configCommand)
            .strict()
            .demandCommand(1, 'You need at least one command before moving on')
            .parseAsync();
    } catch (e) {
        console.log("error", e);
    }
}

main();