import { expect } from 'chai';
import { parseInput } from '../../src/reader/parser.ts';
import { CstNode, IToken } from 'chevrotain';

const verifyNodeName = (node: CstNode, expectedName: string) => expect(node.name).to.equal(expectedName);
const verifyNodeImage = (node: CstNode, tokenName: string, expectedImage: string) =>  expect((node.children[tokenName][0] as IToken).image).to.equal(expectedImage);

describe('parser', () => {
    const verifyAst  = (cst: CstNode) => verifyNodeName(cst, 'ast');
    const verifyColon = (node: CstNode) =>  verifyNodeImage(node, 'Colon', ':');

    // TODO astのMANY > ORのテストも要追加
    describe('DescriptionKey', () => {
        it('should parse description key with QuotedString', () => {
            const input = `@description: "This is a test description"`;
            const cst = parseInput(input);
            verifyAst(cst);

            const descriptionNode = cst.children.descriptions[0] as CstNode;
            verifyNodeName(descriptionNode, 'description');
            verifyNodeImage(descriptionNode, 'DescriptionKey', '@description');
            verifyColon(descriptionNode);

            const descriptionValueNode = descriptionNode.children.description[0] as CstNode;
            verifyNodeName(descriptionValueNode, 'flexibleString');
            verifyNodeImage(descriptionValueNode, 'QuotedString', '"This is a test description"');
        });

        it('should parse description key with UnquotedString', () => {
            const input = `@description: description`;
            const cst = parseInput(input);
            verifyAst(cst);

            const descriptionNode = cst.children.descriptions[0] as CstNode;
            verifyNodeName(descriptionNode, 'description');
            verifyNodeImage(descriptionNode, 'DescriptionKey', '@description');
            verifyColon(descriptionNode);

            const descriptionValueNode = descriptionNode.children.description[0] as CstNode;
            verifyNodeName(descriptionValueNode, 'flexibleString');
            verifyNodeImage(descriptionValueNode, 'UnquotedString', 'description');
        });

        it('should parse description key + colon without value', () => {
            const input = `@description:`;
            const cst = parseInput(input);
            verifyAst(cst);

            const descriptionNode = cst.children.descriptions[0] as CstNode;
            verifyNodeName(descriptionNode, 'description');
            verifyNodeImage(descriptionNode, 'DescriptionKey', '@description');
            verifyColon(descriptionNode);
            expect(descriptionNode.children.description).to.be.undefined;
        });

        it('should parse description key without value', () => {
            const input = `@description`;
            const cst = parseInput(input);
            verifyAst(cst);

            const descriptionNode = cst.children.descriptions[0] as CstNode;
            verifyNodeName(descriptionNode, 'description');
            verifyNodeImage(descriptionNode, 'DescriptionKey', '@description');
            expect(descriptionNode.children.description).to.be.undefined;
        });

        it('should fail to parse the input combined with description key and value without colon', () => {
            const input = `@description FAILURE`;

            try {
                parseInput(input);
                expect.fail('Expected parsing to fail');
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
                expect((error as Error).message).to.include('Error is occurred. error:');    
            }
        });
    })

    describe('TagKey', () => {
        it('should parse tag key with array having one item', () => {
            const input = `@tags:[dev]`;
            const cst = parseInput(input);
            verifyAst(cst);

            const tagsNode = cst.children.tags[0] as CstNode;
            verifyNodeName(tagsNode, 'tag');
            verifyNodeImage(tagsNode, 'TagKey', '@tags');
            verifyColon(tagsNode);

            const tagValuesNode = tagsNode.children.tags[0] as CstNode;
            verifyNodeName(tagValuesNode, 'flexibleList');

            const arrayNode = tagValuesNode.children.array[0] as CstNode;
            verifyNodeName(arrayNode, 'array');
            verifyNodeImage(arrayNode, 'LSquare', '[');
            verifyNodeImage(arrayNode, 'RSquare', ']');

            const flexibleStringNode = arrayNode.children.flexibleString[0] as CstNode;
            verifyNodeName(flexibleStringNode, 'flexibleString');
            verifyNodeImage(flexibleStringNode, 'UnquotedString', 'dev');
        });

        it('should parse tag key with array having multiple items', () => {
            const input = `@tags:["dev", utils]`;
            const cst = parseInput(input);
            verifyAst(cst);

            const tagsNode = cst.children.tags[0] as CstNode;
            verifyNodeName(tagsNode, 'tag');
            verifyNodeImage(tagsNode, 'TagKey', '@tags');
            verifyColon(tagsNode);

            const tagValuesNode = tagsNode.children.tags[0] as CstNode;
            verifyNodeName(tagValuesNode, 'flexibleList');

            const arrayNode = tagValuesNode.children.array[0] as CstNode;
            verifyNodeName(arrayNode, 'array');
            verifyNodeImage(arrayNode, 'LSquare', '[');
            verifyNodeImage(arrayNode, 'RSquare', ']');

            const flexibleStringNode1 = arrayNode.children.flexibleString[0] as CstNode;
            verifyNodeName(flexibleStringNode1, 'flexibleString');
            verifyNodeImage(flexibleStringNode1, 'QuotedString', '"dev"');
            const flexibleStringNode2 = arrayNode.children.flexibleString[1] as CstNode;
            verifyNodeName(flexibleStringNode2, 'flexibleString');
            verifyNodeImage(flexibleStringNode2, 'UnquotedString', 'utils');
        });

        it('should parse tag key with empty array', () => {
            const input = `@tags:[]`;
            const cst = parseInput(input);
            verifyAst(cst);

            const tagsNode = cst.children.tags[0] as CstNode;
            verifyNodeName(tagsNode, 'tag');
            verifyNodeImage(tagsNode, 'TagKey', '@tags');
            verifyColon(tagsNode);

            const tagValuesNode = tagsNode.children.tags[0] as CstNode;
            verifyNodeName(tagValuesNode, 'flexibleList');

            const arrayNode = tagValuesNode.children.array[0] as CstNode;
            verifyNodeName(arrayNode, 'array');
            verifyNodeImage(arrayNode, 'LSquare', '[');
            verifyNodeImage(arrayNode, 'RSquare', ']');

            expect(arrayNode.children.flexibleString).to.be.undefined;
        });

        it('should parse tag key with stringList having one item', () => {
            const input = `@tags:dev`;
            const cst = parseInput(input);
            verifyAst(cst);

            const tagsNode = cst.children.tags[0] as CstNode;
            verifyNodeName(tagsNode, 'tag');
            verifyNodeImage(tagsNode, 'TagKey', '@tags');
            verifyColon(tagsNode);

            const tagValuesNode = tagsNode.children.tags[0] as CstNode;
            verifyNodeName(tagValuesNode, 'flexibleList');

            const stringListNode = tagValuesNode.children.stringList[0] as CstNode;
            verifyNodeName(stringListNode, 'stringList');

            const flexibleStringNode = stringListNode.children.flexibleString[0] as CstNode;
            verifyNodeName(flexibleStringNode, 'flexibleString');
            verifyNodeImage(flexibleStringNode, 'UnquotedString', 'dev');
        });

        it('should parse tag key with stringList having multiple items', () => {
            const input = `@tags: "dev is ...", utils`;
            const cst = parseInput(input);
            verifyAst(cst);

            const tagsNode = cst.children.tags[0] as CstNode;
            verifyNodeName(tagsNode, 'tag');
            verifyNodeImage(tagsNode, 'TagKey', '@tags');
            verifyColon(tagsNode);

            const tagValuesNode = tagsNode.children.tags[0] as CstNode;
            verifyNodeName(tagValuesNode, 'flexibleList');

            const stringListNode = tagValuesNode.children.stringList[0] as CstNode;
            verifyNodeName(stringListNode, 'stringList');

            const flexibleStringNode1 = stringListNode.children.flexibleString[0] as CstNode;
            verifyNodeName(flexibleStringNode1, 'flexibleString');
            verifyNodeImage(flexibleStringNode1, 'QuotedString', '"dev is ..."');
            const flexibleStringNode2 = stringListNode.children.flexibleString[1] as CstNode;
            verifyNodeName(flexibleStringNode2, 'flexibleString');
            verifyNodeImage(flexibleStringNode2, 'UnquotedString', 'utils');
        });

        it('should parse tag key with empty stringList', () => {
            const input = `@tags: `;
            const cst = parseInput(input);
            verifyAst(cst);

            const tagsNode = cst.children.tags[0] as CstNode;
            verifyNodeName(tagsNode, 'tag');
            verifyNodeImage(tagsNode, 'TagKey', '@tags');
            verifyColon(tagsNode);

            const tagValuesNode = tagsNode.children.tags[0] as CstNode;
            verifyNodeName(tagValuesNode, 'flexibleList');

            const stringListNode = tagValuesNode.children.stringList[0] as CstNode;
            verifyNodeName(stringListNode, 'stringList');
            expect(stringListNode.children.flexibleString).to.be.undefined;
        });

        it('should parse only tag key', () => {
            const input = `@tags`;
            const cst = parseInput(input);
            verifyAst(cst);

            const tagsNode = cst.children.tags[0] as CstNode;
            verifyNodeName(tagsNode, 'tag');
            verifyNodeImage(tagsNode, 'TagKey', '@tags');

            expect(tagsNode.children.tags).to.be.undefined;
        });

        it('should fail to parse the input combined with tag key and value without colon', () => {
            const input = `@tags {}`;

            try {
                parseInput(input);
                expect.fail('Expected parsing to fail');
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
                expect((error as Error).message).to.include('Error is occurred. error:');    
            }
        });
    })

    describe('CommandKey', () => {
        it('should parse commad key and command name and command block having one objectItem', () => {
            const input = `@command: build { key: "value" }`;
            const cst = parseInput(input);
            verifyAst(cst);

            const commandNode = cst.children.commands[0] as CstNode;
            verifyNodeName(commandNode, 'command');
            verifyNodeImage(commandNode, 'CommandKey', '@command');
            verifyColon(commandNode);
            verifyNodeImage(commandNode, 'commandName', 'build');

            const commandBlockNode = commandNode.children.commandBlock[0] as CstNode;
            verifyNodeName(commandBlockNode, 'object');
            verifyNodeImage(commandBlockNode, 'LCurly', '{');
            verifyNodeImage(commandBlockNode, 'RCurly', '}');
            verifyColon(commandNode);

            const objectItemNode = commandBlockNode.children.objectItem[0] as CstNode;
            verifyNodeName(objectItemNode, 'objectItem');
            verifyColon(objectItemNode);

            const objectItemKeyNode = objectItemNode.children.flexibleString[0] as CstNode;
            verifyNodeName(objectItemKeyNode, 'flexibleString');
            verifyNodeImage(objectItemKeyNode, 'UnquotedString', 'key');

            const objectItemValueNode = objectItemNode.children.value[0] as CstNode;
            verifyNodeName(objectItemValueNode, 'value');

            const valueNode = objectItemValueNode.children.flexibleString[0] as CstNode;
            verifyNodeName(valueNode, 'flexibleString');
            verifyNodeImage(valueNode, 'QuotedString', '"value"');
        });

        it('should parse commad key and command name and command block having multiple objectItems', () => {
            const input = `@command: build { 
                                        "key": value,
                                        array1: [abc],
                                        "array2": [1, "2"],
                                        array3: [],
                                        "obj1": { abc: "def" },
                                        obj2: {}
                                     }`;
            const cst = parseInput(input);
            verifyAst(cst);

            const commandNode = cst.children.commands[0] as CstNode;
            verifyNodeName(commandNode, 'command');
            verifyNodeImage(commandNode, 'CommandKey', '@command');
            verifyColon(commandNode);
            verifyNodeImage(commandNode, 'commandName', 'build');

            const commandBlockNode = commandNode.children.commandBlock[0] as CstNode;
            verifyNodeName(commandBlockNode, 'object');
            verifyNodeImage(commandBlockNode, 'LCurly', '{');
            verifyNodeImage(commandBlockNode, 'RCurly', '}');
            verifyColon(commandNode);

            // Item 1
            const objectItemNode1 = commandBlockNode.children.objectItem[0] as CstNode;
            verifyNodeName(objectItemNode1, 'objectItem');
            verifyColon(objectItemNode1);

            const objectItemKeyNode1 = objectItemNode1.children.flexibleString[0] as CstNode;
            verifyNodeName(objectItemKeyNode1, 'flexibleString');
            verifyNodeImage(objectItemKeyNode1, 'QuotedString', '"key"');

            const objectItemValueNode1 = objectItemNode1.children.value[0] as CstNode;
            verifyNodeName(objectItemValueNode1, 'value');

            const valueNode1 = objectItemValueNode1.children.flexibleString[0] as CstNode;
            verifyNodeName(valueNode1, 'flexibleString');
            verifyNodeImage(valueNode1, 'UnquotedString', 'value');

            // Item 2
            const objectItemNode2 = commandBlockNode.children.objectItem[1] as CstNode;
            verifyNodeName(objectItemNode2, 'objectItem');
            verifyColon(objectItemNode2);

            const objectItemKeyNode2 = objectItemNode2.children.flexibleString[0] as CstNode;
            verifyNodeName(objectItemKeyNode2, 'flexibleString');
            verifyNodeImage(objectItemKeyNode2, 'UnquotedString', 'array1');

            const objectItemValueNode2 = objectItemNode2.children.value[0] as CstNode;
            verifyNodeName(objectItemValueNode2, 'value');

            const valueNode2 = objectItemValueNode2.children.array[0] as CstNode;
            verifyNodeName(valueNode2, 'array');
            verifyNodeImage(valueNode2, 'LSquare', '[');
            verifyNodeImage(valueNode2, 'RSquare', ']');

            const flexibleStringNode2 = valueNode2.children.flexibleString[0] as CstNode;
            verifyNodeName(flexibleStringNode2, 'flexibleString');
            verifyNodeImage(flexibleStringNode2, 'UnquotedString', 'abc');

            // Item 3
            const objectItemNode3 = commandBlockNode.children.objectItem[2] as CstNode;
            verifyNodeName(objectItemNode3, 'objectItem');
            verifyColon(objectItemNode3);

            const objectItemKeyNode3 = objectItemNode3.children.flexibleString[0] as CstNode;
            verifyNodeName(objectItemKeyNode3, 'flexibleString');
            verifyNodeImage(objectItemKeyNode3, 'QuotedString', '"array2"');

            const objectItemValueNode3 = objectItemNode3.children.value[0] as CstNode;
            verifyNodeName(objectItemValueNode3, 'value');

            const valueNode3 = objectItemValueNode3.children.array[0] as CstNode;
            verifyNodeName(valueNode3, 'array');
            verifyNodeImage(valueNode3, 'LSquare', '[');
            verifyNodeImage(valueNode3, 'RSquare', ']');
            const flexibleStringNode3_1 = valueNode3.children.flexibleString[0] as CstNode;
            verifyNodeName(flexibleStringNode3_1, 'flexibleString');
            verifyNodeImage(flexibleStringNode3_1, 'UnquotedString', '1');
            const flexibleStringNode3_2 = valueNode3.children.flexibleString[1] as CstNode;
            verifyNodeName(flexibleStringNode3_2, 'flexibleString');
            verifyNodeImage(flexibleStringNode3_2, 'QuotedString', '"2"');

            // Item 4
            const objectItemNode4 = commandBlockNode.children.objectItem[3] as CstNode;
            verifyNodeName(objectItemNode4, 'objectItem');
            verifyColon(objectItemNode4);

            const objectItemKeyNode4 = objectItemNode4.children.flexibleString[0] as CstNode;
            verifyNodeName(objectItemKeyNode4, 'flexibleString');
            verifyNodeImage(objectItemKeyNode4, 'UnquotedString', 'array3');

            const objectItemValueNode4 = objectItemNode4.children.value[0] as CstNode;
            verifyNodeName(objectItemValueNode4, 'value');

            const valueNode4 = objectItemValueNode4.children.array[0] as CstNode;
            verifyNodeName(valueNode4, 'array');
            verifyNodeImage(valueNode4, 'LSquare', '[');
            verifyNodeImage(valueNode4, 'RSquare', ']');
            expect(valueNode4.children.flexibleString).to.be.undefined;

            // Item 5
            const objectItemNode5 = commandBlockNode.children.objectItem[4] as CstNode;
            verifyNodeName(objectItemNode5, 'objectItem');
            verifyColon(objectItemNode5);

            const objectItemKeyNode5 = objectItemNode5.children.flexibleString[0] as CstNode;
            verifyNodeName(objectItemKeyNode5, 'flexibleString');
            verifyNodeImage(objectItemKeyNode5, 'QuotedString', '"obj1"');

            const objectItemValueNode5 = objectItemNode5.children.value[0] as CstNode;
            verifyNodeName(objectItemValueNode5, 'value');

            const valueNode5 = objectItemValueNode5.children.object[0] as CstNode;
            verifyNodeName(valueNode5, 'object');
            verifyNodeImage(valueNode5, 'LCurly', '{');
            verifyNodeImage(valueNode5, 'RCurly', '}');

            const objectItemNode5_1 = valueNode5.children.objectItem[0] as CstNode;
            verifyNodeName(objectItemNode5_1, 'objectItem');
            verifyColon(objectItemNode5_1);
            const objectItemKeyNode5_1 = objectItemNode5_1.children.flexibleString[0] as CstNode;
            verifyNodeName(objectItemKeyNode5_1, 'flexibleString');
            verifyNodeImage(objectItemKeyNode5_1, 'UnquotedString', 'abc');
            const objectItemValueNode5_1 = objectItemNode5_1.children.value[0] as CstNode;
            verifyNodeName(objectItemValueNode5_1, 'value');

            // Item 6
            const objectItemNode6 = commandBlockNode.children.objectItem[5] as CstNode;
            verifyNodeName(objectItemNode6, 'objectItem');
            verifyColon(objectItemNode6);

            const objectItemKeyNode6 = objectItemNode6.children.flexibleString[0] as CstNode;
            verifyNodeName(objectItemKeyNode6, 'flexibleString');
            verifyNodeImage(objectItemKeyNode6, 'UnquotedString', 'obj2');

            const objectItemValueNode6 = objectItemNode6.children.value[0] as CstNode;
            verifyNodeName(objectItemValueNode6, 'value');
            const valueNode6 = objectItemValueNode6.children.object[0] as CstNode;
            verifyNodeName(valueNode6, 'object');
            verifyNodeImage(valueNode6, 'LCurly', '{');
            verifyNodeImage(valueNode6, 'RCurly', '}');
            expect(valueNode6.children.objectItem).to.be.undefined;
        });

        it('should parse commad key and command name and empty command block', () => {
            const input = `@command: build {}`;
            const cst = parseInput(input);
            verifyAst(cst);

            const commandNode = cst.children.commands[0] as CstNode;
            verifyNodeName(commandNode, 'command');
            verifyNodeImage(commandNode, 'CommandKey', '@command');
            verifyColon(commandNode);
            verifyNodeImage(commandNode, 'commandName', 'build');

            const commandBlockNode = commandNode.children.commandBlock[0] as CstNode;
            verifyNodeName(commandBlockNode, 'object');
            verifyNodeImage(commandBlockNode, 'LCurly', '{');
            verifyNodeImage(commandBlockNode, 'RCurly', '}');
            verifyColon(commandNode);
            expect(commandBlockNode.children.objectItem).to.be.undefined;
        });

        it('should parse commad key and command name', () => {
            const input = `@command: build`;
            const cst = parseInput(input);
            verifyAst(cst);

            const commandNode = cst.children.commands[0] as CstNode;
            verifyNodeName(commandNode, 'command');
            verifyNodeImage(commandNode, 'CommandKey', '@command');
            verifyColon(commandNode);
            verifyNodeImage(commandNode, 'commandName', 'build');
            expect(commandNode.children.commandBlock).to.be.undefined;
        });

        it('should parse commad key', () => {
            const input = `@command:`;
            const cst = parseInput(input);
            verifyAst(cst);

            const commandNode = cst.children.commands[0] as CstNode;
            verifyNodeName(commandNode, 'command');
            verifyNodeImage(commandNode, 'CommandKey', '@command');
            verifyColon(commandNode);
            expect(commandNode.children.commandName).to.be.undefined;
            expect(commandNode.children.commandBlock).to.be.undefined;
        });

        it('should parse commad key without colon', () => {
            const input = `@command`;
            const cst = parseInput(input);
            verifyAst(cst);

            const commandNode = cst.children.commands[0] as CstNode;
            verifyNodeName(commandNode, 'command');
            verifyNodeImage(commandNode, 'CommandKey', '@command');
            expect(commandNode.children.Colon).to.be.undefined;
            expect(commandNode.children.commandName).to.be.undefined;
            expect(commandNode.children.commandBlock).to.be.undefined;
        });

        it('should fail to parse in case command block is invalid', () => {
            const input1 = `@command: build { "key" }`;
            try {
                parseInput(input1);
                expect.fail('Expected parsing to fail');
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
                expect((error as Error).message).to.include('Error is occurred. error:');    
            }

            const input2 = `@command: build { array: 1, "2", }`;
            try {
                parseInput(input2);
                expect.fail('Expected parsing to fail');
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
                expect((error as Error).message).to.include('Error is occurred. error:');    
            }
        });

        it('should fail to parse in case command name does not exist', () => {
            const input1 = `@command: { key: "value" }`;
            try {
                parseInput(input1);
                expect.fail('Expected parsing to fail');
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
                expect((error as Error).message).to.include('Error is occurred. error:');    
            }
        });

        it('should fail to parse in case command name is quated', () => {
            const input1 = `@command: "build" { key: "value" }`;
            try {
                parseInput(input1);
                expect.fail('Expected parsing to fail');
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
                expect((error as Error).message).to.include('Error is occurred. error:');    
            }
        });
    })

    describe('Combination', () => {
        it('should parse single description, tags and command key', () => {
            const input = `@command: build {
                                key: "value"
                            }
                            @description: "sample description"
                            @tags: dev
                            `
            const cst = parseInput(input);
            verifyAst(cst);

            const descriptionNode = cst.children.descriptions[0] as CstNode;
            verifyNodeName(descriptionNode, 'description');
            verifyNodeImage(descriptionNode, 'DescriptionKey', '@description');
            verifyColon(descriptionNode);

            const descriptionValueNode = descriptionNode.children.description[0] as CstNode;
            verifyNodeName(descriptionValueNode, 'flexibleString');
            verifyNodeImage(descriptionValueNode, 'QuotedString', '"sample description"');

            const tagsNode = cst.children.tags[0] as CstNode;
            verifyNodeName(tagsNode, 'tag');
            verifyNodeImage(tagsNode, 'TagKey', '@tags');
            verifyColon(tagsNode);

            const tagValuesNode = tagsNode.children.tags[0] as CstNode;
            verifyNodeName(tagValuesNode, 'flexibleList');

            const stringListNode = tagValuesNode.children.stringList[0] as CstNode;
            verifyNodeName(stringListNode, 'stringList');

            const flexibleStringNode = stringListNode.children.flexibleString[0] as CstNode;
            verifyNodeName(flexibleStringNode, 'flexibleString');
            verifyNodeImage(flexibleStringNode, 'UnquotedString', 'dev');

            const commandNode = cst.children.commands[0] as CstNode;
            verifyNodeName(commandNode, 'command');
            verifyNodeImage(commandNode, 'CommandKey', '@command');
            verifyColon(commandNode);
            verifyNodeImage(commandNode, 'commandName', 'build');

            const commandBlockNode = commandNode.children.commandBlock[0] as CstNode;
            verifyNodeName(commandBlockNode, 'object');
            verifyNodeImage(commandBlockNode, 'LCurly', '{');
            verifyNodeImage(commandBlockNode, 'RCurly', '}');
            verifyColon(commandNode);

            const objectItemNode = commandBlockNode.children.objectItem[0] as CstNode;
            verifyNodeName(objectItemNode, 'objectItem');
            verifyColon(objectItemNode);

            const objectItemKeyNode = objectItemNode.children.flexibleString[0] as CstNode;
            verifyNodeName(objectItemKeyNode, 'flexibleString');
            verifyNodeImage(objectItemKeyNode, 'UnquotedString', 'key');

            const objectItemValueNode = objectItemNode.children.value[0] as CstNode;
            verifyNodeName(objectItemValueNode, 'value');

            const valueNode = objectItemValueNode.children.flexibleString[0] as CstNode;
            verifyNodeName(valueNode, 'flexibleString');
            verifyNodeImage(valueNode, 'QuotedString', '"value"');
        })

        it('should parse multiple description, tags and command key', () => {
            const input = `@command: build {
                                key: "value"
                            }
                            @tags: utils
                            @description: "sample description"
                            @tags: dev
                            @description: "testd description"
                            @command: build {
                                key2: "value2"
                            }
                            `
            const cst = parseInput(input);
            verifyAst(cst);

            const descriptionNode = cst.children.descriptions[0] as CstNode;
            verifyNodeName(descriptionNode, 'description');
            verifyNodeImage(descriptionNode, 'DescriptionKey', '@description');
            verifyColon(descriptionNode);

            const descriptionValueNode = descriptionNode.children.description[0] as CstNode;
            verifyNodeName(descriptionValueNode, 'flexibleString');
            verifyNodeImage(descriptionValueNode, 'QuotedString', '"sample description"');

            const descriptionNode2 = cst.children.descriptions[1] as CstNode;
            verifyNodeName(descriptionNode2, 'description');
            verifyNodeImage(descriptionNode2, 'DescriptionKey', '@description');
            verifyColon(descriptionNode2);

            const descriptionValueNode2 = descriptionNode2.children.description[0] as CstNode;
            verifyNodeName(descriptionValueNode2, 'flexibleString');
            verifyNodeImage(descriptionValueNode2, 'QuotedString', '"testd description"');

            const tagsNode = cst.children.tags[0] as CstNode;
            verifyNodeName(tagsNode, 'tag');
            verifyNodeImage(tagsNode, 'TagKey', '@tags');
            verifyColon(tagsNode);

            const tagValuesNode = tagsNode.children.tags[0] as CstNode;
            verifyNodeName(tagValuesNode, 'flexibleList');

            const stringListNode = tagValuesNode.children.stringList[0] as CstNode;
            verifyNodeName(stringListNode, 'stringList');

            const flexibleStringNode = stringListNode.children.flexibleString[0] as CstNode;
            verifyNodeName(flexibleStringNode, 'flexibleString');
            verifyNodeImage(flexibleStringNode, 'UnquotedString', 'utils');

            const tagsNode2 = cst.children.tags[1] as CstNode;
            verifyNodeName(tagsNode2, 'tag');
            verifyNodeImage(tagsNode2, 'TagKey', '@tags');
            verifyColon(tagsNode2);

            const tagValuesNode2 = tagsNode2.children.tags[0] as CstNode;
            verifyNodeName(tagValuesNode2, 'flexibleList');

            const stringListNode2 = tagValuesNode2.children.stringList[0] as CstNode;
            verifyNodeName(stringListNode2, 'stringList');

            const flexibleStringNode2 = stringListNode2.children.flexibleString[0] as CstNode;
            verifyNodeName(flexibleStringNode2, 'flexibleString');
            verifyNodeImage(flexibleStringNode2, 'UnquotedString', 'dev');

            const commandNode = cst.children.commands[0] as CstNode;
            verifyNodeName(commandNode, 'command');
            verifyNodeImage(commandNode, 'CommandKey', '@command');
            verifyColon(commandNode);
            verifyNodeImage(commandNode, 'commandName', 'build');

            const commandBlockNode = commandNode.children.commandBlock[0] as CstNode;
            verifyNodeName(commandBlockNode, 'object');
            verifyNodeImage(commandBlockNode, 'LCurly', '{');
            verifyNodeImage(commandBlockNode, 'RCurly', '}');
            verifyColon(commandNode);

            const objectItemNode = commandBlockNode.children.objectItem[0] as CstNode;
            verifyNodeName(objectItemNode, 'objectItem');
            verifyColon(objectItemNode);

            const objectItemKeyNode = objectItemNode.children.flexibleString[0] as CstNode;
            verifyNodeName(objectItemKeyNode, 'flexibleString');
            verifyNodeImage(objectItemKeyNode, 'UnquotedString', 'key');

            const objectItemValueNode = objectItemNode.children.value[0] as CstNode;
            verifyNodeName(objectItemValueNode, 'value');

            const valueNode = objectItemValueNode.children.flexibleString[0] as CstNode;
            verifyNodeName(valueNode, 'flexibleString');
            verifyNodeImage(valueNode, 'QuotedString', '"value"');

            const commandNode2 = cst.children.commands[1] as CstNode;
            verifyNodeName(commandNode2, 'command');
            verifyNodeImage(commandNode2, 'CommandKey', '@command');
            verifyColon(commandNode2);
            verifyNodeImage(commandNode2, 'commandName', 'build');

            const commandBlockNode2 = commandNode2.children.commandBlock[0] as CstNode;
            verifyNodeName(commandBlockNode2, 'object');
            verifyNodeImage(commandBlockNode2, 'LCurly', '{');
            verifyNodeImage(commandBlockNode2, 'RCurly', '}');
            verifyColon(commandNode2);

            const objectItemNode2 = commandBlockNode2.children.objectItem[0] as CstNode;
            verifyNodeName(objectItemNode2, 'objectItem');
            verifyColon(objectItemNode2);

            const objectItemKeyNode2 = objectItemNode2.children.flexibleString[0] as CstNode;
            verifyNodeName(objectItemKeyNode2, 'flexibleString');
            verifyNodeImage(objectItemKeyNode2, 'UnquotedString', 'key2');

            const objectItemValueNode2 = objectItemNode2.children.value[0] as CstNode;
            verifyNodeName(objectItemValueNode2, 'value');

            const valueNode2 = objectItemValueNode2.children.flexibleString[0] as CstNode;
            verifyNodeName(valueNode2, 'flexibleString');
            verifyNodeImage(valueNode2, 'QuotedString', '"value2"');
        })
    })
    
})