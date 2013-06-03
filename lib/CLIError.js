var util = require('./util');

function CLIError(message) {
    CLIError.super_.call(this);
    this.message = message || '';
}

util.inherits(CLIError, Error, {
    name: 'CLIError'
});

module.exports = CLIError;
