var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;

var Argument = require('./Argument');
var CLIError = require('./CLIError');
var CLIObject = require('./CLIObject');
var Option = require('./Option');
var util = require('./util');


function Command(line, onError) {
    Command.super_.call(this, onError);
    this._options = {};
    this.commands = {};
    this._args = [];

    this.option('-h, --help', 'output help information');

    this.usage(line || '');
}

module.exports = util.inherits(Command, CLIObject, {

    name: 'Command',

    usage: function(line) {
        if (line == null) {
            this.outputUsage();
            return this;
        }
        this._usage = line;
        this.validateUsage();
        this._args = [];
        var args = line.trim().split(/ +/);
        this.setName(args);
        this.nextCommandArgument(args);
        this.validateCommandArguments();
        this.generateUsage();
        return this;
    },

    setName: function(args) {
        this._name = args.shift();
        if (this._name !== '*' && !/^[a-z][a-z_-]*$/i.test(this._name)) {
            args.unshift(this._name);
            this._name = path.basename(process.argv[1]);
        }
    },

    outputUsage: function() {
        if (!this._usage) {
            this.generateUsage();
        }
        console.log();
        console.log('  Usage:', this._usage);
    },

    validateUsage: function() {
        if (/\[options\]/i.test(this._usage)) {
            this.error('Reserved usage argument: [options]');
        }
        if (/<command>/i.test(this._usage)) {
            this.error('Reserved usage argument: <command>');
        }
    },

    generateUsage: function() {
        var usage = (this._name === 'Command') ?
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
    },

    nextCommandArgument: function(args) {
        if (!args.length) {
            return;
        }
        var arg = new Argument(args.shift(), this.onError.bind(this));
        arg.command = this;
        arg.on('error', this.onError.bind(this));
        this._args.push(arg);
        this.nextCommandArgument(args);
    },

    validateCommandArguments: function() {
        var repeating = 0;
        var hasOptionalAfterRepeating = false;
        this._args.forEach(function(arg) {
            if (repeating && arg.optional) {
                hasOptionalAfterRepeating = true;
            }
            if (arg.repeating) {
                repeating++;
            }
        });
        var error = function(msg) {
            this.error('Ambiguous command arguments. ' + msg);
        }.bind(this);
        if (repeating > 1) {
            error('Cannot have more than one repeating arg.');
        }
        if (hasOptionalAfterRepeating) {
            error('Cannot have an optional arg after a repeating arg.');
        }
    },

    help: function(die) {
        this.outputDescription();
        this.outputUsage();
        this.outputCommands();
        this.outputOptions();
        this.emit('help', this);
        console.log();
        if (die) {
            process.exit(0);
        }
    },

    outputCommands: function() {
        var keys = Object.keys(this.commands);
        this.outputAligned('Commands', keys, left.bind(this), right.bind(this));
        function left(key) {
            return key;
        }
        function right(key) {
            return this.commands[key]._description;
        }
    },

    outputAligned: function(title, objects, left, right) {
        if (!objects.length) {
            return;
        }
        var maxLeft = 0;
        objects.forEach(function(obj) {
            var width = left(obj).length;
            if (width > maxLeft) {
                maxLeft = width;
            }
        });
        var lines = objects.map(function(obj) {
            var line = left(obj);
            var rightText = right(obj);
            if (rightText) {
                line += ' '.repeat(maxLeft - line.length + 2);
                line += rightText;
            }
            return line;
        });
        this.outputIndented(title, lines);
    },

    outputIndented: function(title, lines) {
        if (!lines.length) {
            return;
        }
        if (title) {
            console.log();
            console.log(' ', title + ':');
        }
        console.log();
        lines.forEach(function(line) {
            console.log('   ', line);
        });
    },

    version: function(value) {
        switch (typeof value) {
        case 'string':
        case 'number':
            this._version = value;
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
    },

    outputDescription: function() {
        if (!this._description) {
            return;
        }
        console.log();
        console.log(' ', this._description);
    },

    description: function(value) {
        this._description = value;
        return this;
    },

    outputOptions: function() {
        var keys = Object.keys(this._options);
        this.outputAligned('Options', keys, left.bind(this), right.bind(this));
        function left(key) {
            return this._options[key].flags;
        }
        function right(key) {
            return this._options[key].description;
        }
    },

    option: function(flags, description, fn, defaultValue) {
        var option = new Option(flags, description, fn, defaultValue,
            this.onError.bind(this));
        option.command = this;
        this._options[option.name] = option;
        this.generateUsage();
        return this;
    },

    command: function(usage, description) {
        var cmd = new Command(usage, this.onError.bind(this));
        if (description) {
            cmd.description(description);
            cmd._bins = this.getSubcommandBins(cmd.name);
        }
        if (cmd._name === this._name) {
            this.error('Missing sub-command name.');
        }
        this.commands[cmd._name] = cmd;
        cmd.parent = this;
        this.generateUsage();
        return (description) ? this : cmd;
    },

    getSubcommandBins: function(name) {
        var argv = process.argv.slice(0, 2);

        var dir = path.dirname(argv[1]);
        var bin = path.basename(argv[1]) + '-' + name;

        var local = path.join(dir, bin);
        if (fs.existsSync(local)) {
            argv[1] = local;
            return argv;
        }
        return this.error('Sub-command not found: ' + bin);
    },

    action: function(callback) {
        this._action = callback;
        return this;
    },

    parse: function(args) {
        this.preparse(args);
        this.parseNextFlag();
        this.setDefaultOptions();
        if (Object.keys(this.commands).length) {
            var arg = this.remainingArgs.shift();
            if (this.tryParseSubcommand(arg)) {
                return this;
            }
            arg && this.remainingArgs.unshift(arg);
            if (!this.remainingArgs.length) {
                this.error('Missing required sub-command.');
            }
            if (!(arg in this.commands)) {
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
    },

    preparse: function(args) {
        this.options = {};
        this.args = { _raw: args && args.slice() };
        this.remainingArgs = args && args.slice(2) || [];
    },

    unparse: function() {
        delete this.options;
        delete this.args;
    },

    tryParseSubcommand: function(arg) {
        var sub = this.commands[arg];
        if (!sub && '*' in this.commands) {
            sub = this.commands['*'];
        }
        if (!sub || !(sub instanceof Command)) {
            return false;
        }

        var args = (sub._bins) ?
            sub._bins.slice() :
            this.args._raw.slice(0, 2);
        if (sub === this.commands['*']) {
            args.push(arg);
        }
        args.push.apply(args, this.remainingArgs);

        if (!sub._bins) {
            sub.parse(args);
            return true;
        }

        var bin = args.shift();
        var options = { stdio: 'inherit', customFds: [0, 1, 2] };

        var proc = spawn(bin, args, options);
        proc.on('exit', function(code) {
            if (code === 127) {
                this.error('\n %s(1) does not exist\n' + bin);
            }
        }.bind(this));
        return true;
    },

    parseNextFlag: function() {
        if (!this.remainingArgs.length) {
            return;
        }
        var arg = this.remainingArgs.shift();
        if (arg === '--') {
            return;
        }
        if (arg && arg.startsWith('-')) {
            this.parseFlag(arg);
            this.parseNextFlag();
        } else if (arg) {
            this.remainingArgs.unshift(arg);
        }
    },

    parseArguments: function() {
        if (!process.stdin.isTTY) {
            this.remainingArgs.push(process.stdin);
        }
        var args = this._args.slice();
        var tally = this.tallyOptionalRequired();
        this.parseNextArgument(args, tally.optional, tally.required);
    },

    parseFlag: function(flag) {
        var args = [];
        for (var i = 0; i < this.remainingArgs.length; i++) {
            var arg = this.remainingArgs[i];
            if (arg.startsWith('-')) break;
            args.push(arg);
        }
        if (flag.startsWith('--')) {
            this.parseLongFlag(flag.substr(2), args);
        } else {
            this.parseShortFlag(flag.substr(1), args);
        }
    },

    parseLongFlag: function(flag, args) {
        var option = this._options[flag.camelize()];
        if (args && option && option.arg) {
            this.remainingArgs.shift();
        }
        this.parseOption(option, '--' + flag, args[0]);
    },

    parseShortFlag: function(flags, args) {
        var options = [];
        var required = 0;
        flags = flags.split('');
        flags.forEach(function(flag) {
            var option = util.findFirst(this._options, function(opt) {
                return opt.short === flag;
            });
            if (option && option.arg && option.arg.required) {
                required++;
            }
            options.push(option);
        }.bind(this));
        if (required > args.length) {
            this.error('Not enough arguments supplied to flags: -' + flags);
        }
        flags.forEach(function(flag, i) {
            var option = options[i];
            if (option && option.arg &&
                (option.arg.required || args.length > required)) {
                required--;
                this.remainingArgs.shift();
                this.parseOption(option, '-' + flag, args.shift());
                return;
            }
            this.parseOption(option, '-' + flag);
        }.bind(this));
    },

    parseOption: function(option, flag, arg) {
        if (!option) {
            this.error('Invalid flag: ' + flag);
            return;
        }
        if (option.arg) {
            this.options[option.name] = option.parse(arg);
            return;
        }
        switch (option.name) {
        case 'version':
            this.version(true);
            break;
        case 'help':
            this.help(true);
            break;
        default:
            var name = option.negates || option.name;
            this.options[name] = option.bool;
            break;
        }
    },

    setDefaultOptions: function() {
        Object.keys(this._options).forEach(function(key) {
            var option = this._options[key];
            if (option.defaultValue && !(option.name in this.options)) {
                this.options[option.name] = option.defaultValue;
            }
        }.bind(this));
    },

    tallyOptionalRequired: function() {
        if (!this.remainingArgs) {
            this.remainingArgs = [];
        }
        var required = this._args.filter(function(arg) {
            return arg.required;
        }).length;

        var optional = this.remainingArgs.length - required;

        if (this.remainingArgs.length < required) {
            if (!this.remainingArgs.length) {
                this.error('Missing required arguments.');
            }
            this.error('Not enough arguments supplied.');
        }
        return { optional: optional, required: required };
    },

    parseNextArgument: function(args, optional, required) {
        var arg = args.shift();
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
            var remaining = this.remainingArgs.length - required;
            this.args[arg.name] = this.remainingArgs.slice(0, remaining);
            this.remainingArgs = this.remainingArgs.slice(remaining);
        } else {
            this.args[arg.name] = this.remainingArgs.shift();
        }
        this.parseNextArgument(args, optional, required);
    },

    _getMaxFlagStringLength: function() {
        var max = 0;
        Object.keys(this._options).forEach(function(key) {
            var option = this._options[key];
            if (option.flags.length > max) {
                max = option.flags.length;
            }
        }.bind(this));
        return max;
    }

});
