import type { Command, SnipCommand } from "../utils/interfaces.ts"

const templateCommand = (input: Command) => `
@command: ${input.name} {
    cmd: ${input.command ? quateString(input.command) : '\"\"'},
    desc: ${input.description ? quateString(input.description) : '\"\"'},
    tags: [${input.tags ? input.tags.filter(t =>t).map(t => quateString(t)).join(', ') : ''}],
    depends_on: [${input.dependsOn ? input.dependsOn.filter(d =>d).map(d => quateString(d)).join(', ') : ''}]
}
`.trim()

const template = (description: string, tags: string, commands: string) => `
@description: ${description}
@tags: ${tags}
${commands}
`.trim()

const quateString = (input: string) => {
    const regex = /[\s\n\r:,{}\[\]]/;
    const escapedInput = input.replaceAll('"', '\\"');
    return regex.test(input) ? `"${escapedInput}"` : `${escapedInput}`;
}

export const jsonToSnip = async (input: SnipCommand): Promise<string> => {
    if (input.commands?.filter(c => !c.name).length > 0) {
        throw new Error(`Commands name must be mandatory`);
    }
    const validatedDescription = input.description ? quateString(input.description) : '';
    const validatedTags = input.tags ? input.tags.filter(t => t).map(t => quateString(t)).join(', ') : '';
    const validatedCommands = input.commands ? input.commands.filter(c => c).map(c => templateCommand(c)).join('\n') : '';
    return template(validatedDescription, validatedTags, validatedCommands);

}