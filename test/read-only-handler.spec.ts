import { ReactiveMembrane } from '../src/reactive-membrane';

function doNothing(_v: any) {
    /* do nothing */
}

describe('ReadOnlyHandler', () => {
    it('should always return the same proxy', () => {
        const o = { x: 1 };
        const target = new ReactiveMembrane();

        const first = target.getReadOnlyProxy(o);
        const second = target.getReadOnlyProxy(o);
        expect(first.x).toBe(second.x);
        expect(first).toBe(second);
    });
    it('should never rewrap a previously produced proxy', () => {
        const o = { x: 1 };
        const target = new ReactiveMembrane();
        const first = target.getReadOnlyProxy(o);
        const second = target.getReadOnlyProxy(first);
        expect(first.x).toBe(second.x);
        expect(first).toBe(second);
    });
    it('should rewrap unknown proxy', () => {
        const o = { x: 1 };
        const target = new ReactiveMembrane();
        const first = new Proxy(o, {});
        const second = target.getReadOnlyProxy(first);
        expect(first).not.toBe(second);
    });
    it('should handle frozen objects correctly', () => {
        const o = Object.freeze({
            foo: {}
        });
        const target = new ReactiveMembrane();
        const property = target.getReadOnlyProxy(o);
        expect(() => {
            doNothing(property.foo);
        }).not.toThrow();
    });
    it('should maintain equality', function() {
        const target = new ReactiveMembrane();

        const a: any = {
            foo: {
                self: null
            }
        };

        a.foo.self = a;

        const property = target.getReadOnlyProxy(a);
        expect(property.foo.self).toBe(property);
    });
    it('should understand property desc with getter', function() {
        const target = new ReactiveMembrane();

        const obj = {
            test: 2
        };
        const a = {
            hello: 'world'
        };
        Object.defineProperty(obj, 'foo', {
            get: function getter() {
                return a;
            },
            enumerable: true
        });

        const property = target.getReadOnlyProxy(obj);
        const desc = Object.getOwnPropertyDescriptor(property, 'foo')!;
        expect(desc.get!.call(property)).toBe(property.foo);
        expect(target.getReadOnlyProxy(desc.get!.call(property))).toBe(property.foo);
    });
    it('should handle has correctly', function() {
        const target = new ReactiveMembrane();
        const obj = {
            foo: 'bar'
        };

        const property = target.getReadOnlyProxy(obj);
        expect('foo' in property);
    });
    it('should throw when deleting', function() {
        const target = new ReactiveMembrane();
        const obj = [{ foo: 'bar' }];

        const property = target.getReadOnlyProxy(obj);
        expect(() => {
            delete property[0];
        }).toThrow();
    });
    it('should handle extensible correctly when target is extensible', function() {
        const target = new ReactiveMembrane();
        const hello = {
            hello: 'world'
        };

        const obj = {
            hello
        };

        const wrapped = target.getReadOnlyProxy(obj);
        expect(Object.isExtensible(wrapped));
    });
    it('preventExtensions should throw', function() {
        const target = new ReactiveMembrane();
        const obj = {
            foo: 'bar'
        };
        const property = target.getReadOnlyProxy(obj);

        expect(() => {
            Object.preventExtensions(property);
        }).toThrow();
    });
    it('defineProperty should throw', function() {
        const target = new ReactiveMembrane();
        const obj = {
            foo: 'bar'
        };

        const property = target.getReadOnlyProxy(obj);
        expect(() => {
            Object.defineProperty(property, 'hello', {
                value: 'world'
            });
        }).toThrow();
    });

    it('should handle Object.getOwnPropertyNames correctly', function() {
        const target = new ReactiveMembrane();
        const obj = {
            a: 'b'
        };
        const proxy = target.getReadOnlyProxy(obj);
        expect(Object.getOwnPropertyNames(proxy)).toEqual(['a']);
    });
    it('should handle Object.getOwnPropertyNames when object has symbol', function() {
        const target = new ReactiveMembrane();
        const sym = Symbol();
        const obj = {
            a: 'b',
            [sym]: 'symbol'
        };
        const proxy = target.getReadOnlyProxy(obj);
        expect(Object.getOwnPropertyNames(proxy)).toEqual(['a']);
    });
    it('should handle Object.getOwnPropertySymbols when object has symbol', function() {
        const target = new ReactiveMembrane();
        const sym = Symbol();
        const obj = {
            [sym]: 'symbol'
        };
        const proxy = target.getReadOnlyProxy(obj);
        expect(Object.getOwnPropertySymbols(proxy)).toEqual([sym]);
    });
    it('should handle Object.getOwnPropertySymbols when object has symbol and key', function() {
        const target = new ReactiveMembrane();
        const sym = Symbol();
        const obj = {
            a: 'a',
            [sym]: 'symbol'
        };
        const proxy = target.getReadOnlyProxy(obj);
        expect(Object.getOwnPropertySymbols(proxy)).toEqual([sym]);
    });
    it('should handle Object.keys when object has symbol and key', function() {
        const target = new ReactiveMembrane();
        const sym = Symbol();
        const obj = {
            a: 'a',
            [sym]: 'symbol'
        };
        const proxy = target.getReadOnlyProxy(obj);
        expect(Object.keys(proxy)).toEqual(['a']);
    });

    it('should maintain equality', () => {
        const membrane = new ReactiveMembrane();

        const obj = {};
        expect(membrane.getReadOnlyProxy(obj)).toBe(membrane.getReadOnlyProxy(obj));
    });

    it('should throw on deep mutations', () => {
        const membrane = new ReactiveMembrane();

        const obj = membrane.getReadOnlyProxy({});
        expect(() => {
            obj.foo = 'bar';
        }).toThrowError();
    });

    it('should notify when property is accessed', () => {
        const obj = {
            foo: 'bar',
        };
        const accessSpy = jest.fn();
        const membrane = new ReactiveMembrane({
            valueObserved: accessSpy,
        });

        const wet = membrane.getReadOnlyProxy(obj);
        doNothing(wet.foo);
        expect(accessSpy).toHaveBeenCalledTimes(1);
        expect(accessSpy).toHaveBeenCalledWith(obj, 'foo');
    });

    it('should notify when deep property is accessed', () => {
        const obj = {
            foo: {
                bar: 'baz',
            }
        };
        const accessSpy = jest.fn();
        const membrane = new ReactiveMembrane({
            valueObserved: accessSpy,
        });

        const wet = membrane.getReadOnlyProxy(obj);
        doNothing(wet.foo.bar);
        expect(accessSpy).toHaveBeenCalledTimes(2);
        expect(accessSpy).toHaveBeenLastCalledWith(obj.foo, 'bar');
    });
    it('should throw when attempting to mutate a read only proxy by transitivity', function() {
        const target = new ReactiveMembrane();
        const obj = { foo: 'bar' };

        const readOnly = target.getReadOnlyProxy(obj);
        const writeAndRead = target.getProxy(readOnly);
        expect(() => {
            writeAndRead.foo = 'baz';
        }).toThrow();
    });
    it('should throw when attempting to mutate a read only proxy via initialization of writable proxy', function() {
        const target = new ReactiveMembrane();
        const obj = { foo: 'bar' };

        const readOnly = target.getReadOnlyProxy(obj);
        const writeAndRead = target.getProxy({ x: readOnly });
        expect(() => {
            writeAndRead.x.foo = 'baz';
        }).toThrow();
    });
    it('should throw when attempting to mutate a read only proxy via mutations of a writable proxy', function() {
        const target = new ReactiveMembrane();
        const obj = { foo: 'bar' };

        const readOnly = target.getReadOnlyProxy(obj);
        const writeAndRead = target.getProxy({});
        writeAndRead.x = readOnly;
        expect(() => {
            writeAndRead.x.foo = 'baz';
        }).toThrow();
    });

    it('should not throw when frozen reactive proxy is converted to read only', () => {
        const value = {};
        const object = {
            foo: value,
        };

        const membrane = new ReactiveMembrane();

        const reactive = membrane.getProxy(object);
        Object.freeze(reactive);
        const readOnly = membrane.getReadOnlyProxy(reactive);
        expect(() => {
            doNothing(readOnly.foo);
        }).not.toThrow();
    });
    describe('issue #20 - getOwnPropertyDescriptor', () => {
        it('readonly proxy prevents mutation when value accessed via accessor descriptor', () => {
            const target = new ReactiveMembrane();
            const todos = {};
            Object.defineProperty(todos, 'entry', {
                get() {
                    return { foo: 'bar' };
                },
                configurable: true
            });

            const proxy = target.getReadOnlyProxy(todos);
            const desc = Object.getOwnPropertyDescriptor(proxy, 'entry');
            const { get } = desc;
            expect(() => {
                get().foo = '';
            }).toThrow();
            expect(todos.entry.foo).toEqual('bar');
        });
        it('readonly proxy prevents mutation when value accessed via data descriptor', () => {
            const target = new ReactiveMembrane();
            const todos = {};
            Object.defineProperty(todos, 'entry', {
                value : { foo: 'bar' },
                configurable: true
            });

            const proxy = target.getReadOnlyProxy(todos);
            const desc = Object.getOwnPropertyDescriptor(proxy, 'entry');
            const { value } = desc;
            expect( () => {
                value.foo = '';
            }).toThrow();
            expect(todos.entry.foo).toEqual('bar');
        });
        it('readonly proxy prevents access to any setter in descriptor', () => {
            const target = new ReactiveMembrane();
            const todos = {};
            let value = 0;
            Object.defineProperty(todos, 'entry', {
                get() {
                    return value;
                },
                set(v) {
                    value = v;
                },
                configurable: true
            });
            const proxy = target.getReadOnlyProxy(todos);
            const desc = Object.getOwnPropertyDescriptor(proxy, 'entry');
            const { set, get } = desc;
            expect(() => {
                set.call(proxy, 1);
            }).toThrow();
            expect(get.call(proxy)).toEqual(0);
        });
        it('should preserve the identity of the accessors', () => {
            const target = new ReactiveMembrane();
            const todos = {};
            let value = 0;
            function get() {
                return value;
            }
            function set(v) {
                value = v;
            }
            Object.defineProperty(todos, 'entry', {
                get,
                set,
                configurable: true
            });
            Object.defineProperty(todos, 'newentry', {
                get,
                set,
                configurable: true
            });
            const proxy = target.getReadOnlyProxy(todos);
            const proxyDesc = Object.getOwnPropertyDescriptor(proxy, 'entry');
            const proxyCopiedDesc = Object.getOwnPropertyDescriptor(proxy, 'newentry');
            expect(proxyDesc.get).toEqual(proxyCopiedDesc.get);
            expect(proxyDesc.set).toEqual(proxyCopiedDesc.set);
        });
        it('should be reactive when descriptor is accessed', () => {
            let observedTarget;
            let observedKey;
            const target = new ReactiveMembrane({
                valueObserved(o, key) {
                    observedTarget = o;
                    observedKey = key;
                }
            });
            const todos = {};
            const observable = {};
            Object.defineProperty(todos, 'foo', {
                get() {
                    return observable;
                },
                configurable: true
            });
            const expected = target.getProxy(observable);

            const proxy = target.getProxy(todos);
            expect(proxy.foo).toBe(expected);

            const desc = Object.getOwnPropertyDescriptor(proxy, 'foo');
            expect(observedKey).toBe('foo');
            expect(observedTarget).toBe(todos);
        });
    });
    it('should throw when attempting to change the prototype', function() {
        const target = new ReactiveMembrane();
        const obj = { foo: 'bar' };

        const property = target.getReadOnlyProxy(obj);
        expect(() => {
            Object.setPrototypeOf(property, {});
        }).toThrow();
    });
    it('should throw when attempting to change the prototype of a member property', function() {
        const target = new ReactiveMembrane();
        const obj = { foo: { bar: 'baz' } };

        const property = target.getReadOnlyProxy(obj);
        expect(() => {
            Object.setPrototypeOf(property.foo, {});
        }).toThrow();
    });
    describe('with tag key property', () => {
        it('should support tagPropertyKey', () => {
            const o = {};
            const target = new ReactiveMembrane({
                tagPropertyKey: 'foo',
            });

            const wet = target.getReadOnlyProxy(o);
            expect(Object.getOwnPropertyNames(wet).length).toBe(1);
            expect('foo' in wet).toBe(true);
            expect('foo' in o).toBe(false);
            expect(wet.foo).toBe(undefined);
        });
        it('should not shadow tagPropertyKey if the target has it', () => {
            const o = { foo: 1 };
            const target = new ReactiveMembrane({
                tagPropertyKey: 'foo',
            });

            const wet = target.getReadOnlyProxy(o);
            expect(Object.getOwnPropertyNames(wet).length).toBe(1);
            expect('foo' in wet).toBe(true);
            expect('foo' in o).toBe(true);
            expect(wet.foo).toBe(1);
        });
    });
});
