import type { Command, SnipCommand } from "../utils/interfaces.ts";
import { SnipParser, parseInput } from "./parser.ts";


const BaseSnipVisitor = new SnipParser().getBaseCstVisitorConstructor();

class SnipToJsonVisitor extends BaseSnipVisitor {
    constructor() {
        super();
        this.validateVisitor();
    }

    ast(ctx: any): SnipCommand {
        const desc = ctx.descriptions?.map((descNode: any) => this.visit(descNode)) as string[];
        const tags = ctx.tags?.map((tagNode: any) => this.visit(tagNode)) as string[][];
        const commands = ctx.commands?.map((commandNode: any) => this.visit(commandNode)) as Command[];
        return {
            "description": desc?.at(-1),
            "tags": tags?.at(-1),
            "commands": commands
        } as SnipCommand;
    }

    description(ctx: any) {
        return this.visit(ctx.description?.[0]);
    }

    tag(ctx: any) {
        return this.visit(ctx.tags?.[0]);
    }

    command(ctx: any) {
        const commandName = ctx.commandName?.[0].image;
        const commandBlock = this.visit(ctx.commandBlock?.[0]);
        return {
            "name": commandName as string,
            "command": commandBlock?.cmd as string,
            "description":  commandBlock?.desc as string,
            "tags":  commandBlock?.tags as string[],
            "dependsOn":  commandBlock?.depends_on as string[]
        } as Command;
    }

    object(ctx: any) {
        return ctx.objectItem
                ?.map((itemNode: any) => this.visit(itemNode))
                .reduce((obj: Record<string, any>, item: { key: string, value: any }) => {
                    if (typeof item.value === "string"
                        && (item.key === "tags" || item.key === "depends_on")
                    ) {
                        obj[item.key] = [item.value];
                    } else {
                        obj[item.key] = item.value;
                    }
                    return obj;
                }, {});
    }

    objectItem(ctx: any) {
        return {
            "key" : this.visit(ctx.flexibleString[0]),
            "value" : this.visit(ctx.value[0])
        }
    }

    flexibleList(ctx: any) {
        if (ctx.array) {
            return this.visit(ctx.array?.[0]);
        } else {
            return this.visit(ctx.stringList?.[0]);
        }
    }

    array(ctx: any) {
        return ctx.flexibleString?.map((stringNode: any) => this.visit(stringNode));
    }

    stringList(ctx: any) {
        return ctx.flexibleString?.map((stringNode: any) => this.visit(stringNode));
    }

    flexibleString(ctx: any) {
        if (ctx.QuotedString) {
            const quotedString = ctx.QuotedString[0].image as string;
            // 囲っている " を削除
            return quotedString.slice(1, -1)
        } else {
            return ctx.UnquotedString[0].image;
        }
    }

    value(ctx: any) {
        if (ctx.object) {
            return this.visit(ctx.object[0]);
        } else if (ctx.array) {
            return this.visit(ctx.array[0]);
        } else {
            return this.visit(ctx.flexibleString[0]);
        }
    }
}

const toJsonVisitor = new SnipToJsonVisitor();

export const snipToJson = (input: string): SnipCommand => {
    try {
        const cst = parseInput(input);
        const commands: SnipCommand = toJsonVisitor.visit(cst);
        return commands;
    } catch (error) {
        throw new Error(`Error is occurred while parsing. error: ${error}`);
    }
    
}