import { expect } from 'chai';
import { jsonToSnip } from '../../src/writer/generator.ts';
import { SnipCommand } from '../../src/utils/interfaces.ts';
import { snipToJson } from '../../src/reader/visitor.ts';

describe('jsonToSnip', () => {
	it('converts JSON input to expected snip format with unquated string', async () => {
		const input: SnipCommand = {
			description: 'Sample-description',
			tags: ['tag1', 'tag two'],
			commands: [
				{
					name: 'list',
					command: 'ls',
					description: 'List-files',
					tags: ['fs', 'list files'],
					dependsOn: ['build', 'dev server']
				}
			]
		};

		const expected = `
@description: Sample-description
@tags: tag1, "tag two"
@command: list {
    cmd: ls,
    desc: List-files,
    tags: [fs, "list files"],
    depends_on: [build, "dev server"]
}`.trim();

		const result = await jsonToSnip(input);
		expect(result).to.equal(expected);

        const reversedJson = await snipToJson(result);
        expect(reversedJson).to.deep.equal(input);
	});

    it('converts JSON input to expected snip format with quated string', async () => {
		const input: SnipCommand = {
			description: 'Sample description',
			tags: ['tag1', 'tag two'],
			commands: [
				{
					name: 'list',
					command: 'ls -la',
					description: 'List files',
					tags: ['fs', 'list files'],
					dependsOn: ['build', 'dev server']
				},
                {
					name: 'npm',
					command: 'npm run',
					description: 'Run npm',
					tags: ['npm', 'execution'],
					dependsOn: ['ci', 'cd']

				}
			]
		};

		const expected = `
@description: "Sample description"
@tags: tag1, "tag two"
@command: list {
    cmd: "ls -la",
    desc: "List files",
    tags: [fs, "list files"],
    depends_on: [build, "dev server"]
}
@command: npm {
    cmd: "npm run",
    desc: "Run npm",
    tags: [npm, execution],
    depends_on: [ci, cd]
}`.trim();

		const result = await jsonToSnip(input);
		expect(result).to.equal(expected);

        const reversedJson = await snipToJson(result);
        expect(reversedJson).to.deep.equal(input);
	});

    it('converts JSON input to expected snip format with empty string', async () => {
		const input: SnipCommand = {
			description: '',
			tags: [''],
			commands: [
				{
					name: 'THIS-IS-MANDATORY',
					command: '',
					description: '',
					tags: [''],
					dependsOn: ['']
				}
			]
		};

		const expected = `
@description: 
@tags: 
@command: THIS-IS-MANDATORY {
    cmd: "",
    desc: "",
    tags: [],
    depends_on: []
}`.trim();

		const result = await jsonToSnip(input);
		expect(result).to.equal(expected);

        const reversedJson = await snipToJson(result);
        expect(reversedJson.description).to.be.undefined;
        expect(reversedJson.tags).to.be.undefined;
        expect(reversedJson.commands.length).to.equal(1);
        expect(reversedJson.commands[0].command).to.equal("");
        expect(reversedJson.commands[0].description).to.equal("");
        expect(reversedJson.commands[0].tags).to.be.undefined;
		expect(reversedJson.commands[0].dependsOn).to.be.undefined;
	});

    it('converts JSON input to expected snip format with array containing empty string', async () => {
		const input: SnipCommand = {
			description: '',
			tags: ['', 'tag two'],
			commands: [
				{
					name: 'list',
					command: 'ls -la',
					description: 'List files',
					tags: ['list files', ''],
					dependsOn: ['dev server', '']
				},
                {
					name: 'npm',
					command: 'npm run',
					description: 'Run npm',
					tags: ['npm', ''],
					dependsOn: ['ci', '']
				}
			]
		};

		const expected = `
@description: 
@tags: "tag two"
@command: list {
    cmd: "ls -la",
    desc: "List files",
    tags: ["list files"],
    depends_on: ["dev server"]
}
@command: npm {
    cmd: "npm run",
    desc: "Run npm",
    tags: [npm],
    depends_on: [ci]
}`.trim();

		const result = await jsonToSnip(input);
		expect(result).to.equal(expected);

        const reversedJson = await snipToJson(result);
        expect(reversedJson.description).to.be.undefined;
        expect(reversedJson.tags.length).to.equal(1);
        expect(reversedJson.tags[0]).to.equal("tag two");
        expect(reversedJson.commands.length).to.equal(2);
        expect(reversedJson.commands[0].name).to.equal("list");
        expect(reversedJson.commands[0].command).to.equal("ls -la");
        expect(reversedJson.commands[0].description).to.equal("List files");
        expect(reversedJson.commands[0].tags.length).to.be.equal(1);
        expect(reversedJson.commands[0].tags[0]).to.be.equal("list files");
		expect(reversedJson.commands[0].dependsOn.length).to.be.equal(1);
        expect(reversedJson.commands[0].dependsOn[0]).to.be.equal("dev server");
        expect(reversedJson.commands[1].name).to.equal("npm");
        expect(reversedJson.commands[1].command).to.equal("npm run");
        expect(reversedJson.commands[1].description).to.equal("Run npm");
        expect(reversedJson.commands[1].tags.length).to.be.equal(1);
        expect(reversedJson.commands[1].tags[0]).to.be.equal("npm");
		expect(reversedJson.commands[1].dependsOn.length).to.be.equal(1);
        expect(reversedJson.commands[1].dependsOn[0]).to.be.equal("ci");
	});

    it('converts JSON input to expected snip format with array containing multiple empty string', async () => {
		const input: SnipCommand = {
			description: 'Sample description',
			tags: ['', ''],
			commands: [
				{
					name: 'list',
					command: 'ls -la',
					description: 'List files',
					tags: ['list files', '', ''],
					dependsOn: ['build', '', '']
				},
                {
					name: 'npm',
					command: 'npm run',
					description: 'Run npm',
					tags: ['', ''],
					dependsOn: ['', '']
				}
			]
		};

		const expected = `
@description: "Sample description"
@tags: 
@command: list {
    cmd: "ls -la",
    desc: "List files",
    tags: ["list files"],
    depends_on: [build]
}
@command: npm {
    cmd: "npm run",
    desc: "Run npm",
    tags: [],
    depends_on: []
}`.trim();

		const result = await jsonToSnip(input);
		expect(result).to.equal(expected);

        const reversedJson = await snipToJson(result);
        expect(reversedJson.description).to.equal("Sample description");
        expect(reversedJson.tags).to.be.undefined;
        expect(reversedJson.commands.length).to.equal(2);
        expect(reversedJson.commands[0].name).to.equal("list");
        expect(reversedJson.commands[0].command).to.equal("ls -la");
        expect(reversedJson.commands[0].description).to.equal("List files");
        expect(reversedJson.commands[0].tags.length).to.be.equal(1);
        expect(reversedJson.commands[0].tags[0]).to.be.equal("list files");
		expect(reversedJson.commands[0].dependsOn.length).to.be.equal(1);
        expect(reversedJson.commands[0].dependsOn[0]).to.be.equal("build");
        expect(reversedJson.commands[1].name).to.equal("npm");
        expect(reversedJson.commands[1].command).to.equal("npm run");
        expect(reversedJson.commands[1].description).to.equal("Run npm");
        expect(reversedJson.commands[1].tags).to.be.undefined;
		expect(reversedJson.commands[1].dependsOn).to.be.undefined;
	});

    it('converts JSON input to expected snip format with empty array', async () => {
		const input: SnipCommand = {
			description: '',
			tags: [],
			commands: []
		};

		const expected = `
@description: 
@tags: 
`.trim();

		const result = await jsonToSnip(input);
		expect(result).to.equal(expected);

        const reversedJson = await snipToJson(result);
        expect(reversedJson.description).to.undefined;
        expect(reversedJson.tags).to.be.undefined;
        expect(reversedJson.commands).to.undefined;
	});

	it('converts JSON input to expected snip format with undefined', async () => {
		const input = {
			description: undefined,
			tags: undefined,
			commands: undefined
		} as unknown as SnipCommand;

		const expected = `
@description: 
@tags: 
`.trim();

		const result = await jsonToSnip(input);
		expect(result).to.equal(expected);

        const reversedJson = await snipToJson(result);
        expect(reversedJson.description).to.be.undefined;
		expect(reversedJson.tags).to.be.undefined;
		expect(reversedJson.commands).to.be.undefined;
	});

	it('converts JSON input to expected snip format with empty object', async () => {
		const input = {} as SnipCommand;

		const expected = `
@description: 
@tags: 
`.trim();

		const result = await jsonToSnip(input);
		expect(result).to.equal(expected);

        const reversedJson = await snipToJson(result);
        expect(reversedJson.description).to.be.undefined;
		expect(reversedJson.tags).to.be.undefined;
		expect(reversedJson.commands).to.be.undefined;
	});

	it('converts JSON input to expected snip format with commands object as undefined', async () => {
		const input = {
			description: '',
			tags: [''],
			commands: [
				{
					name: 'THIS-IS-MANDATORY',
					command: undefined,
					description: undefined,
					tags: undefined,
					dependOn: undefined
				}
			]
		} as unknown as SnipCommand;

		const expected = `
@description: 
@tags: 
@command: THIS-IS-MANDATORY {
    cmd: "",
    desc: "",
    tags: [],
    depends_on: []
}`.trim();

		const result = await jsonToSnip(input);
		expect(result).to.equal(expected);

        const reversedJson = await snipToJson(result);
        expect(reversedJson.description).to.be.undefined;
        expect(reversedJson.tags).to.be.undefined;
        expect(reversedJson.commands.length).to.equal(1);
        expect(reversedJson.commands[0].command).to.equal("");
        expect(reversedJson.commands[0].description).to.equal("");
        expect(reversedJson.commands[0].tags).to.be.undefined;
		expect(reversedJson.commands[0].dependsOn).to.be.undefined;
	});

	it('Failed to converts JSON input to expected snip format when command name is undefined', async () => {
		const input = {
			description: 'Sample-description',
			tags: ['tag1'],
			commands: [
				{
					name: undefined,
					command: 'ls',
					description: 'List-files',
					tags: ['fs', 'list files'],
					dependOn: ['build', 'dev server']
				}
			]
		} as unknown as SnipCommand;
        
        try {
            await jsonToSnip(input);
            expect.fail('Expected parsing to fail');
        } catch (error) {
            expect(error).to.be.instanceOf(Error);
            expect((error as Error).message).to.include('Commands name must be mandatory');    
        }
	});

	it('Failed to converts JSON input to expected snip format when command name is empty', async () => {
		const input: SnipCommand = {
			description: 'Sample-description',
			tags: ['tag1'],
			commands: [
				{
					name: '',
					command: 'ls',
					description: 'List-files',
					tags: ['fs', 'list files'],
					dependsOn: ['build', 'dev server']
				}
			]
		};
        
        try {
            await jsonToSnip(input);
            expect.fail('Expected parsing to fail');
        } catch (error) {
            expect(error).to.be.instanceOf(Error);
            expect((error as Error).message).to.include('Commands name must be mandatory');    
        }
	});
});
