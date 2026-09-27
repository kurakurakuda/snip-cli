import * as sinon from 'sinon';
import { expect, assert } from 'chai';
import { CliAbortError } from '../../src/utils/error.ts';

describe('CliAbortError', () => {
    it('throw without logDetail', () => {
        try {
            throw new CliAbortError('error');
        } catch (e) {
            expect((e as CliAbortError).message).to.equal('error');
            expect((e as CliAbortError).logDetail).to.equal('normal');
        }
    });

    it('throw with logDetail as verbose', () => {
        try {
            throw new CliAbortError('error', 'verbose');
        } catch (e) {
            expect((e as CliAbortError).message).to.equal('error');
            expect((e as CliAbortError).logDetail).to.equal('verbose');
        }
    });
});