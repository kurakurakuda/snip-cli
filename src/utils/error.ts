type logDetail = 'normal' | 'verbose';

export class CliAbortError extends Error {

    public logDetail: logDetail ;

    constructor(message: string, logDetail: logDetail = 'normal') {
        super(message);
        this.logDetail = logDetail;
    }
};