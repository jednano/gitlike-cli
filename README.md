# Git-like CLI

A git-like [CLI][] for [Node.js][] command-line interfaces, inspired by
[tjholowaychuk's][] [commander][], meant to give you the flexibility and power
akin to the [git command and its sub-commands][] (e.g., [git commit][]).

With Git-like CLI, you can create sub-commands as deep as you want.

Perhaps unique to Git-like CLI, you can easily create crazy argument
combinations, mixing required, optional, required-repeating and
optional-repeating arguments to your liking, as long as they aren't
ambiguous.

What you won't find in Git-like CLI are some [commander][] features, such
as prompts, password masking, confirm and choose. If you need these features,
[commander][] is highly recommended.

[![Build Status][]](http://travis-ci.org/jedhunsaker/gitlike-cli.js)


## Installation

    $ npm install gitlike-cli


## Getting Started

```js
var program = require('gitlike-cli');
program.parse(process.argv);
```

The above example is a program that really does nothing at all; however, enough
information is provided to generate some basic help information.

```
$ foo --help

  Usage: foo [options]

  Options:

    -h, --help  output help information
```

The help information is auto-generated based on the information the CLI
already knows about your program. Auto-generated help information will also
be added for any custom options you define for your application. Adding a
version will have the same effect.

```js
program
    .version('0.1.2')
    .parse(process.argv);
```

Produces the following options:

```
    -h, --help     output help information
    -V, --version  output version information
```

You can output help or version information from code by calling the respective
`.help(die)` or `.version(die)` methods. The `die` argument, if true, will
simply call `process.exit()` for you.


## Usage

Providing usage information gives the CLI more information about how your
program can be used.

```js
program.usage('foo <bar>');
```

This tells the CLI that your command is named `foo` and requires a single
argument, named `<bar>`. The chevrons around `bar` designate `<bar>` as a
required argument. If `<bar>` is not provided, the help information will
automatically display.

Calling the usage method without any arguments will display the generated
usage information.

```js
program.usage('foo <bar>').usage();
```

Produces the following:

```
  Usage: foo [options] <bar>
```


## Arguments

There are four different types of arguments you can supply.

1. Required: `<arg>`
1. Required, repeating: `<args>...`
1. Optional: `[arg]`
1. Optional, repeating: `[<args>...]`

You can combine any number of arguments you want; however, be aware that some
combinations are ambiguous and will throw an error. There are only two
scenarios for this to happen:

1. CommandError: Cannot have more than one repeating arg.
1. CommandError: Cannot have an optional arg after a repeating arg.

These errors will be thrown when you provide usage information. When arguments
are parsed, they will be stored in the program's `args` property. For example,
if the argument is named `<bar>`, like above, calling `$ foo qux` will store
the string `qux` in `program.args.bar`.

Repeating arguments will be stored as arrays.

Unconsumed arguments will be stored in `program.args.etc` as an array.

You now need to understand how multiple arguments are parsed:

1. Arguments will be parsed from left to right, always.
1. Required args will never be skipped and will throw errors if not enough
   args are supplied to fulfill the total number of required args.
1. Optional args will only be skipped if there are not enough args supplied to
   fill them.
1. A repeating arg will consume as many args as it can, but will reserve slots
   for any required arguments that follow.

Example usage: `[<foo>...] <bar> <baz>`

+ Parsing `x y` produces `{bar:'x', baz:'y'}`
+ Parsing `a b c x y` produces `{foo:['a','b','c'], bar:'x', baz:'y'}`

Example usage: `[foo] [bar] <baz>`

+ Parsing `x` produces `{baz:'x'}`
+ Parsing `x y` produces `{foo:'x', baz:'y'}`
+ Parsing `x y z` produces `{foo:'x', baz:'y', bar:'z'}`


## Options

Options are defined with the `.option()` method, also serving as documentation
for the options. The example below parses args and options from `process.argv`.

```js
program
    .option('-p, --peppers', 'Add peppers')
    .option('-P, --pineapple', 'Add pineapple')
    .option('-b, --bbq', 'Add bbq sauce')
    .option('-c, --cheese <type>', 'Add the specified type of cheese [marble]', 'marble')
    .option('-C, --no-cheese', 'You do not want any cheese')
    .parse(process.argv);

var options = program.options;
console.log('you ordered a pizza with:');
if (options.peppers) console.log('  - peppers');
if (options.pineapple) console.log('  - pineapple');
if (options.bbq) console.log('  - bbq');
console.log('  - %s cheese', options.cheese || 'no');
```

Options can have `[optional]` or `<required>` arguments attached to them, but
not `<repeating>...` arguments.

Short flags may be passed as a single arg, for example `-abc` is equivalent to
`-a -b -c`. Multi-word options such as "--template-engine" are camel-cased,
becoming `program.options.templateEngine`.

Short combo flags with multiple args follow the same rules for parsing as do
arguments. For example, if `-abc` flags all have args attached to them, then
`-abc foo bar baz` will assign the appropriate values, from left to right.

Optional args, again, follow the same rules as command args. This differs from
git's CLI, but in a good way. Sure, `git commit -am "stuff"` parses `-m` as
`"stuff"`, but `git commit -ma "stuff"` throws an error. Git-like CLI, knowing
that `-m` has a required `<msg>` argument and `-a` has no argument at all, is
smart enough to parse this command gracefully and without errors.


## Coercion

Git-like CLI uses `JSON.parse()` to parse values. This means you can parse
integers, floats, booleans, arrays and even JSON objects out of the box.
Furthermore, you can pass a callback function as an additional option argument
if you need more custom control over the result.

```js
function range(val) {
  return val.split('..').map(Number) || [];
}

function list(val) {
  return val.split(',');
}

function square(val) {
  return val * val;
}

program
  .version('0.0.1')
  .usage('[options] <file>...')
  .option('-s, --square <x>', 'A square of x', square)
  .option('-r, --range <a>..<b>', 'A range', range)
  .option('-l, --list <items>', 'A list', list)
  .option('-o, --optional [value]', 'An optional value')
  .parse(process.argv);

console.log(' square: %j', program.square);
console.log(' range: %j..%j', program.range[0], program.range[1]);
console.log(' list: %j', program.list);
console.log(' optional: %j', program.optional);
console.log(' args: %j', program.args);
```

## Custom help

You can display arbitrary `-h, --help` information by listening for "help".
The program will automatically exit once you are done so that the remainder of
your program does not execute causing undesired behaviours. For example, in the
following executable "stuff" will not output when `help` is used.

```js
var program = require('../');

function list(val) {
  return val.split(',').map(Number);
}

program
  .version('0.0.1')
  .option('-f, --foo', 'enable some foo')
  .option('-b, --bar', 'enable some bar')
  .option('-B, --baz', 'enable some baz');

// must be before .parse() since
// node's emit() is immediate

program.on('help', function(){
  console.log('  Examples:');
  console.log();
  console.log('    $ custom-help --help');
  console.log('    $ custom-help -h');
  console.log();
});

program.parse(process.argv);

console.log('stuff');
```

yielding the following help output:

```

Usage: custom-help [options]

Options:

  -h, --help     output usage information
  -V, --version  output the version number
  -f, --foo      enable some foo
  -b, --bar      enable some bar
  -B, --baz      enable some baz

Examples:

  $ custom-help --help
  $ custom-help -h

```

## .outputHelp()

  Output help information without exiting.

## .help()

  Output help information and exit immediately.

## License

```
The MIT License (MIT)

Copyright (c) <2013> Jed Hunsaker

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

[CLI]: http://en.wikipedia.org/wiki/Command-line_interface
[node.js]: http://nodejs.org
[tjholowaychuk's]: https://npmjs.org/~tjholowaychuk
[commander]: https://npmjs.org/package/commander
[git command and its sub-commands]: http://git-scm.com/docs
[git commit]: http://git-scm.com/docs/git-commit
[Build Status]: https://secure.travis-ci.org/jedhunsaker/gitlike-cli.js.png
