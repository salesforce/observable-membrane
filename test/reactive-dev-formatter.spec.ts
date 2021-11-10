import '../src/reactive-dev-formatter';
import { ReactiveMembrane } from '../src/reactive-membrane';

describe('reactive dev formatter', function () {
    it('should add an array to window', function () {
        expect((window as any).devtoolsFormatters).toBeDefined();
    });

    it('should return null when given a plain object', function () {
        expect((window as any).devtoolsFormatters[0].header({})).toBe(null);
    });

    it('should return correct object when given reactive proxy', function () {
        const el = document.createElement('div');
        const reactiveMembrane = new ReactiveMembrane();
        const proxy = reactiveMembrane.getProxy({ foo: 'bar', el, baz: { quux: 'quux' } });
        const result = (window as any).devtoolsFormatters[0].header(proxy);
        expect(result).toEqual([
            'object',
            {
                object: {
                    foo: 'bar',
                    baz: { quux: 'quux' },
                    el,
                },
            },
        ]);
        expect(result[1].object.el).toBe(el);
    });

    it('should return correct array when given an array', () => {
        const el = document.createElement('div');
        const reactiveMembrane = new ReactiveMembrane();
        const proxy = reactiveMembrane.getProxy([{ foo: 'bar', el }, undefined]);
        const result = (window as any).devtoolsFormatters[0].header(proxy);
        expect(result).toEqual([
            'object',
            {
                object: [
                    {
                        foo: 'bar',
                        el,
                    },
                    undefined,
                ],
            },
        ]);
        expect(result[1].object[0].el).toBe(el);
    });

    it('body is always null', () => {
        expect((window as any).devtoolsFormatters[0].hasBody({})).toBe(false);
        expect((window as any).devtoolsFormatters[0].body({})).toBeNull();
    });
});
