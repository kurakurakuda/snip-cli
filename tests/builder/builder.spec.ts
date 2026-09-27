import * as sinon from 'sinon';
import { expect, use } from 'chai';
import sinonChai from 'sinon-chai'; 
import { arg, 
    builder, 
    commandOption, 
    dependsOnOption, 
    descriptionOption, 
    option, 
    tagOption } from '../../src/builder/builder.ts';
import yargs from "yargs";

use(sinonChai);

describe('arg', () => {
    it('should return an IArg object with the correct key and description', () => {
        const key = 'testKey';
        const desc = 'This is a test description';
        const result = arg(key, desc);

        const { coerce, ...optWithoutCoerce } = result.opt;

         expect({
            key: result.key,
            opt: optWithoutCoerce
        }).to.deep.equal({
            key: 'testKey',
            opt: {
                type: 'string',
                describe: 'This is a test description'
            }
        });
        expect(coerce).to.be.a('function');
    });
});

describe('option', () => {
    it('should return an IOption object with the all properties', () => {
        const result = option('key', 'string', 'description', 'alias', 'required');

        expect(result).to.deep.equal({
            key: 'key',
            opt: {
                type: 'string',
                describe: 'description',
                alias: 'alias',
                demandOption: 'required',
                requiresArg: true
            }
        });
    });

    it('should dreturn an IOption object with the all mandatory properties', () => {
        const result = option('key', 'string', 'description');
        expect(result).to.deep.equal({
            key: 'key',
            opt: {
                type: 'string',
                describe: 'description',
                alias: undefined,
                demandOption: undefined,
                requiresArg: true
            }
        });
    });

    it('should dreturn an IOption object with type as string', () => {
        const result = option('key', 'string', 'description');
        expect(result).to.deep.equal({
            key: 'key',
            opt: {
                type: 'string',
                describe: 'description',
                alias: undefined,
                demandOption: undefined,
                requiresArg: true
            }
        });
    });

    it('should dreturn an IOption object with type as array', () => {
        const result = option('key', 'array', 'description');
        expect(result).to.deep.equal({
            key: 'key',
            opt: {
                type: 'array',
                describe: 'description',
                alias: undefined,
                demandOption: undefined,
                requiresArg: true
            }
        });
    });

    it('should dreturn an IOption object with type as boolean', () => {
        const result = option('key', 'boolean', 'description');
        expect(result).to.deep.equal({
            key: 'key',
            opt: {
                type: 'boolean',
                describe: 'description',
                alias: undefined,
                demandOption: undefined,
                requiresArg: false
            }
        });
    });
});

describe('commandOption', () => {
    it('should return an IOption object for the "command" key with alias "c" without error message', () => {
        const desc = 'Command description';
        const result = commandOption(desc);

        expect(result).to.deep.equal({
            key: 'command',
            opt: {
                type: 'string',
                describe: desc,
                alias: 'c',
                demandOption: undefined,
                requiresArg: true
            }
        });
    });

    it('should return an IOption object for the "command" key with alias "c" with error message', () => {
        const desc = 'Command description';
        const errorMsg = 'A command is required.'
        const result = commandOption(desc, errorMsg);

        expect(result).to.deep.equal({
            key: 'command',
            opt: {
                type: 'string',
                describe: desc,
                alias: 'c',
                demandOption: errorMsg,
                requiresArg: true
            }
        });
    });
});

describe('descriptionOption', () => {
    it('should return an IOption object for the "description" key with alias "d"', () => {
        const desc = 'Description description';
        const result = descriptionOption(desc);

        expect(result).to.deep.equal({
            key: 'description',
            opt: {
                type: 'string',
                describe: desc,
                alias: 'd',
                demandOption: undefined,
                requiresArg: true
            }
        });
    });
});

describe('tagOption', () => {
    it('should return an IOption object for the "tag" key with alias "t" and type "array"', () => {
        const desc = 'Tag description';
        const result = tagOption(desc);

        expect(result).to.deep.equal({
            key: 'tag',
            opt: {
                type: 'array',
                describe: desc,
                alias: 't',
                demandOption: undefined,
                requiresArg: true
            }
        });
    });
});

describe('dependsOnOption', () => {
    it('should return an IOption object for the "depends-on" key with alias "p" and type "array"', () => {
        const desc = 'Tag description';
        const result = dependsOnOption(desc);

        expect(result).to.deep.equal({
            key: 'depends-on',
            opt: {
                type: 'array',
                describe: desc,
                alias: 'p',
                demandOption: undefined,
                requiresArg: true
            }
        });
    });
});

