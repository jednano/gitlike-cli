import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

import camelCase from 'lodash.camelcase';

import { findFirst } from './util';
import Argument from './Argument';
import CLIObject from './CLIObject';
import Option from './Option';

export type CommandArg = string | NodeJS.ReadStream;

/**
 * Class representing a CLI command or sub-command.
 */
export default class Command extends CLIObject {

    private _options: { [key: string]: Option; } = {};
    public commands: { [key: string]: Command; } = {};
    private _args: Argument[] = [];
    public args: {
        _raw?: string[];
        etc?: CommandArg[];
        [key: string]: CommandArg | CommandArg[] | undefined;
    } = {};
    private _usage?: string;
    private _name?: string;
    private _version?: string | number;
    private _description?: string;
    private _bins: string[] = [];
    private _action?: Function;
    private remainingArgs: CommandArg[] = [];
    public options: { [key: string]: string | boolean; } = {};

    constructor(line?: string) {
        super('Command')

        this.option('-h, --help', 'output help information');

        this.usage(line || '');
    }

    /**
     * Provides usage information for the command.
     *
     * ```js
program.usage('foo <bar>')
```
     *
     * This tells the user that your command is named `foo` and requires a single argument named `bar`.
     * The chevrons around `bar` designate `<bar>` as a required argument. If `<bar>` is not provided,
     * the help information will automatically display.
     *
     * Calling the usage method without any arguments will display the generated usage information.
     *
     * ```js
program
    .usage('foo <bar>')
    .usage()
```
     *
     * Displays the following:
     *
     * ```
Usage: foo [options] <bar>
```
     */
    public usage(line: string) {
        if (line === null) {
            this.outputUsage();
            return this;
        }
        this._usage = line;
        this.validateUsage();
        this._args = [];
        const args = line.trim().split(/ +/);
        this.setNameFromArgs(args);
        this.nextCommandArgument(args);
        this.validateCommandArguments();
        this.generateUsage();
        return this;
    }

    public setNameFromArgs(args: string[]) {
        this._name = args.shift();
        if (this._name !== '*' && !/^[a-z][a-z_-]*$/i.test(this._name as string)) {
            args.unshift(this._name as string);
            this._name = path.basename(process.argv[1]);
        }
    }

    public outputUsage() {
        if (!this._usage) {
            this.generateUsage();
        }
        console.log();
        console.log('  Usage:', this._usage);
    }

    public validateUsage() {
        if (/\[options\]/i.test(this._usage as string)) {
            this.error('Reserved usage argument: [options]');
        }
        if (/<command>/i.test(this._usage as string)) {
            this.error('Reserved usage argument: <command>');
        }
    }

    public generateUsage() {
        let usage = (this._name === 'Command') ?
            path.basename(process.argv[1]) :
            this._name;

        if (Object.keys(this._options).length) {
            usage += ' [options]';
        }
        if (Object.keys(this.commands).length) {
            usage += ' <command>';
        }
        this._args.forEach(function(arg) {
            usage += ' ' + arg;
        });
        this._usage = usage;
    }

    public nextCommandArgument(args: string[]) {
        if (!args.length) {
            return;
        }
        const arg = new Argument(args.shift() as string);
        arg.command = this;
        arg.on('error', this.onError.bind(this));
        this._args.push(arg);
        this.nextCommandArgument(args);
    }

    public validateCommandArguments() {
        let repeating = 0;
        let hasOptionalAfterRepeating = false;
        this._args.forEach(function(arg) {
            if (repeating && arg.optional) {
                hasOptionalAfterRepeating = true;
            }
            if (arg.repeating) {
                repeating++;
            }
        });
        const error = (msg: string) => {
            this.error('Ambiguous command arguments. ' + msg);
        };
        if (repeating > 1) {
            error('Cannot have more than one repeating arg.');
        }
        if (hasOptionalAfterRepeating) {
            error('Cannot have an optional arg after a repeating arg.');
        }
    }

    public help({ die = false } = {}) {
        this.outputDescription();
        this.outputUsage();
        this.outputCommands();
        this.outputOptions();
        this.emit('help', this);
        console.log();
        if (die) {
            process.exit(0);
        }
    }

    public outputCommands() {
        const keys = Object.keys(this.commands);
        this.outputAligned(
            'Commands',
            keys,
            (key: string) => key,
            (key: string) => this.commands[key]._description as string,
        );
    }

    public outputAligned(
        title: string,
        objects: string[],
        left: (key: string) => string,
        right: (key: string) => string,
    ) {
        if (!objects.length) {
            return;
        }
        let maxLeft = 0;
        objects.forEach(obj => {
            const width = left(obj).length;
            if (width > maxLeft) {
                maxLeft = width;
            }
        });
        const lines = objects.map(obj => {
            let line = left(obj);
            const rightText = right(obj);
            if (rightText) {
                line += ' '.repeat(maxLeft - line.length + 2);
                line += rightText;
            }
            return line;
        });
        this.outputIndented(title, lines);
    }

