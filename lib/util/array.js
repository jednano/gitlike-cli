if (!Array.prototype.first) {
    Array.prototype.first = function(fn) {
        if (typeof fn !== 'function') {
            return this[0];
        }
        for (var i = 0; i < this.length; i++) {
            var val = this[i];
            if (fn(val)) {
                return val;
            }
        }
    };
}
