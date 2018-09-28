var path = require('path');
var Command = require('./lib/Command');


var cmd = new Command(path.basename(process.argv[1]));

cmd.on('error', function(err, command) {
    setTimeout(function() {
        console.log();
        console.log('  Error:', err.message);
        command.outputUsage();
        command.outputCommands();
        command.outputOptions();
        console.log();
        process.exit(1);
    }, 0);
});

module.exports = cmd;
