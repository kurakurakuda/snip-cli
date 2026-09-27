import {createToken, Lexer, type ILexingResult} from 'chevrotain';

export const DescriptionKey = createToken({name: "DescriptionKey", pattern: /@description/i});
export const TagKey = createToken({name: "TagKey", pattern: /@tags/i});
export const CommandKey = createToken({name: "CommandKey", pattern: /@command/i});

export const Comma = createToken({ name: "Comma", pattern: /,/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });
export const LCurly = createToken({ name: "LCurly", pattern: /{/ });
export const RCurly = createToken({ name: "RCurly", pattern: /}/ });
export const LSquare = createToken({ name: "LSquare", pattern: /\[/ });
export const RSquare = createToken({ name: "RSquare", pattern: /\]/ });
export const WhiteSpace = createToken({ name: "WhiteSpace", pattern: /\s+/, group: Lexer.SKIPPED});

export const QuotedString = createToken({ name: 'QuotedString', pattern: /"([^"\\]|\\.)*"/ });
export const UnquotedString = createToken({ name: 'UnquotedString', pattern: /[^\s\n\r:,{}\[\]]+/ });

export const Tokens = [
    WhiteSpace,
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
    UnquotedString
];

export const snipLexer = new Lexer(Tokens);

export const lex = (input: string): ILexingResult => {
    const lexingResult = snipLexer.tokenize(input);

    if (lexingResult.errors.length > 0) {
        throw Error(`Error is occurred. errro: ${lexingResult.errors}`);
    }

    return lexingResult;
};