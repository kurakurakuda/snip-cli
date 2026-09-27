import { tokenMatcher } from "chevrotain";
import { expect } from 'chai';
import { lex,
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
 } from '../../src/reader/lexer.ts';

describe('lexer', () => {
    it('should return a valid Key and UnquotedString against the text separated by space', () => {
        const input = `@description : TEST
                       @tags [ TAG1, 123 ]
                       @command { COMMAND }`
        const result = lex(input);

        expect(result.errors).to.be.empty;
        expect(result.tokens).to.have.lengthOf(13);
        expect(tokenMatcher(result.tokens[0], DescriptionKey)).to.be.true;
        expect(result.tokens[0].image).to.equal("@description");
        expect(tokenMatcher(result.tokens[1], Colon)).to.be.true;
        expect(result.tokens[1].image).to.equal(":");
        expect(tokenMatcher(result.tokens[2], UnquotedString)).to.be.true;
        expect(result.tokens[2].image).to.equal("TEST");
        expect(tokenMatcher(result.tokens[3], TagKey)).to.be.true;
        expect(result.tokens[3].image).to.equal("@tags");
        expect(tokenMatcher(result.tokens[4], LSquare)).to.be.true;
        expect(result.tokens[4].image).to.equal("[");
        expect(tokenMatcher(result.tokens[5], UnquotedString)).to.be.true;
        expect(result.tokens[5].image).to.equal("TAG1");
        expect(tokenMatcher(result.tokens[6], Comma)).to.be.true;
        expect(result.tokens[6].image).to.equal(",");
        expect(tokenMatcher(result.tokens[7], UnquotedString)).to.be.true;
        expect(result.tokens[7].image).to.equal("123");
        expect(tokenMatcher(result.tokens[8], RSquare)).to.be.true;
        expect(result.tokens[8].image).to.equal("]");
        expect(tokenMatcher(result.tokens[9], CommandKey)).to.be.true;
        expect(result.tokens[9].image).to.equal("@command");
        expect(tokenMatcher(result.tokens[10], LCurly)).to.be.true;
        expect(result.tokens[10].image).to.equal("{"); 
        expect(tokenMatcher(result.tokens[11], UnquotedString)).to.be.true;
        expect(result.tokens[11].image).to.equal('COMMAND');
        expect(tokenMatcher(result.tokens[12], RCurly)).to.be.true;
        expect(result.tokens[12].image).to.equal("}");
    })

    it('should return a valid Key and UnquotedString against the text not separated by space', () => {
        const input = `@description:TEST
                       @tags[TAG1,123]
                       @command{COMMAND}`
        const result = lex(input);

        expect(result.errors).to.be.empty;
        expect(result.tokens).to.have.lengthOf(13);
        expect(tokenMatcher(result.tokens[0], DescriptionKey)).to.be.true;
        expect(result.tokens[0].image).to.equal("@description");
        expect(tokenMatcher(result.tokens[1], Colon)).to.be.true;
        expect(result.tokens[1].image).to.equal(":");
        expect(tokenMatcher(result.tokens[2], UnquotedString)).to.be.true;
        expect(result.tokens[2].image).to.equal("TEST");
        expect(tokenMatcher(result.tokens[3], TagKey)).to.be.true;
        expect(result.tokens[3].image).to.equal("@tags");
        expect(tokenMatcher(result.tokens[4], LSquare)).to.be.true;
        expect(result.tokens[4].image).to.equal("[");
        expect(tokenMatcher(result.tokens[5], UnquotedString)).to.be.true;
        expect(result.tokens[5].image).to.equal("TAG1");
        expect(tokenMatcher(result.tokens[6], Comma)).to.be.true;
        expect(result.tokens[6].image).to.equal(",");
        expect(tokenMatcher(result.tokens[7], UnquotedString)).to.be.true;
        expect(result.tokens[7].image).to.equal("123");
        expect(tokenMatcher(result.tokens[8], RSquare)).to.be.true;
        expect(result.tokens[8].image).to.equal("]");
        expect(tokenMatcher(result.tokens[9], CommandKey)).to.be.true;
        expect(result.tokens[9].image).to.equal("@command");
        expect(tokenMatcher(result.tokens[10], LCurly)).to.be.true;
        expect(result.tokens[10].image).to.equal("{"); 
        expect(tokenMatcher(result.tokens[11], UnquotedString)).to.be.true;
        expect(result.tokens[11].image).to.equal('COMMAND');
        expect(tokenMatcher(result.tokens[12], RCurly)).to.be.true;
        expect(result.tokens[12].image).to.equal("}");
    })

    it('should return a valid Key and QuotedString against the text separated by space', () => {
        const input = `@description : "TEST"
                       @tags [ "TAG1", "123" ]
                       @command { "COMMAND" }`
        const result = lex(input);

        expect(result.errors).to.be.empty;
        expect(result.tokens).to.have.lengthOf(13);
        expect(tokenMatcher(result.tokens[0], DescriptionKey)).to.be.true;
        expect(result.tokens[0].image).to.equal("@description");
        expect(tokenMatcher(result.tokens[1], Colon)).to.be.true;
        expect(result.tokens[1].image).to.equal(":");
        expect(tokenMatcher(result.tokens[2], QuotedString)).to.be.true;
        expect(result.tokens[2].image).to.equal('"TEST"');
        expect(tokenMatcher(result.tokens[3], TagKey)).to.be.true;
        expect(result.tokens[3].image).to.equal("@tags");
        expect(tokenMatcher(result.tokens[4], LSquare)).to.be.true;
        expect(result.tokens[4].image).to.equal("[");
        expect(tokenMatcher(result.tokens[5], QuotedString)).to.be.true;
        expect(result.tokens[5].image).to.equal('"TAG1"');
        expect(tokenMatcher(result.tokens[6], Comma)).to.be.true;
        expect(result.tokens[6].image).to.equal(",");
        expect(tokenMatcher(result.tokens[7], QuotedString)).to.be.true;
        expect(result.tokens[7].image).to.equal('"123"');
        expect(tokenMatcher(result.tokens[8], RSquare)).to.be.true;
        expect(result.tokens[8].image).to.equal("]");
        expect(tokenMatcher(result.tokens[9], CommandKey)).to.be.true;
        expect(result.tokens[9].image).to.equal("@command");
        expect(tokenMatcher(result.tokens[10], LCurly)).to.be.true;
        expect(result.tokens[10].image).to.equal("{"); 
        expect(tokenMatcher(result.tokens[11], QuotedString)).to.be.true;
        expect(result.tokens[11].image).to.equal('"COMMAND"');
        expect(tokenMatcher(result.tokens[12], RCurly)).to.be.true;
        expect(result.tokens[12].image).to.equal("}");
    })

    it('should return a valid Key and QuotedString against the text not separated by space', () => {
        const input = `@description:"TEST"
                       @tags["TAG1","123"]
                       @command{"COMMAND"}`
        const result = lex(input);

        expect(result.errors).to.be.empty;
        expect(result.tokens).to.have.lengthOf(13);
        expect(tokenMatcher(result.tokens[0], DescriptionKey)).to.be.true;
        expect(result.tokens[0].image).to.equal("@description");
        expect(tokenMatcher(result.tokens[1], Colon)).to.be.true;
        expect(result.tokens[1].image).to.equal(":");
        expect(tokenMatcher(result.tokens[2], QuotedString)).to.be.true;
        expect(result.tokens[2].image).to.equal('"TEST"');
        expect(tokenMatcher(result.tokens[3], TagKey)).to.be.true;
        expect(result.tokens[3].image).to.equal("@tags");
        expect(tokenMatcher(result.tokens[4], LSquare)).to.be.true;
        expect(result.tokens[4].image).to.equal("[");
        expect(tokenMatcher(result.tokens[5], QuotedString)).to.be.true;
        expect(result.tokens[5].image).to.equal('"TAG1"');
        expect(tokenMatcher(result.tokens[6], Comma)).to.be.true;
        expect(result.tokens[6].image).to.equal(",");
        expect(tokenMatcher(result.tokens[7], QuotedString)).to.be.true;
        expect(result.tokens[7].image).to.equal('"123"');
        expect(tokenMatcher(result.tokens[8], RSquare)).to.be.true;
        expect(result.tokens[8].image).to.equal("]");
        expect(tokenMatcher(result.tokens[9], CommandKey)).to.be.true;
        expect(result.tokens[9].image).to.equal("@command");
        expect(tokenMatcher(result.tokens[10], LCurly)).to.be.true;
        expect(result.tokens[10].image).to.equal("{"); 
        expect(tokenMatcher(result.tokens[11], QuotedString)).to.be.true;
        expect(result.tokens[11].image).to.equal('"COMMAND"');
        expect(tokenMatcher(result.tokens[12], RCurly)).to.be.true;
        expect(result.tokens[12].image).to.equal("}");
    })

    it('should return a valid QuotedString having Token', () => {
        const input = `",:{ABC[123]} "TEST`;
        const result = lex(input);

        expect(result.errors).to.be.empty;
        expect(result.tokens).to.have.lengthOf(2);
        expect(tokenMatcher(result.tokens[0], QuotedString)).to.be.true;
        expect(result.tokens[0].image).to.equal('",:{ABC[123]} "');
        expect(tokenMatcher(result.tokens[1], UnquotedString)).to.be.true;
        expect(result.tokens[1].image).to.equal('TEST');
    })

    it('should return a valid Token as separated', () => {
        const input = ` ,:{ABC[123]} TEST`;
        const result = lex(input);

        expect(result.errors).to.be.empty;
        expect(result.tokens).to.have.lengthOf(9);
        expect(tokenMatcher(result.tokens[0], Comma)).to.be.true;
        expect(result.tokens[0].image).to.equal(",");
        expect(tokenMatcher(result.tokens[1], Colon)).to.be.true;
        expect(result.tokens[1].image).to.equal(":");
        expect(tokenMatcher(result.tokens[2], LCurly)).to.be.true;
        expect(result.tokens[2].image).to.equal("{");
        expect(tokenMatcher(result.tokens[3], UnquotedString)).to.be.true;
        expect(result.tokens[3].image).to.equal("ABC");
        expect(tokenMatcher(result.tokens[4], LSquare)).to.be.true;
        expect(result.tokens[4].image).to.equal("[");
        expect(tokenMatcher(result.tokens[5], UnquotedString)).to.be.true;
        expect(result.tokens[5].image).to.equal("123");
        expect(tokenMatcher(result.tokens[6], RSquare)).to.be.true;
        expect(result.tokens[6].image).to.equal("]");
        expect(tokenMatcher(result.tokens[7], RCurly)).to.be.true;
        expect(result.tokens[7].image).to.equal("}");
        expect(tokenMatcher(result.tokens[8], UnquotedString)).to.be.true;
        expect(result.tokens[8].image).to.equal('TEST');
    })

    it('should return a valid Key on QuatedString', () => {
        const input = `"a\"b"`;
        const result = lex(input); 

        expect(result.errors).to.be.empty;
        expect(result.tokens).to.have.lengthOf(2);
        expect(tokenMatcher(result.tokens[0], QuotedString)).to.be.true;
        expect(result.tokens[0].image).to.equal('"a"');
        expect(tokenMatcher(result.tokens[1], UnquotedString)).to.be.true;
        expect(result.tokens[1].image).to.equal('b"');
    })

    it('should return a Key and QuatedString', () => {
        const input = `@description"TEST"{ABC}`;
        const result = lex(input);

        expect(result.errors).to.be.empty;
        expect(result.tokens).to.have.lengthOf(5);
        expect(tokenMatcher(result.tokens[0], DescriptionKey)).to.be.true;
        expect(result.tokens[0].image).to.equal("@description");
        expect(tokenMatcher(result.tokens[1], QuotedString)).to.be.true;
        expect(result.tokens[1].image).to.equal('"TEST"');
        expect(tokenMatcher(result.tokens[2], LCurly)).to.be.true;
        expect(result.tokens[2].image).to.equal("{");
        expect(tokenMatcher(result.tokens[3], UnquotedString)).to.be.true;
        expect(result.tokens[3].image).to.equal("ABC");
        expect(tokenMatcher(result.tokens[4], RCurly)).to.be.true;
        expect(result.tokens[4].image).to.equal("}");
    })

    it('should return a Key and UnquatedString', () => {
        const input = `@tagsTEST[ABC]`;
        const result = lex(input);

        expect(result.errors).to.be.empty;
        expect(result.tokens).to.have.lengthOf(5);
        expect(tokenMatcher(result.tokens[0], TagKey)).to.be.true;
        expect(result.tokens[0].image).to.equal("@tags");
        expect(tokenMatcher(result.tokens[1], UnquotedString)).to.be.true;
        expect(result.tokens[1].image).to.equal("TEST");
        expect(tokenMatcher(result.tokens[2], LSquare)).to.be.true;
        expect(result.tokens[2].image).to.equal("[");
        expect(tokenMatcher(result.tokens[3], UnquotedString)).to.be.true;
        expect(result.tokens[3].image).to.equal("ABC");
        expect(tokenMatcher(result.tokens[4], RSquare)).to.be.true;
        expect(result.tokens[4].image).to.equal("]");
    })

    // As specification, any Key should be separated by new line.
    it('should return a Key when Key is not sepated by new line', () => {
        const input = `@commandTEST@tags@description@command`;
        const result = lex(input);

        expect(result.errors).to.be.empty;
        expect(result.tokens).to.have.lengthOf(2);
        expect(tokenMatcher(result.tokens[0], CommandKey)).to.be.true;
        expect(result.tokens[0].image).to.equal("@command");
        expect(tokenMatcher(result.tokens[1], UnquotedString)).to.be.true;
        expect(result.tokens[1].image).to.equal("TEST@tags@description@command");
    })
});