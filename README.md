# snip-cli

Store the commands you use every day and run them from one small CLI.

`snip-cli` is a TypeScript command-line tool built around the custom `.snip` file format. It is useful for keeping build commands, SQL queries, shell scripts, and other reusable commands close to your project instead of searching through notes or chat history.

## Background

This project started as a way to learn how custom file extensions and command-line tools are designed and implemented. Rather than only studying the concepts, I wanted to create a small file format and make it useful in everyday development.

Once the `.snip` format was created, a CLI felt like the most natural way to use it. The commands developers want to reuse are already part of a terminal-based workflow, so a command-line interface keeps snippets quick to find and run without requiring a separate screen or application.

## Features

- Create and edit `.snip` files from the CLI
- Store multiple named commands in one file
- Search files and commands by text or tag
- Add descriptions, tags, and command dependencies
- Run one command or a group of tagged commands
- Preview commands with `--dry-run`
- Keep local or global configuration in `.snipconfig.yml`

## Requirements

- Node.js 20 or newer
- npm

## Installation

### From source

```sh
git clone https://github.com/kurakurakuda/snip-cli.git
cd snip-cli
npm install
npm run build
npm link
```

This makes the `snip` command available on your PATH. To run the development entry point without linking it, use `npm start -- --help`.

## Quick start

Create a file and add a command:

```sh
snip create project
snip add project install --command "npm install" --description "Install dependencies" --tag setup
snip add project test --command "npm test" --tag verify
```

Find and inspect saved commands:

```sh
snip find
snip find project --detail
snip desc project install
```

Preview a command before executing it, then run it when it looks right:

```sh
snip run project install --dry-run
snip run project install
```

`snip run` executes the command through the system shell. Treat snippets as executable code and review them before running, especially when they come from another repository.

## `.snip` format

`.snip` files are readable text files that describe a collection of commands:

```text
@description: "Common project commands"
@tags: project, npm

@command: test {
  cmd: "npm test"
  desc: "Run the test suite"
  tags: verify
}
```

The repository includes more parser examples in [`samples/`](samples/).

## Command reference

| Command | Purpose |
| --- | --- |
| `snip create <file>` | Create a `.snip` file |
| `snip add <file> <name>` | Add a command |
| `snip edit <file> [name] [newName]` | Edit a file or command |
| `snip remove <file> [name]` | Remove a file or command |
| `snip rename <file> <newName>` | Rename a `.snip` file |
| `snip find [file]` | Find files or commands |
| `snip run [file] [name]` | Run matching commands |
| `snip desc <file> [name]` | Show a description |
| `snip tag <add/remove/list>` | Manage tags |
| `snip config` | Show the active configuration |

Run `snip <command> --help` for command-specific options.

## Configuration

Configuration is loaded in this order:

1. Built-in defaults
2. Global config at `~/.snipconfig.yml`
3. Local config at `.snipconfig.yml`

Use [`.snipconfig.yml.sample`](.snipconfig.yml.sample) as a starting point. The local `working_dir` setting controls where snippets are read and written; the global `command.run.encoding` setting controls command output decoding.

## Development

```sh
npm install
npm run build
npm test
npm run test:coverage
```

The test suite uses temporary files under `samples/tests/`. Build output is written to `dist/` and coverage reports to `coverage/`; both are ignored by Git.

## Contributing

Issues and pull requests are welcome. For a change, please add or update focused tests and run `npm test` before opening a pull request.

## License

This project is licensed under the ISC License.