    public outputIndented(title: string, lines: string[]) {
        if (!lines.length) {
            return;
        }
        if (title) {
            console.log();
            console.log(' ', title + ':');
        }
        console.log();
        lines.forEach(line => {
            console.log('   ', line);
        });
    }

    public version(value: string | boolean) {
        switch (typeof value) {
            case 'string':
            case 'number':
                this._version = value as (string | number);
                this.option('-v, --version', 'output version information');
                break;
            default:
                if (this._version) {
                    console.log(this._version);
                }
                if (value === true) {
                    process.exit(0);
                }
        }
        return this;
    }

    public outputDescription() {
        if (!this._description) {
            return;
        }
        console.log();
        console.log(' ', this._description);
    }

    public description(value: string) {
        this._description = value;
        return this;
    }

    public outputOptions() {
        const keys = Object.keys(this._options);
        this.outputAligned(
            'Options',
            keys,
            (key: string) => this._options[key].flags as string,
            (key: string) => this._options[key].description as string,
        );
    }

    /**
     * Options support `[optional]` or `<required>` args, but not `<repeating>...` args.
     */
    public option(
        /**
         * e.g., "-p, --peppers"
         *
         * Short flags may be passed as a single arg (e.g., `-abc` is equivalent to `-a -b -c`).
         *
         * Multi-word options such as `--foo-bar` are camel-cased, becoming `program.options.fooBar`.
         *
         * Short combo flags with multiple args follow the same rules for parsing as do arguments
         * (e.g., if `-abc` flags all have args attached to them, then `-abc foo bar baz` will assign
         * the appropriate values, from left to right).
         *
         * Optional args, again, follow the same rules as command args. This differs from Git's CLI,
         * but in a good way. Sure, `git commit -am "stuff"` parses `-m` as `"stuff"`, but
         * `git commit -ma "stuff"` throws an error. Git-like CLI, knowing that `-m` has a required
         * `<msg>` argument and `-a` has no argument at all, is smart enough to parse this command
         * gracefully and without errors.
         */
        flags: string,
        /**
         * The description of the option. Try to explain what happens when this particular option is
         * provided. For example, an option with flags: `-p, --peppers` might be described as
         * "Add peppers".
         */
        description: string | null = null,
        fn: ((value: string) => string) | string = x => x,
        defaultValue = '',
    ) {
        const option = new Option(flags, description, fn, defaultValue);
        option.command = this;
        this._options[option.name] = option;
        this.generateUsage();
        return this;
    }

    public command(usage: string, description?: string) {
        const cmd = new Command(usage);
        if (description) {
            cmd.description(description);
            cmd._bins = this.getSubcommandBins(cmd.name) || [];
        }
        if (cmd._name === this._name) {
            this.error('Missing sub-command name.');
        }
        this.commands[cmd._name as string] = cmd;
        this.generateUsage();
        return (description) ? this : cmd;
    }

    public getSubcommandBins(name: string) {
        const argv = process.argv.slice(0, 2);

        const dir = path.dirname(argv[1]);
        const bin = path.basename(argv[1]) + '-' + name;

        const local = path.join(dir, bin);
        if (fs.existsSync(local)) {
            argv[1] = local;
            return argv;
        }
        return this.error('Sub-command not found: ' + bin);
    }

    public action(callback: Function) {
        this._action = callback;
        return this;
    }

    public parse(args?: string[]) {
        this.preparse(args);
        this.parseNextFlag();
        this.setDefaultOptions();
        if (Object.keys(this.commands).length) {
            const arg = this.remainingArgs.shift();
            if (this.tryParseSubcommand(arg as string)) {
                return this;
            }
            arg && this.remainingArgs.unshift(arg);
            if (!this.remainingArgs.length) {
                this.error('Missing required sub-command.');
            }
            if (!(arg as string in this.commands)) {
                this.error('Invalid sub-command: ' + arg);
            }
        }
        this.parseArguments();
        this.args.etc = this.remainingArgs;
        delete this.remainingArgs;
        if (typeof this._action === 'function') {
            this._action(this.args, this.options);
        }
        return this;
    }

    public preparse(args?: string[]) {
        this.options = {};
        this.args = { _raw: args && args.slice() };
        this.remainingArgs = args && args.slice(2) || [];
    }

    public unparse() {
        delete this.options;
        delete this.args;
    }

