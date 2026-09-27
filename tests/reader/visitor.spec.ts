import { expect } from 'chai';
import { snipToJson } from '../../src/reader/visitor.ts';

describe('visitor', () => {
    describe('description', () => {
        it('should generate SnipCommand against description key with QuotedString', () => {
            const input = `@description: "This is a test description"`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.description).to.equal('This is a test description');
        });

        it('should generate SnipCommand against description key with UnquotedString', () => {
            const input = `@description: description`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.description).to.equal('description');
        });

        it('should generate SnipCommand against description key + colon without value', () => {
            const input = `@description:`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.description).to.be.undefined;
        });

        it('should generate SnipCommand against description key without value', () => {
            const input = `@description`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.description).to.be.undefined;
        });

        it('should generate SnipCommand against mu;tiple description key', () => {
            const input = `@description: "description1"
                            @description: "description2"`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.description).to.equal('description2');
        });

        it('should fail to generate SnipCommand against the input combined with description key and value without colon', () => {
            const input = `@description FAILURE`;

            try {
                const snipCommand = snipToJson(input)
                expect.fail('Expected to fail');
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
                expect((error as Error).message).to.include('Error is occurred while parsing.');    
            }
        });
    })

    describe('TagKey', () => {
        it('should generate SnipCommand against tag key with array having one item', () => {
            const input = `@tags:[dev]`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.tags).to.length(1);
            expect(snipCommand.tags[0]).to.be.equal('dev');
        });

        it('should generate SnipCommand against tag key with array having multiple items', () => {
            const input = `@tags:["dev", utils]`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.tags).to.length(2);
            expect(snipCommand.tags[0]).to.be.equal('dev');
            expect(snipCommand.tags[1]).to.be.equal('utils');
        });

        it('should generate SnipCommand against tag key with empty array', () => {
            const input = `@tags:[]`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.tags).to.be.undefined;
        });

        it('should generate SnipCommand against tag key with stringList having one item', () => {
            const input = `@tags:dev`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.tags).to.length(1);
            expect(snipCommand.tags[0]).to.be.equal('dev');
        });

        it('should generate SnipCommand against tag key with stringList having multiple items', () => {
            const input = `@tags: "dev", utils`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.tags).to.length(2);
            expect(snipCommand.tags[0]).to.be.equal('dev');
            expect(snipCommand.tags[1]).to.be.equal('utils');
        });

        it('should generate SnipCommand against tag key with empty stringList', () => {
            const input = `@tags: `;
            const snipCommand = snipToJson(input);
            expect(snipCommand.tags).to.be.undefined;
        });

        it('should generate SnipCommand against only tag key', () => {
            const input = `@tags`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.tags).to.be.undefined;
        });

            it('should generate SnipCommand against mulltiple tag key', () => {
            const input = `@tags: "dev", utils
                            @tags:[dev]`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.tags).to.length(1);
            expect(snipCommand.tags[0]).to.be.equal('dev');
        });

        it('should fail to generate SnipCommand against the input combined with tag key and value without colon', () => {
            const input = `@tags {}`;

            try {
                const snipCommand = snipToJson(input)
                expect.fail('Expected to fail');
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
                expect((error as Error).message).to.include('Error is occurred while parsing.');    
            }
        });
    })

    describe('CommandKey', () => {
        it('should generate SnipCommand against commad key and command name and command block having string field(cmd / desc)', () => {
            const input = `@command: build { 
                                    cmd: "test value",
                                    "desc": description                                 
                                    }`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.commands).to.length(1);
            expect(snipCommand.commands[0].name).to.equal('build');
            expect(snipCommand.commands[0].command).to.equal('test value');
            expect(snipCommand.commands[0].description).to.equal('description');
            expect(snipCommand.commands[0].tags).to.be.undefined;
        });

        it('should generate SnipCommand against commad key and command name and command block having array field(tags / dependsOn)', () => {
            const input1 = `@command: build { 
                                    tags: [dev],
                                    depends_on: [build]                                   
                                    }`;
            const snipCommand1 = snipToJson(input1);
            expect(snipCommand1.commands).to.length(1);
            expect(snipCommand1.commands[0].name).to.equal('build');
            expect(snipCommand1.commands[0].command).to.be.undefined;
            expect(snipCommand1.commands[0].description).to.be.undefined;
            expect(snipCommand1.commands[0].tags).length(1);
            expect(snipCommand1.commands[0].tags[0]).to.equal('dev');
            expect(snipCommand1.commands[0].dependsOn).length(1);
            expect(snipCommand1.commands[0].dependsOn[0]).to.equal('build');

            const input2 = `@command: build { 
                                    tags: ["dev", utils],
                                    depends_on: [build, "ci"]                                  
                                    }`;
            const snipCommand2 = snipToJson(input2);
            expect(snipCommand2.commands).to.length(1);
            expect(snipCommand2.commands[0].name).to.equal('build');
            expect(snipCommand2.commands[0].command).to.be.undefined;
            expect(snipCommand2.commands[0].description).to.be.undefined;
            expect(snipCommand2.commands[0].tags).length(2);
            expect(snipCommand2.commands[0].tags[0]).to.equal('dev');
            expect(snipCommand2.commands[0].tags[1]).to.equal('utils');
            expect(snipCommand2.commands[0].dependsOn).length(2);
            expect(snipCommand2.commands[0].dependsOn[0]).to.equal('build');
            expect(snipCommand2.commands[0].dependsOn[1]).to.equal('ci');

            const input3 = `@command: build { 
                                    tags: [],
                                    depends_on: []                                 
                                    }`;
            const snipCommand3 = snipToJson(input3);
            expect(snipCommand3.commands).to.length(1);
            expect(snipCommand3.commands[0].name).to.equal('build');
            expect(snipCommand3.commands[0].command).to.be.undefined;
            expect(snipCommand3.commands[0].description).to.be.undefined;
            expect(snipCommand3.commands[0].tags).to.be.undefined;
            expect(snipCommand3.commands[0].dependsOn).to.be.undefined;

            const input4 = `@command: build { 
                                    tags: [  ],
                                    depends_on: [ ]                                 
                                    }`;
            const snipCommand4 = snipToJson(input4);
            expect(snipCommand4.commands).to.length(1);
            expect(snipCommand4.commands[0].name).to.equal('build');
            expect(snipCommand4.commands[0].command).to.be.undefined;
            expect(snipCommand4.commands[0].description).to.be.undefined;
            expect(snipCommand4.commands[0].tags).to.be.undefined;

            const input5 = `@command: build { 
                                    tags: dev,
                                    depends_on: build                                   
                                    }`;
            const snipCommand5 = snipToJson(input5);
            expect(snipCommand5.commands).to.length(1);
            expect(snipCommand5.commands[0].name).to.equal('build');
            expect(snipCommand5.commands[0].command).to.be.undefined;
            expect(snipCommand5.commands[0].description).to.be.undefined;
            expect(snipCommand5.commands[0].tags).length(1);
            expect(snipCommand5.commands[0].tags[0]).to.equal('dev');
            expect(snipCommand5.commands[0].dependsOn).length(1);
            expect(snipCommand5.commands[0].dependsOn[0]).to.equal('build');
        });

        it('should generate SnipCommand against commad key and command name and multiple command block', () => {
            const input = `@command: build { 
                                    cmd: "test value",
                                    "desc": description,
                                    tags: [dev],
                                    depends_on: [build]                             
                                    }
                            @command: deploy { 
                                    cmd: "sample command"                            
                                    }`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.commands).to.length(2);
            expect(snipCommand.commands[0].name).to.equal('build');
            expect(snipCommand.commands[0].command).to.equal('test value');
            expect(snipCommand.commands[0].description).to.equal('description');
            expect(snipCommand.commands[0].tags).length(1);
            expect(snipCommand.commands[0].tags[0]).to.equal('dev');
            expect(snipCommand.commands[0].dependsOn).length(1);
            expect(snipCommand.commands[0].dependsOn[0]).to.equal('build');
            expect(snipCommand.commands[1].name).to.equal('deploy');
            expect(snipCommand.commands[1].command).to.equal('sample command');
            expect(snipCommand.commands[1].description).to.be.undefined;
            expect(snipCommand.commands[1].tags).to.be.undefined;
            expect(snipCommand.commands[1].dependsOn).to.be.undefined;
        });

        it('should generate SnipCommand against commad key and command name and empty command block', () => {
            const input = `@command: build {}`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.commands).to.length(1);
            expect(snipCommand.commands[0].name).to.equal('build');
            expect(snipCommand.commands[0].command).to.be.undefined;
            expect(snipCommand.commands[0].description).to.be.undefined;
            expect(snipCommand.commands[0].tags).to.be.undefined;
        });

        it('should generate SnipCommand against commad key and command name', () => {
            const input = `@command: build`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.commands).to.length(1);
            expect(snipCommand.commands[0].name).to.equal('build');
            expect(snipCommand.commands[0].command).to.be.undefined;
            expect(snipCommand.commands[0].description).to.be.undefined;
            expect(snipCommand.commands[0].tags).to.be.undefined;
        });

        it('should generate SnipCommand against commad key', () => {
            const input = `@command:`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.commands).to.length(1);
            expect(snipCommand.commands[0].name).to.be.undefined;
            expect(snipCommand.commands[0].command).to.be.undefined;
            expect(snipCommand.commands[0].description).to.be.undefined;
            expect(snipCommand.commands[0].tags).to.be.undefined;
        });

        it('should generate SnipCommand against commad key without colon', () => {
            const input = `@command`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.commands).to.length(1);
            expect(snipCommand.commands[0].name).to.be.undefined;
            expect(snipCommand.commands[0].command).to.be.undefined;
            expect(snipCommand.commands[0].description).to.be.undefined;
            expect(snipCommand.commands[0].tags).to.be.undefined;
        });

        it('should fail to generate SnipCommand against in case command name does not exist', () => {
            const input1 = `@command: { key: "value" }`;
            try {
                snipToJson(input1);
                expect.fail('Expected parsing to fail');
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
                expect((error as Error).message).to.include('Error is occurred. error:');    
            }
        });
    })

    describe('Combination', () => {
        it('should generate SnipCommand against single description, tags and command key', () => {
            const input = `@command: build {
                                cmd: "test value"
                            }
                            @description: "sample description"
                            @tags: dev
                            `;
            const snipCommand = snipToJson(input);
            expect(snipCommand.description).to.equal('sample description');
            expect(snipCommand.tags).to.length(1);
            expect(snipCommand.tags[0]).to.be.equal('dev');
            expect(snipCommand.commands).to.length(1);
            expect(snipCommand.commands[0].name).to.equal('build');
            expect(snipCommand.commands[0].command).to.equal('test value');
            expect(snipCommand.commands[0].description).to.be.undefined;
            expect(snipCommand.commands[0].tags).to.be.undefined;
        })

        it('should generate SnipCommand against multiple description, tags and command key', () => {
            const input = `@command: build {
                                cmd: "test value"
                            }
                            @tags: utils
                            @description: "sample description"
                            @tags: ["dev"]
                            @description: "testd description"
                            @command: deploy {
                                cmd: "test value",
                                "desc": description,
                                tags: [prod],
                                depends_on: ["ci cd"] 
                            }`;
            const snipCommand = snipToJson(input);
            expect(snipCommand.description).to.equal('testd description');
            expect(snipCommand.tags).to.length(1);
            expect(snipCommand.tags[0]).to.be.equal('dev');
            expect(snipCommand.commands).to.length(2);
            expect(snipCommand.commands[0].name).to.equal('build');
            expect(snipCommand.commands[0].command).to.equal('test value');
            expect(snipCommand.commands[0].description).to.be.undefined;
            expect(snipCommand.commands[0].tags).to.be.undefined;
            expect(snipCommand.commands[0].dependsOn).to.be.undefined;
            expect(snipCommand.commands[1].name).to.equal('deploy');
            expect(snipCommand.commands[1].command).to.equal('test value');
            expect(snipCommand.commands[1].description).to.equal('description');
            expect(snipCommand.commands[1].tags).length(1);
            expect(snipCommand.commands[1].tags[0]).to.equal('prod');
            expect(snipCommand.commands[1].dependsOn).length(1);
            expect(snipCommand.commands[1].dependsOn[0]).to.equal('ci cd');
        })
    })
})