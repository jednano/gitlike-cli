import CLIObject from './CLIObject';

export default class CLIError extends Error {
    name = 'CLIError';

    public command: CLIObject | null = null;

    constructor(public message = '') {
        super();
    }
}