describe('builder', () => {
    it('should add positional arguments to yargs', () => {
        const mockYargs = yargs();
        const spy = sinon.spy(mockYargs, 'option') as unknown as sinon.SinonSpy<[key:string, options:yargs.Options], yargs.Argv>;

        const args = [arg('file', 'File description'), arg('name', 'Name description')];
        builder(mockYargs, args);

        const fileCall = spy.getCalls().find(call => call.args[0] === 'file');
        expect(fileCall).to.not.be.undefined;
        expect(fileCall!.args[1]).to.include({
            type: 'string',
            describe: 'File description'
        });
        expect(fileCall!.args[1].coerce).to.be.a('function');

        const nameCall = spy.getCalls().find(call => call.args[0] === 'name');
        expect(nameCall).to.not.be.undefined;
        expect(nameCall!.args[1]).to.include({
            type: 'string',
            describe: 'Name description'
        });
        expect(nameCall!.args[1].coerce).to.be.a('function');

        expect(spy.calledWithMatch('log', {
            type: 'boolean',
            describe: 'Output Log',
            alias: undefined,
            demandOption: undefined
        })).to.be.true;
    });

    it('returns an error when positional arguments is empty string', () => {
        const mockYargs = yargs();
        const spy = sinon.spy(mockYargs, 'option') as unknown as sinon.SinonSpy<[key:string, options:yargs.Options], yargs.Argv>;

        const args = [arg('file', 'File description')];
        builder(mockYargs, args);

        const fileCall = spy.getCalls().find(call => call.args[0] === 'file');
        expect(fileCall).to.not.be.undefined;
        expect(fileCall!.args[1]).to.include({
            type: 'string',
            describe: 'File description'
        });
        expect(fileCall!.args[1].coerce).to.be.a('function');

        // --- coerceの挙動を検証するパターン追加 ---
        const coerceFn = fileCall!.args[1].coerce!;
        expect(() => coerceFn("")).to.throw('Empty string is not allowed: file');
        expect(() => coerceFn('')).to.throw('Empty string is not allowed: file');
        expect(coerceFn("abc")).to.equal("abc");
    });

    it('should add options to yargs', () => {
        const mockYargs = yargs();
        const spy = sinon.spy(mockYargs, 'option') as unknown as sinon.SinonSpy<[key:string, options:yargs.Options], yargs.Argv>;

        const options = [commandOption('Command description', 'A command is required.'), descriptionOption('Description description')];
        builder(mockYargs, [], options);

        expect(spy.calledWithMatch('command', {
            alias: 'c',
            describe: 'Command description',
            type: 'string',
            string: undefined,
            demandOption: 'A command is required.'
        })).to.be.true;

        expect(spy.calledWithMatch('description', {
            alias: 'd',
            describe: 'Description description',
            type: 'string',
            string: undefined,
            demandOption: undefined
        })).to.be.true;

        expect(spy.calledWithMatch('log', {
            type: 'boolean',
            describe: 'Output Log',
            alias: undefined,
            demandOption: undefined
        })).to.be.true;
    });

    describe('check', () => {
        it('returns an error when a non-array option receives multiple values', () => {
            let capturedCheck: ((args: any) => any) | undefined;
    
            const mockYargs = {
                positional: sinon.stub(),
                option: sinon.stub(),
                check(cb: (args: any) => any) {
                    capturedCheck = cb;
                    return mockYargs;
                }
            } as unknown as yargs.Argv;
    
            const opts = [ option('description', 'string', 'desc') ];
            builder(mockYargs, [], opts);
    
            // capturedCheck should be registered
            expect(capturedCheck).to.be.a('function');
    
            const result = capturedCheck!({ description: ['a', 'b'] });
            expect(result).to.equal('A description does not accept multiple values');
        });
    
        it('returns true when an array option receives multiple values', () => {
            let capturedCheck: ((args: any) => any) | undefined;
    
            const mockYargs = {
                positional: sinon.stub(),
                option: sinon.stub(),
                check(cb: (args: any) => any) {
                    capturedCheck = cb;
                    return mockYargs;
                }
            } as unknown as yargs.Argv;
    
            const opts = [ option('tag', 'array', 'desc') ];
            builder(mockYargs, [], opts);
    
            expect(capturedCheck).to.be.a('function');
    
            const result = capturedCheck!({ tag: ['a', 'b'] });
            expect(result).to.equal(true);
        });

        it('returns an error when an option is not set', () => {
            let capturedCheck: ((args: any) => any) | undefined;
    
            const mockYargs = {
                positional: sinon.stub(),
                option: sinon.stub(),
                check(cb: (args: any) => any) {
                    capturedCheck = cb;
                    return mockYargs;
                }
            } as unknown as yargs.Argv;
    
            builder(mockYargs, [], []);
    
            // capturedCheck should be registered
            expect(capturedCheck).to.be.a('function');
    
            const result = capturedCheck!({});
            expect(result).to.equal(true);
        });
    });
});
