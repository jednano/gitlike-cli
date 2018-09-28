var util = require('./util');

function CLIError(message) {
    CLIError.super_.call(this);
    this.message = message || '';
}

module.exports = util.inherits(CLIError, Error, {
    name: 'CLIError'
});
