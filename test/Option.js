var expect = require('chai').expect;

var Argument = require('../lib/Argument');
var Option = require('../lib/Option');


// ReSharper disable WrongExpressionStatement
describe('Option', function() {

    it('supports short flags', function() {
        var opt = new Option('-f');
        expect(opt).to.have.property('short').and.equal('f');
        expect(opt).to.have.property('name').and.equal('f');
    });

    it('supports long flags', function() {
        var opt = new Option('--foo');
        expect(opt).to.have.property('long').and.equal('foo');
        expect(opt).to.have.property('name').and.equal('foo');
    });

    it('supports short-long combo flags', function() {
        var opt = new Option('-f, --foo');
        expect(opt).to.have.property('short').and.equal('f');
        expect(opt).to.have.property('long').and.equal('foo');
        expect(opt).to.have.property('name').and.equal('foo');
    });

    it('supports short-long combo flags with an argument', function() {
        var opt = new Option('-f, --foo <bar>');
        expect(opt).to.have.property('short').and.equal('f');
        expect(opt).to.have.property('long').and.equal('foo');
        expect(opt).to.have.property('name').and.equal('foo');
        expect(opt).to.have.property('arg').and.be.instanceOf(Argument);
    });

    it('supports dashed names', function() {
        var opt = new Option('--foo-bar-baz-');
        expect(opt).to.have.property('long').and.equal('fooBarBaz');
        expect(opt).to.have.property('name').and.equal('fooBarBaz');
    });

    it('supports a single argument', function() {
        var opt = new Option('-f <bar>');
        expect(opt).to.have.property('arg').and.be.instanceof(Argument);
    });

    it('errors when passed a repeating argument', function() {
        var fn = function() {
            new Option('-f <bar>...');
        };
        expect(fn).to.throw(Option.prototype.Error);
    });

    describe('Parsing', function() {

        var opt;
        beforeEach(function() {
            opt = new Option('-f <bar>');
        });

        it('parses string values', function() {
            expect(opt.parse('baz')).to.equal('baz');
        });

        it('parses numeric values', function() {
            expect(opt.parse('42')).to.equal(42);
        });

        it('parses boolean values', function() {
            expect(opt.parse('false')).to.be.false;
        });

        it('parses JSON values', function() {
            expect(opt.parse('{"foo":"bar"}')).to.deep.equal({ foo: 'bar' });
        });

        it('parses values with callback functions', function() {
            opt = new Option('-f <bar>', null, function(value) {
                return value + 'qux';
            });
            expect(opt.parse('baz')).to.equal('bazqux');

            opt = new Option('-b <baz>', null, function(value) {
                return value + 32;
            });
            expect(opt.parse('10')).to.equal(42);
        });
    });
});
