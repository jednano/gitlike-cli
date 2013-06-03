var util = require('util');
require('./array');
require('./object');
require('./string');

module.exports = {

    inherits : function(sub, sup, proto) {
        util.inherits(sub, sup);
        if (typeof proto !== 'undefined') {
            Object.keys(proto).forEach(function(key) {
                sub.prototype[key] = proto[key];
            });
        }
        return sub;
    }

};
