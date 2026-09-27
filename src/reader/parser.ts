import { CstParser, type CstNode } from "chevrotain";
import { Tokens, 
    DescriptionKey,
    TagKey,
    CommandKey,
    Comma,
    Colon,
    LCurly,
    RCurly,
    LSquare,
    RSquare,
    QuotedString,
    UnquotedString,
    snipLexer } from './lexer.ts'


export class SnipParser extends CstParser {
    constructor(options?: any) {
        super(Tokens, options);
        this.performSelfAnalysis();
    }

    ast = this.RULE("ast", () => {
        this.MANY(() => {
            this.OR([
                { ALT: () => this.SUBRULE(this.description, {LABEL: "descriptions"})},
                { ALT: () => this.SUBRULE(this.tag, {LABEL: "tags"})},
                { ALT: () => this.SUBRULE(this.command, {LABEL: "commands"})},
            ]);
        });
    });

    private description = this.RULE("description", () => {
        this.CONSUME(DescriptionKey);
        this.OPTION(() => {
            this.CONSUME(Colon);
            this.OPTION1(() => {
                this.SUBRULE(this.flexibleString, { LABEL: "description" });
            });
        });
    });

    private tag = this.RULE("tag", () => {        
        this.CONSUME(TagKey);
        this.OPTION(() => {
            this.CONSUME(Colon);
            this.OPTION1(() => {
                 this.SUBRULE(this.flexibleList, {LABEL: 'tags'});
            });
        });        
    });

    private command = this.RULE("command", () => {
        this.CONSUME(CommandKey);
        this.OPTION(() => {
            this.CONSUME(Colon);
            this.OPTION1(() => {
                 this.CONSUME(UnquotedString, {LABEL: "commandName"});
                 this.OPTION2(() => {
                    this.SUBRULE(this.object, {LABEL: "commandBlock"});
                });
            });
        });
    });

    private object = this.RULE("object", () => {
        this.CONSUME(LCurly);
        this.OPTION(() => {
            this.SUBRULE(this.objectItem);
            this.MANY(() => {
                this.CONSUME(Comma);
                this.SUBRULE2(this.objectItem);
            });
        });
        this.CONSUME(RCurly);
    });

    private objectItem = this.RULE("objectItem", () => {
        this.SUBRULE(this.flexibleString);
        this.CONSUME(Colon);
        this.SUBRULE(this.value);
    });

    private flexibleList = this.RULE("flexibleList", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.array)},
            { ALT: () => this.SUBRULE(this.stringList)}
        ]);
    });

    private array = this.RULE("array", () => {
        this.CONSUME(LSquare);
        this.OPTION(() => {
            this.SUBRULE(this.flexibleString);
            this.MANY(() => {
                this.CONSUME(Comma);
                this.SUBRULE2(this.flexibleString);
            });
        });
        this.CONSUME(RSquare);
    });

    private stringList = this.RULE("stringList", () => {
        this.OPTION(() => {
            this.SUBRULE(this.flexibleString);
            this.MANY(() => {
                this.CONSUME(Comma);
                this.SUBRULE2(this.flexibleString);
            });
        });
    });

    private flexibleString = this.RULE("flexibleString", () => {
        this.OR([
            { ALT: () => this.CONSUME(QuotedString)},
            { ALT: () => this.CONSUME(UnquotedString)}
        ]);
    });

    private value = this.RULE("value", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.object)},
            { ALT: () => this.SUBRULE(this.array)},
            { ALT: () => this.SUBRULE(this.flexibleString)}
        ]);
    });
}

export const snipParser = new SnipParser();

export const parseInput = (text: string): CstNode => {
    const lexingResult = snipLexer.tokenize(text);
    
    snipParser.input = lexingResult.tokens;
    const parsingResult = snipParser.ast();

    if (snipParser.errors.length > 0) {
        throw new Error(`Error is occurred. error: ${snipParser.errors}`);
    }

    return parsingResult;
}