    public tryParseSubcommand(arg: string) {
        let sub = this.commands[arg];
        if (!sub && '*' in this.commands) {
            sub = this.commands['*'];
        }
        if (!sub || !(sub instanceof Command)) {
            return false;
        }

        const args = (sub._bins) ?
            sub._bins.slice() :
            (this.args._raw as string[]).slice(0, 2);
        if (sub === this.commands['*']) {
            args.push(arg);
        }
        args.push.apply(args, this.remainingArgs);

        if (!sub._bins) {
            sub.parse(args);
            return true;
        }

        const bin = args.shift();

        const proc = spawn(bin as string, args as string[], {
            stdio: 'inherit',
        });
        proc.on('exit', (code: number) => {
            if (code === 127) {
                this.error('\n %s(1) does not exist\n' + bin);
            }
        });
        return true;
    }

    public parseNextFlag() {
        if (!this.remainingArgs.length) {
            return;
        }
        const arg = this.remainingArgs.shift();
        if (arg === '--') {
            return;
        }
        if (arg && typeof arg === 'string' && arg.startsWith('-')) {
            this.parseFlag(arg);
            this.parseNextFlag();
        } else if (arg) {
            this.remainingArgs.unshift(arg);
        }
    }

    public parseArguments() {
        if (!process.stdin.isTTY) {
            this.remainingArgs.push(process.stdin);
        }
        const args = this._args.slice();
        const tally = this.tallyOptionalRequired();
        this.parseNextArgument(args, tally.optional, tally.required);
    }

    public parseFlag(flag: string) {
        const args: string[] = [];
        for (let i = 0; i < this.remainingArgs.length; i++) {
            const arg = this.remainingArgs[i];
            if (typeof arg === 'string' && arg.startsWith('-')) break;
            args.push(arg as string);
        }
        if (flag.startsWith('--')) {
            this.parseLongFlag(flag.substr(2), args);
        } else {
            this.parseShortFlag(flag.substr(1), args);
        }
    }

    public parseLongFlag(flag: string, args: string[]) {
        const option = this._options[camelCase(flag)];
        if (args && option && option.arg) {
            this.remainingArgs.shift();
        }
        this.parseOption(option, '--' + flag, args[0]);
    }

    public parseShortFlag(flags: string, args: CommandArg[]) {
        const options: Option[] = [];
        let required = 0;
        (flags || '').split('').forEach((flag) => {
            const option = findFirst(this._options, (opt: Option) => {
                return opt.short === flag;
            });
            if (option && option.arg && option.arg.required) {
                required++;
            }
            options.push(option as Option);
        });
        if (required > args.length) {
            this.error('Not enough arguments supplied to flags: -' + flags);
        }
        (flags || '').split('').forEach((flag, i) => {
            const option = options[i];
            if (option && option.arg &&
                (option.arg.required || args.length > required)) {
                required--;
                this.remainingArgs.shift();
                this.parseOption(option, '-' + flag, args.shift() as string);
                return;
            }
            this.parseOption(option, `-${flag}`);
        });
    }

    public parseOption(option: Option, flag: string, arg?: string) {
        if (!option) {
            this.error('Invalid flag: ' + flag);
            return;
        }
        if (option.arg) {
            this.options[option.name] = option.parse(arg as string);
            return;
        }
        switch (option.name) {
            case 'version':
                this.version(true);
                break;
            case 'help':
                this.help({ die: true });
                break;
            default:
                const name = option.negates || option.name;
                this.options[name] = option.bool as boolean;
                break;
        }
    }

    public setDefaultOptions() {
        Object.keys(this._options).forEach((key: string) => {
            const option = this._options[key];
            if (option.defaultValue && !(option.name in this.options)) {
                this.options[option.name] = option.defaultValue;
            }
        });
    }

    public tallyOptionalRequired() {
        if (!this.remainingArgs) {
            this.remainingArgs = [];
        }
        const required = this._args.filter(function(arg) {
            return arg.required;
        }).length;

        const optional = this.remainingArgs.length - required;

        if (this.remainingArgs.length < required) {
            if (!this.remainingArgs.length) {
                this.error('Missing required arguments.');
            }
            this.error('Not enough arguments supplied.');
        }
        return { optional: optional, required: required };
    }

    public parseNextArgument(args: Argument[], optional = 0, required = 0) {
        const arg = args.shift();
        if (!arg) {
            return;
        }
        if (arg.required && required) {
            required--;
        } else if (arg.optional) {
            if (optional) {
                optional--;
            } else {
                this.parseNextArgument(args);
                return;
            }
        }
        if (arg.repeating) {
            const remaining = this.remainingArgs.length - required;
            this.args[arg.name] = this.remainingArgs.slice(0, remaining);
            this.remainingArgs = this.remainingArgs.slice(remaining);
        } else {
            this.args[arg.name] = this.remainingArgs.shift();
        }
        this.parseNextArgument(args, optional, required);
    }
}
