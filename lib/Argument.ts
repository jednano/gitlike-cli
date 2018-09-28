import CLIObject from './CLIObject';
import Command from './Command';

export default class Argument extends CLIObject {

    /**
     * e.g., [<foo-bar>...]
     */
    private optionalRepeatingPat = /^\[<([a-z_][a-z_-]*)>\.{3}\]$/i;

    /**
     * e.g., <foo-bar>...
     */
    private requiredRepeatingPat = /^<([a-z_][a-z_-]*)>\.{3}$/i;

    /**
     * e.g., [foo-bar]
     */
    private optionalPat = /^\[([a-z_][a-z_-]*)\]$/i;

    /**
     * e.g., <foo-bar>
     */
    private requiredPat = /^<([a-z_][a-z_-]*)>$/i;

    public required = false;
    public repeating = false;
    public custom = false;
    public command?: Command;

    public get optional() {
        return !this.required;
    }

    constructor(value: string) {
        super('Argument');
        this.parse(value);
    }

    parse(value: string) {
        let m: RegExpMatchArray | null;
        if (m = value.match(this.optionalRepeatingPat)) {
            this.repeating = true;
        } else if (m = value.match(this.requiredRepeatingPat)) {
            this.required = true;
            this.repeating = true;
        } else if (m = value.match(this.requiredPat)) {
            this.required = true;
        } else if (!(m = value.match(this.optionalPat))) {
            //this.error('Invalid format: ' + value);
            this.custom = true;
        }
        this.name = (m && m.pop()) || '';
    }

    toString() {
        if (this.optional) {
            return (this.repeating)
                ? `[<${this.name}>...]`
                : `[${this.name}]`;
        }
        const result = `<${this.name}>`;
        return (this.repeating) ? `${result}...` : result;
    }
}
