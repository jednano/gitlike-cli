if (!Object.prototype.first) {
    Object.prototype.first = function(fn) {
        var keys = Object.keys(this);
        for (var i = 0; i < keys.length; i++) {
            var val = this[keys[i]];
            if (fn(val)) {
                return val;
            }
        }
    };
}
