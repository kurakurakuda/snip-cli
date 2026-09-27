type logLevel = 'log' | 'error';

type LogMessage = {
    message: any,
    level: logLevel,
    detail: logDetail
}

export type logDetail = 'normal' | 'verbose';

export class Logger {

    private messages: LogMessage[];
    private detail: logDetail;

    constructor(detail: logDetail = 'normal') {
        this.messages = [];
        this.detail = detail;
    }

    public appendLog(message: any, level: logLevel = 'log', detail: logDetail = 'normal') {
        if (this.detail === 'normal' && detail === 'verbose') {
            return;
        }
        this.messages.push({ message: message, level: level, detail: detail });
    }

    public clearLogs() {
        this.messages = [];
    }

    public printLogs() {
        this.messages.forEach(m =>this.printStream(m.message, m.level))
    }

    public printStream(message: string, level: logLevel = 'log', detail: logDetail = 'normal') {
        if (this.detail === 'normal' && detail === 'verbose') {
            return;
        }
        switch (level) {
            case 'error':
                console.error(message);
                break;
            default:
                console.log(message);
                break;
        }
    }

    public printStreamWithPrefix(message: string, prefix: string, level: logLevel = 'log') {
        this.printStream(`[${prefix}] ${message}`, level);
    }
}