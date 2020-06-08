import { ReactiveMembrane } from '../src/reactive-membrane';

describe('constructor', () => {
    it('should work without any config', () => {
        const o = { x: 1 };
        const target = new ReactiveMembrane();
        const wet = target.getProxy(o);
        expect(wet.x).toBe(1);
    });

    it('should work with empty config', () => {
        const o = { x: 1 };
        const target = new ReactiveMembrane({});
        const wet = target.getProxy(o);
        expect(wet.x).toBe(1);
    });

    it('should allow valueIsObservable to return false', () => {
        const o = { x: 1 };
        const target = new ReactiveMembrane({
            valueIsObservable(value) {
                return false;
            },
        });

        const wet = target.getProxy(o);
        wet.x = 'changed';
        expect(wet).toBe(o);
    });

    it('should support proxies for RegExp', () => {
        const regex1 = /fooBar/ig;
        const target = new ReactiveMembrane({
            valueIsObservable(value) {
                return typeof value === 'object' && value !== null;
            },
        });

        const wet = target.getProxy(regex1);
        expect(wet !== regex1).toBe(true);
        expect(wet.source).toBe("fooBar");
    });

    it('should support proxies for branded non-plain objects', () => {
        class Foo {
            _x = 0;
            get x() {
                return this._x;
            }
            set x(v) {
                this._x = v;
            }
            doubleX() {
                return this._x * 2;
            }
        }
        const tag = Symbol.for('@@myMembraneTag');
        const blue = new Foo();
        Object.defineProperty(blue, tag, {});
        const target = new ReactiveMembrane({
            valueIsObservable(value) {
                return typeof value === 'object' && value !== null && value.hasOwnProperty(tag);
            },
        });

        const red = target.getProxy(blue);
        expect(blue !== red).toBe(true);
        expect(red.x).toBe(0);
        red.x = 1;
        expect(red.x).toBe(1);
        expect(blue.x).toBe(1);
        expect(red.doubleX()).toBe(2);
    });
});
