if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(str) {
        return this.slice(0, str.length) === str;
    };
}

if(!String.prototype.repeat) {
    String.prototype.repeat = function(count) {
        return count > 0 ? new Array(count + 1).join(this) : '';
    };
}

if (!String.prototype.camelize) {
    String.prototype.camelize = function() {
        return this && this.replace(/[ -]+([a-z])?/gi, function(s, g1) {
            return g1 ? g1.toUpperCase() : '';
        });
    };
}
