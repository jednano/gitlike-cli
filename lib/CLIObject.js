var EventEmitter = require('events').EventEmitter;

var CLIError = require('./CLIError');
var util = require('./util');


function CLIObject(onError) {
    CLIObject.super_();
    this.onError = onError || this.onError;
}

util.inherits(CLIObject, EventEmitter, {

    error: function(message) {
        this.onError(new this.Error(message));
    },

    onError: function(err) {
        this.emit('error', err);
    },

    Error: CLIObjectError

});

function CLIObjectError(message) {
    CLIObjectError.super_(message);
    this.name = 'CLIObjectError';
}

util.inherits(CLIObjectError, CLIError);

module.exports = CLIObject;
