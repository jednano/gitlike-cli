var CLIError = require('./CLIError');
var CLIObject = require('./CLIObject');
var util = require('./util');


function Argument(value, onError) {
    Argument.super_.call(this, onError);
    this.value = value;
    this.parse(value);
}

module.exports = util.inherits(Argument, CLIObject, {

    name: 'Argument',

    // [<foo-bar>...]
    optionalRepeatingPat: /^\[<([a-z_][a-z_-]*)>\.{3}\]$/i,

    // <foo-bar>...
    requiredRepeatingPat: /^<([a-z_][a-z_-]*)>\.{3}$/i,

    // [foo-bar]
    optionalPat: /^\[([a-z_][a-z_-]*)\]$/i,

    // <foo-bar>
    requiredPat: /^<([a-z_][a-z_-]*)>$/i,

    parse: function(value) {
        this.required = false;
        this.repeating = false;
        var m;
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
        this.name = m && m.pop();
        this.optional = !this.required;
    },

    toString: function() {
        if (this.optional) {
            if (this.repeating) {
                return '[<' + this.name + '>...]';
            }
            return '[' + this.name + ']';
        }
        var result = '<' + this.name + '>';
        return (this.repeating) ? result + '...' : result;
    }

});
