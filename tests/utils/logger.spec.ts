import * as sinon from 'sinon';
import { expect, assert } from 'chai';
import { logDetail, Logger } from '../../src/utils/logger.ts';

describe('Logger', () => {
	let logger: Logger;
	let consoleStub: sinon.SinonStub;
	let errorStub: sinon.SinonStub;
	beforeEach(() => {
		consoleStub = sinon.stub(console, 'log').callsFake(() => {});
		errorStub = sinon.stub(console, 'error').callsFake(() => {});
	});
	afterEach(() => {
		consoleStub.resetHistory();
		errorStub.resetHistory();
		sinon.restore();
	});

	describe('printLogs', () => {
		describe('Initialize without passing logDetail(= normal)', () => {
			beforeEach(() => {
				logger = new Logger();
			});

			it('should print log messages to console.log', () => {
				logger.appendLog('a');
				logger.printLogs();
				expect(consoleStub).to.calledWith('a');
				expect(errorStub).not.to.calledWith();
			});

			it('should print error messages to console.error', () => {
				logger.appendLog('err', 'error');
				logger.printLogs();
				expect(consoleStub).not.to.calledWith();
				expect(errorStub).to.calledWith('err');
			});

			it('should not print messages when logDetail is verbose', () => {
				logger.appendLog('a', 'log', 'verbose');
				logger.appendLog('err', 'error', 'verbose');
				logger.printLogs();
				expect(consoleStub).not.to.calledWith();
				expect(errorStub).not.to.calledWith();
			});

			it('should print mixed log types', () => {
				logger.appendLog('a');
				logger.appendLog('b', 'error');
				logger.appendLog('c', 'log');
				logger.appendLog('d', 'log', 'verbose');
				logger.appendLog('e', 'log', 'normal');
				logger.appendLog('f', 'error', 'verbose');
				logger.appendLog('g', 'error', 'normal');				
				logger.printLogs();
				expect(consoleStub).to.calledWith('a');
				expect(errorStub).to.calledWith('b');
				expect(consoleStub).to.calledWith('c');
				expect(consoleStub).to.calledWith('e');
				expect(errorStub).to.calledWith('g');
			});

			it('should not print when messages is empty', () => {
				logger.printLogs();
				expect(consoleStub).not.to.calledWith();
				expect(errorStub).not.to.calledWith();
			});

			it('should print after cleared', () => {
				logger.appendLog('a');
				logger.appendLog('b', 'error');
				logger.appendLog('c');
				logger.appendLog('d', 'log', 'verbose');
				logger.appendLog('e', 'log', 'normal');
				logger.appendLog('f', 'error', 'verbose');
				logger.appendLog('g', 'error', 'normal');
				logger.clearLogs();
				logger.printLogs();
				expect(consoleStub).not.to.calledWith();
				expect(errorStub).not.to.calledWith();
			});
		});

		describe('Initialize with passing logDetail as verbose', () => {
			beforeEach(() => {
				logger = new Logger('verbose');
			});

			it('should print log messages to console.log', () => {
				logger.appendLog('a');
				logger.printLogs();
				expect(consoleStub).to.calledWith('a');
				expect(errorStub).not.to.calledWith();
			});

			it('should print error messages to console.error', () => {
				logger.appendLog('err', 'error');
				logger.printLogs();
				expect(consoleStub).not.to.calledWith();
				expect(errorStub).to.calledWith('err');
			});

			it('should not print messages when logDetail is verbose', () => {
				logger.appendLog('a', 'log', 'verbose');
				logger.appendLog('err', 'error', 'verbose');
				logger.printLogs();
				expect(consoleStub).to.calledWith('a');
				expect(errorStub).to.calledWith('err');
			});

			it('should print mixed log types', () => {
				logger.appendLog('a');
				logger.appendLog('b', 'error');
				logger.appendLog('c', 'log');
				logger.appendLog('d', 'log', 'verbose');
				logger.appendLog('e', 'log', 'normal');
				logger.appendLog('f', 'error', 'verbose');
				logger.appendLog('g', 'error', 'normal');
				logger.printLogs();
				expect(consoleStub).to.calledWith('a');
				expect(errorStub).to.calledWith('b');
				expect(consoleStub).to.calledWith('c');
				expect(consoleStub).to.calledWith('d');
				expect(consoleStub).to.calledWith('e');
				expect(errorStub).to.calledWith('f');
				expect(errorStub).to.calledWith('g');
			});

			it('should not print when messages is empty', () => {
				logger.printLogs();
				expect(consoleStub).not.to.calledWith();
				expect(errorStub).not.to.calledWith();
			});

			it('should print after cleared', () => {
				logger.appendLog('a');
				logger.appendLog('b', 'error');
				logger.appendLog('c');
				logger.appendLog('d', 'log', 'verbose');
				logger.appendLog('e', 'log', 'normal');
				logger.appendLog('f', 'error', 'verbose');
				logger.appendLog('g', 'error', 'normal');
				logger.clearLogs();
				logger.printLogs();
				expect(consoleStub).not.to.calledWith();
				expect(errorStub).not.to.calledWith();
			});
		});
	});

	describe('printStream', () => {
		[
			{ detail: 'normal'}, { detail: 'verbose'}, { detail: undefined}
		].forEach(({ detail }) => it(`initialization logDetail = ${detail} and level = log`, () => {
			logger = detail ? new Logger(detail as logDetail) : new Logger();
			logger.printStream('a', 'log');
			expect(consoleStub).to.calledWith('a');
			expect(errorStub).not.to.calledWith();
		}));

		[
			{ detail: 'normal'}, { detail: 'verbose'}, { detail: undefined}
		].forEach(({ detail }) => it(`initialization logDetail = ${detail} and level = error`, () => {
			logger = detail ? new Logger(detail as logDetail) : new Logger();
			logger.printStream('a', 'error');
			expect(consoleStub).not.to.calledWith();
			expect(errorStub).to.calledWith('a');
		}));

		[
			{ detail: 'normal'}, { detail: 'verbose'}, { detail: undefined}
		].forEach(({ detail }) => it(`initialization logDetail = ${detail} and level = undefined`, () => {
			logger = detail ? new Logger(detail as logDetail) : new Logger();
			logger.printStream('a');
			expect(consoleStub).to.calledWith('a');
			expect(errorStub).not.to.calledWith();
		}));

		[
			{ detail: 'normal'}, { detail: 'verbose'}, { detail: undefined}
		].forEach(({ detail }) => it(`initialization logDetail = ${detail} and level = log and detail = normal`, () => {
			logger = detail ? new Logger(detail as logDetail) : new Logger();
			logger.printStream('a', 'log', 'normal');
			expect(consoleStub).to.calledWith('a');
			expect(errorStub).not.to.calledWith();
		}));

		[
			{ detail: 'normal'}, { detail: 'verbose'}, { detail: undefined}
		].forEach(({ detail }) => it(`initialization logDetail = ${detail} and level = error and detail = normal`, () => {
			logger = detail ? new Logger(detail as logDetail) : new Logger();
			logger.printStream('a', 'error', 'normal');
			expect(consoleStub).not.to.calledWith();
			expect(errorStub).to.calledWith('a');
		}));

		[
			{ detail: 'normal'}, { detail: 'verbose'}, { detail: undefined}
		].forEach(({ detail }) => it(`initialization logDetail = ${detail} and level = undefined and detail = normal`, () => {
			logger = detail ? new Logger(detail as logDetail) : new Logger();
			logger.printStream('a', undefined, 'normal');
			expect(consoleStub).to.calledWith('a');
			expect(errorStub).not.to.calledWith();
		}));

		[
			{ detail: 'normal'}, { detail: 'verbose'}, { detail: undefined}
		].forEach(({ detail }) => it(`initialization logDetail = ${detail} and level = log and detail = verbose`, () => {
			logger = detail ? new Logger(detail as logDetail) : new Logger();
			logger.printStream('a', 'log', 'verbose');
			if (detail === 'verbose') {
				expect(consoleStub).to.calledWith('a');
			} else {
				expect(consoleStub).not.to.calledWith('a');
			}
			expect(errorStub).not.to.calledWith();
		}));

		[
			{ detail: 'normal'}, { detail: 'verbose'}, { detail: undefined}
		].forEach(({ detail }) => it(`initialization logDetail = ${detail} and level = error and detail = verbose`, () => {
			logger = detail ? new Logger(detail as logDetail) : new Logger();
			logger.printStream('a', 'error', 'verbose');
			expect(consoleStub).not.to.calledWith();
			if (detail === 'verbose') {
				expect(errorStub).to.calledWith('a');
			} else {
				expect(errorStub).not.to.calledWith();
			}
		}));

		[
			{ detail: 'normal'}, { detail: 'verbose'}, { detail: undefined}
		].forEach(({ detail }) => it(`initialization logDetail = ${detail} and level = undefined and detail = verbose`, () => {
			logger = detail ? new Logger(detail as logDetail) : new Logger();
			logger.printStream('a', undefined, 'verbose');
			if (detail === 'verbose') {
				expect(consoleStub).to.calledWith('a');
			} else {
				expect(consoleStub).not.to.calledWith('a');
			}
			expect(errorStub).not.to.calledWith();
		}));
	});

	describe('printStreamWithPrefix', () => {
		[
			{ detail: 'normal'}, { detail: 'verbose'}, { detail: undefined}
		].forEach(({ detail }) => it(`level = log and logDetail = ${detail}`, () => {
			logger = detail ? new Logger(detail as logDetail) : new Logger();
			logger.printStreamWithPrefix('a', 'x', 'log');
			expect(consoleStub).to.calledWith('[x] a');
			expect(errorStub).not.to.calledWith();
		}));

		[
			{ detail: 'normal'}, { detail: 'verbose'}, { detail: undefined}
		].forEach(({ detail }) => it(`level = error and logDetail = ${detail}`, () => {
			logger = detail ? new Logger(detail as logDetail) : new Logger();
			logger.printStreamWithPrefix('a', 'x', 'error');
			expect(consoleStub).not.to.calledWith();
			expect(errorStub).to.calledWith('[x] a');
		}));

		[
			{ detail: 'normal'}, { detail: 'verbose'}, { detail: undefined}
		].forEach(({ detail }) => it(`level = undefined and logDetail = ${detail}`, () => {
			logger = detail ? new Logger(detail as logDetail) : new Logger();
			logger.printStreamWithPrefix('a', 'x');
			expect(consoleStub).to.calledWith('[x] a');
			expect(errorStub).not.to.calledWith();
		}));
	});
});
