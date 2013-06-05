var path = require('path');
var Command = require('./lib/Command');


var cmd = new Command(path.basename(process.argv[1]));

cmd.on('error', function(err) {
    console.log('');
    console.log('  Error:', err.message);
    cmd.outputUsage();
    cmd.outputCommands();
    cmd.outputOptions();
    console.log();
    process.exit(1);
});

module.exports = cmd;
