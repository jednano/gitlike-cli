var expect = require('chai').expect;

var Argument = require('../lib/Argument');


// ReSharper disable WrongExpressionStatement
describe('Argument', function () {

    it('supports optional mode', function () {
        var arg = new Argument('[foo]');
        expect(arg).to.have.property('name').and.equal('foo');
        expect(arg).to.have.property('optional').and.be.true;
        expect(arg).to.have.property('required').and.be.false;
    });

    it('supports required mode', function () {
        var arg = new Argument('<foo>');
        expect(arg).to.have.property('name').and.equal('foo');
        expect(arg).to.have.property('required').and.be.true;
        expect(arg).to.have.property('optional').and.be.false;
    });

    it('supports optional repeating mode', function () {
        var arg = new Argument('[<foo>...]');
        expect(arg).to.have.property('name').and.equal('foo');
        expect(arg).to.have.property('optional').and.be.true;
        expect(arg).to.have.property('required').and.be.false;
        expect(arg).to.have.property('repeating').and.be.true;
    });

    it('supports required repeating mode', function () {
        var arg = new Argument('<foo>...');
        expect(arg).to.have.property('name').and.equal('foo');
        expect(arg).to.have.property('required').and.be.true;
        expect(arg).to.have.property('optional').and.be.false;
        expect(arg).to.have.property('repeating').and.be.true;
    });

});
