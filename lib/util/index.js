var util = require('util');
require('./array');
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
    },

    findFirst : function(haystack, callback) {
        var keys = Object.keys(haystack);
        for (var i = 0; i < keys.length; i++) {
            var straw = haystack[keys[i]];
            if (callback(straw)) {
                return straw;
            }
        }
        return undefined;
    }

};
