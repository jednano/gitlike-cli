var Argument = require('./Argument');
var CLIError = require('./CLIError');
var CLIObject = require('./CLIObject');
var util = require('./util');
var string = require('./util/string');


function Option(flags, description, fn, defaultValue, onError) {
    Option.super_.call(this, onError);
    this.flags = flags;
    this.description = description || '';

    if (typeof fn === 'function') {
        this.callback = fn;
        if (typeof defaultValue !== 'undefined') {
            this.defaultValue = defaultValue;
        }
    } else {
        this.defaultValue = fn;
    }

    this.reset(flags);
}

module.exports = util.inherits(Option, CLIObject, {

    name: 'Option',

    // -f, --foo-bar
    shortAndLongPat: /^\-([a-z])[ ,|]+\-{2}([a-z_][a-z_-]*)(?: +(.+))?$/i,

    // -f
    shortPat: /^\-([a-z_][a-z_-]*)(?: +(.+))?$/i,

    // --foo-bar
    longPat: /^\-{2}([a-z_][a-z_-]*)(?: +(.+))?$/i,

    reset: function(flags) {
        var m;
        if (m = flags.match(this.shortAndLongPat)) {
            this.setArg(m);
            this.long = m.pop();
            this.short = m.pop();
        } else if (m = flags.match(this.shortPat)) {
            this.setArg(m);
            this.short = m.pop();
        } else if (m = flags.match(this.longPat)) {
            this.setArg(m);
            this.long = m.pop();
        } else {
            this.error('Invalid flag format: ' + flags);
        }

        this.validateArgument();
        this.handleInvertedBoolean();

        this.long && (this.long = this.long.camelize());
        this.name = this.long || this.short;
    },

    validateArgument: function() {
        if (!this.arg) {
            return;
        }
        if (this.arg.repeating) {
            this.error('Option arguments cannot be repeating.');
        }
        if (this.arg.custom && !this.callback) {
            this.error('Custom option arguments must have a value parser.');
        }
    },

    handleInvertedBoolean: function() {
        var m = this.long && this.long.match(/^not?-(.+)$/i);
        if (m) {
            this.negates = m[1];
        }
        this.bool = !m;
    },

    setArg: function(match) {
        var value = match.pop();
        if (!value) {
            return;
        }
        value && (this.arg = new Argument(value, this.onError.bind(this)));
    },

    parse: function(value) {
        var result;
        try {
            result = JSON.parse(value);
        } catch(e) {
            result = value || this.defaultValue;
        }
        if (this.callback) {
            return this.callback(result);
        }
        return result;
    }

});
