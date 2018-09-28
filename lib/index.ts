import { basename } from 'path';

import Command from './Command';

const cmd = new Command(basename(process.argv[1]));

cmd.on('error', (err, command) => {
    setTimeout(() => {
        console.log();
        console.log('  Error:', err.message);
        command.outputUsage();
        command.outputCommands();
        command.outputOptions();
        console.log();
        process.exit(1);
    }, 0);
});

export default cmd;
