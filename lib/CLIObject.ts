var EventEmitter = require('events').EventEmitter;

var CLIError = require('./CLIError');
var util = require('./util');


function CLIObject(onError) {
    CLIObject.super_.call(this);
    this.onError = onError || this.onError;

    var name = this.name + 'Error';
    function CLIObjectError(message) {
        CLIObjectError.super_.call(this, message);
        this.name = name;
    }

    util.inherits(CLIObjectError, CLIError);
    this.Error = CLIObjectError;
}

module.exports = util.inherits(CLIObject, EventEmitter, {

    error: function(message) {
        var err = new this.Error(message);
        err.command = this;
        this.onError(err);
    },

    onError: function(err) {
        this.emit('error', err, err.command);
    }

});
