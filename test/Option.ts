import * as chai from 'chai';
const expect = chai.expect;

import Argument from '../lib/Argument';
import Option from '../lib/Option';

describe('Option', () => {

    it('supports short flags', () => {
        const opt = new Option('-f');
        expect(opt).to.have.property('short').and.equal('f');
        expect(opt).to.have.property('name').and.equal('f');
    });

    it('supports long flags', () => {
        const opt = new Option('--foo');
        expect(opt).to.have.property('long').and.equal('foo');
        expect(opt).to.have.property('name').and.equal('foo');
    });

    it('supports short-long combo flags', () => {
        const opt = new Option('-f, --foo');
        expect(opt).to.have.property('short').and.equal('f');
        expect(opt).to.have.property('long').and.equal('foo');
        expect(opt).to.have.property('name').and.equal('foo');
    });

    it('supports short-long combo flags with an argument', () => {
        const opt = new Option('-f, --foo <bar>');
        expect(opt).to.have.property('short').and.equal('f');
        expect(opt).to.have.property('long').and.equal('foo');
        expect(opt).to.have.property('name').and.equal('foo');
        expect(opt).to.have.property('arg').and.be.instanceOf(Argument);
    });

    it('supports dashed names', () => {
        const opt = new Option('--foo-bar-baz-');
        expect(opt).to.have.property('long').and.equal('fooBarBaz');
        expect(opt).to.have.property('name').and.equal('fooBarBaz');
    });

    it('supports a single argument', () => {
        const opt = new Option('-f <bar>');
        expect(opt).to.have.property('arg').and.be.instanceof(Argument);
    });

    it('errors when passed a repeating argument', () => {
        expect(() => {
            new Option('-f <bar>...');
        }).to.throw(Option.prototype.Error);
    });

    describe('Parsing', () => {

        let opt: Option;
        beforeEach(() => {
            opt = new Option('-f <bar>');
        });

        it('parses string values', () => {
            expect(opt.parse('baz')).to.equal('baz');
        });

        it('parses numeric values', () => {
            expect(opt.parse('42')).to.equal(42);
        });

        it('parses boolean values', () => {
            expect(opt.parse('false')).to.be.false;
        });

        it('parses JSON values', () => {
            expect(opt.parse('{"foo":"bar"}')).to.deep.equal({ foo: 'bar' });
        });

        it('parses values with callback functions', () => {
            opt = new Option('-f <bar>', null, (value: string) => {
                return value + 'qux';
            });
            expect(opt.parse('baz')).to.equal('bazqux');

            opt = new Option('-b <baz>', null, (value: string) => {
                return value + 32;
            });
            expect(opt.parse('10')).to.equal(42);
        });
    });
});
