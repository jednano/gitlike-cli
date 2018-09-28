import camelCase from 'lodash.camelcase';

import Argument from './Argument';
import CLIObject from './CLIObject';
import Command from './Command';

export default class Option extends CLIObject {

    /**
     * e.g., -f, --foo-bar
     */
    private shortAndLongPat = /^\-([a-z])[ ,|]+\-{2}([a-z_][a-z_-]*)(?: +(.+))?$/i;

    /**
     * e.g., -f
     */
    private shortPat = /^\-([a-z_][a-z_-]*)(?: +(.+))?$/i;

    /**
     * e.g., --foo-bar
     */
    private longPat = /^\-{2}([a-z_][a-z_-]*)(?: +(.+))?$/i;

    private long?: string;
    private callback?: (value: string) => string;
    public defaultValue?: string;
    public arg?: Argument;
    public negates?: string;
    public command?: Command;
    public bool?: Boolean;
    public short?: string;

    constructor(
        /**
         * The short, long flags (e.g., "-p, --peppers").
         */
        public flags: string,
        /**
         * What happens as a result of enabling this flag (e.g., "Add peppers").
         */
        public description: string | null = null,
        fn: ((value: string) => string) | string = x => x,
        defaultValue = '',
    ) {
        super('Option')
        if (typeof fn === 'function') {
            this.callback = fn;
            defaultValue && (this.defaultValue = defaultValue);
        } else {
            this.defaultValue = fn;
        }

        this.reset(flags);
    }

    private reset(flags: string) {
        let m: RegExpMatchArray | null;
        if (m = flags.match(this.shortAndLongPat)) {
            this.setArg(m);
            this.long = m.pop() as string;
            this.short = m.pop() as string;
        } else if (m = flags.match(this.shortPat)) {
            this.setArg(m);
            this.short = m.pop() as string;
        } else if (m = flags.match(this.longPat)) {
            this.setArg(m);
            this.long = m.pop() as string;
        } else {
            this.error('Invalid flag format: ' + flags);
        }

        this.validateArgument();
        this.handleInvertedBoolean();

        this.long && (this.long = camelCase(this.long));
        this.name = this.long || this.short || this.name;
    }

    private validateArgument() {
        if (!this.arg) {
            return;
        }
        if (this.arg.repeating) {
            this.error('Option arguments cannot be repeating.');
        }
        if (this.arg.custom && !this.callback) {
            this.error('Custom option arguments must have a value parser.');
        }
    }

    private handleInvertedBoolean() {
        const m = this.long && this.long.match(/^not?-(.+)$/i);
        if (m) {
            this.negates = m[1];
        }
        this.bool = !m;
    }

    private setArg(match: string[]) {
        const value = match.pop();
        if (!value) {
            return;
        }
        value && (this.arg = new Argument(value));
    }

    public parse(value: string) {
        let result;
        try {
            result = JSON.parse(value);
        } catch(e) {
            result = value || this.defaultValue;
        }
        return (this.callback)
            ? this.callback(result)
            : result;
    }
}
