import { EventEmitter } from 'events';

import CLIError from './CLIError';

export default class CLIObject extends EventEmitter {

    public Error: typeof CLIError;

    constructor(public name: string) {
        super()

        class CLIObjectError extends CLIError {
            constructor(message: string) {
                super(message)
                this.name = `${name}Error`;
            }
        }

        this.Error = CLIObjectError;
    }

    public error(message: string) {
        this.onError(new this.Error(message));
    }

    protected onError(err: CLIError) {
        this.emit('error', err, err.command);
    }
}
