import { ObservableMembrane } from '../src/main';

function doNothing(_v: any) {
    /* do nothing */
}

describe('ReactiveHandler', () => {
    it('should always return the same proxy', () => {
        const o = { x: 1 };
        const target = new ObservableMembrane();

        const first = target.getProxy(o);
        const second = target.getProxy(o);
        expect(first.x).toBe(second.x);
        expect(first).toBe(second);
    });
    it('should never rewrap a previously produced proxy', () => {
        const o = { x: 1 };
        const target = new ObservableMembrane();
        const first = target.getProxy(o);
        const second = target.getProxy(first);
        expect(first.x).toBe(second.x);
        expect(first).toBe(second);
    });
    it('should rewrap unknown proxy', () => {
        const o = { x: 1 };
        const target = new ObservableMembrane();
        const first = new Proxy(o, {});
        const second = target.getProxy(first);
        expect(first).not.toBe(second);
    });
    it('should handle frozen objects correctly', () => {
        const o = Object.freeze({
            foo: {},
        });
        const target = new ObservableMembrane();
        const property = target.getProxy(o);
        expect(() => {
            doNothing(property.foo);
        }).not.toThrow();
    });
    it('should handle freezing proxy correctly', function () {
        const o = { foo: 'bar' };
        const target = new ObservableMembrane();
        const property = target.getProxy(o);
        expect(() => {
            Object.freeze(property);
        }).not.toThrow();
    });
    it('should maintain equality', function () {
        const target = new ObservableMembrane();

        const a: any = {
            foo: {
                self: null,
            },
        };

        a.foo.self = a;

        const property = target.getProxy(a);
        expect(property.foo.self).toBe(property);
    });
    it('should understand property desc with getter', function () {
        const target = new ObservableMembrane();

        const obj = {
            test: 2,
        };
        const a = {
            hello: 'world',
        };
        Object.defineProperty(obj, 'foo', {
            get: function getter() {
                return a;
            },
            enumerable: true,
        });

        const property = target.getProxy(obj);
        const desc = Object.getOwnPropertyDescriptor(property, 'foo')!;
        expect(target.getProxy(desc.get!())).toBe(property.foo);
    });
    it('should understand property desc with setter', function () {
        const target = new ObservableMembrane();

        const obj = {};
        let value;
        Object.defineProperty(obj, 'foo', {
            set: function setter(val) {
                value = val;
            },
            enumerable: true,
        });

        const property = target.getProxy(obj);
        const desc = Object.getOwnPropertyDescriptor(property, 'foo')!;
        property.foo = 'bar';
        expect(value).toEqual('bar');
        desc.set!('baz');
        expect(value).toEqual('baz');
    });
    it('should understand undefined property desc', function () {
        const target = new ObservableMembrane();
        const obj = {};
        const property = target.getProxy(obj);
        const desc = Object.getOwnPropertyDescriptor(property, 'fake');
        expect(desc).toBeUndefined();
    });
    it('should handle has correctly', function () {
        const target = new ObservableMembrane();
        const obj = {
            foo: 'bar',
        };

        const property = target.getProxy(obj);
        expect('foo' in property);
    });
    it('should delete writable properties correctly', function () {
        const target = new ObservableMembrane();
        const obj = [{ foo: 'bar' }];

        const property = target.getProxy(obj);
        const result = delete property[0];
        expect(!(0 in property));
        expect(result);
    });
    it('should handle extensible correctly when target is extensible', function () {
        const target = new ObservableMembrane();
        const hello = {
            hello: 'world',
        };

        const obj = {
            hello,
        };

        const wrapped = target.getProxy(obj);
        expect(Object.isExtensible(wrapped)).toBe(true);
    });
    it('should handle extensible correctly when target is frozen', function () {
        const target = new ObservableMembrane();
        const obj = {};

        const wrapped = target.getProxy(obj);
        Object.freeze(wrapped);
        expect(Object.isExtensible(wrapped)).toBe(false);
    });
    it('should handle extensible correctly when original target is frozen', function () {
        const target = new ObservableMembrane();
        const obj = Object.freeze({});

        const wrapped = target.getProxy(obj);
        expect(Object.isExtensible(wrapped)).toBe(false);
    });
    it('should handle preventExtensions correctly', function () {
        const target = new ObservableMembrane();
        const obj = {
            foo: 'bar',
        };
        const property = target.getProxy(obj);

        expect(() => {
            Object.preventExtensions(property);
        }).not.toThrow();

        expect(() => {
            property.nextValue = 'newvalue';
        }).toThrow();

        expect(property.foo).toBe('bar');
    });
    it('should handle preventExtensions correctly for frozen Proxy', function () {
        const target = new ObservableMembrane();
        const obj = { foo: 'bar' };
        const property = target.getProxy(obj);

        Object.freeze(property);
        expect(() => {
            Object.preventExtensions(property);
        }).not.toThrow();

        expect(() => {
            property.nextValue = 'newvalue';
        }).toThrow();

        expect(property).toEqual({ foo: 'bar' });
    });
    it('should handle defineProperty correctly', function () {
        const target = new ObservableMembrane();
        const obj = {
            foo: 'bar',
        };

        const property = target.getProxy(obj);
        Object.defineProperty(property, 'hello', {
            value: 'world',
        });
        expect(property.hello).toBe('world');
    });
    it('should assign correct value on original object with defineProperty correctly', function () {
        const target = new ObservableMembrane();
        const other = {};
        const obj: any = {
            foo: 'bar',
            other,
        };

        const reactive = target.getProxy(obj);
        Object.defineProperty(reactive, 'nonreactive', {
            value: reactive.other,
        });
        expect(obj.nonreactive).toBe(obj.other);
    });
    it('should handle defineProperty correctly with undefined non-configurable descriptor', function () {
        const target = new ObservableMembrane();
        const obj = {
            foo: 'bar',
        };

        const property = target.getProxy(obj);
        Object.defineProperty(property, 'hello', {
            value: undefined,
            configurable: false,
        });
        expect(property.hello).toBe(undefined);
    });
    it('should handle defineProperty correctly when descriptor is non-configurable', function () {
        const target = new ObservableMembrane();
        const obj = {
            foo: 'bar',
        };

        const wet = target.getProxy(obj);
        Object.defineProperty(wet, 'hello', {
            value: 'world',
            configurable: false,
        });

        expect(wet.hello).toBe('world');
    });
    it('should not allow deleting non-configurable property', function () {
        const target = new ObservableMembrane();
        const obj = {
            foo: 'bar',
        };

        const wet = target.getProxy(obj);
        Object.defineProperty(wet, 'hello', {
            value: 'world',
            configurable: false,
        });

        expect(() => {
            delete wet.hello;
        }).toThrow();
    });
    it('should not allow re-defining non-configurable property', function () {
        const target = new ObservableMembrane();
        const obj = {
            foo: 'bar',
        };

        const wet = target.getProxy(obj);
        Object.defineProperty(wet, 'hello', {
            value: 'world',
            configurable: false,
        });

        expect(() => {
            Object.defineProperty(wet, 'hello', {
                value: 'world',
                configurable: true,
            });
        }).toThrow();
    });
    it('should handle preventExtensions', function () {
        const target = new ObservableMembrane();
        const obj = {
            nested: {
                foo: 'bar',
            },
        };

        const wet = target.getProxy(obj);
        Object.defineProperty(wet, 'hello', {
            value: 'world',
            configurable: false,
        });

        expect(() => {
            Object.preventExtensions(wet);
        }).not.toThrow();
    });
    it('should handle preventExtensions when original target has non-configurable property', function () {
        const target = new ObservableMembrane();
        const obj = {};
        const nested = {};
        Object.defineProperty(obj, 'foo', {
            value: {
                nested,
            },
            enumerable: true,
            configurable: false,
            writable: false,
        });

        const property = target.getProxy(obj);
        Object.preventExtensions(property);
        expect(property.foo.nested).toBe(target.getProxy(nested));
    });
    it('should not throw an exception when preventExtensions is called on proxy and property is accessed', function () {
        const target = new ObservableMembrane();
        const todos = [
            { text: 'Learn JavaScript' },
            { text: 'Learn Web Components' },
            { text: 'Build something awesome' },
        ];
        const proxy = target.getProxy(todos);
        Object.preventExtensions(proxy);
        expect(() => {
            doNothing(proxy[0]);
        }).not.toThrow();
    });
    it('should not throw an exception when array proxy is frozen and property is accessed', function () {
        const target = new ObservableMembrane();
        const todos = [
            { text: 'Learn JavaScript' },
            { text: 'Learn Web Components' },
            { text: 'Build something awesome' },
        ];
        const proxy = target.getProxy(todos);
        Object.freeze(proxy);
        expect(() => {
            doNothing(proxy[0]);
        }).not.toThrow();
    });

    it('should not throw an exception when object proxy is frozen and property is accessed', function () {
        const target = new ObservableMembrane();
        const todos = {
            first: { text: 'Learn JavaScript' },
        };
        const proxy = target.getProxy(todos);
        Object.freeze(proxy);
        expect(() => {
            doNothing(proxy.first);
        }).not.toThrow();
        expect(proxy.first).toEqual(todos.first);
    });

    it('should not throw an exception when object proxy is frozen and property with undefined value is accessed', function () {
        const target = new ObservableMembrane();
        const todos = {
            first: undefined,
        };
        const proxy = target.getProxy(todos);
        Object.freeze(proxy);
        expect(() => {
            doNothing(proxy.first);
        }).not.toThrow();
        expect(proxy.first).toEqual(todos.first);
    });

    it('should not throw an exception when object proxy is frozen and property with null value is accessed', function () {
        const target = new ObservableMembrane();
        const todos = {
            first: null,
        };
        const proxy = target.getProxy(todos);
        Object.freeze(proxy);
        expect(() => {
            doNothing(proxy.first);
        }).not.toThrow();
        expect(proxy.first).toEqual(todos.first);
    });

    it('should not throw an exception when object proxy is frozen and property with getter is accessed', function () {
        const target = new ObservableMembrane();
        const todos = {};
        Object.defineProperty(todos, 'first', {
            get() {
                return { text: 'Learn JavaScript' };
            },
        });
        const proxy = target.getProxy(todos);
        Object.freeze(proxy);
        expect(() => {
            doNothing(proxy.first);
        }).not.toThrow();
        expect(proxy.first).toEqual({ text: 'Learn JavaScript' });
    });
    it('should not throw when using hasOwnProperty on nested frozen property', function () {
        const target = new ObservableMembrane();
        const obj = { frozen: { foo: { bar: true } } };
        const proxy = target.getProxy(obj);
        Object.freeze(proxy.frozen);
        expect(() => {
            Object.prototype.hasOwnProperty.call(proxy, 'frozen');
            Object.prototype.hasOwnProperty.call(proxy.frozen, 'foo');
        }).not.toThrow();
    });
    it('should not throw when using hasOwnProperty on frozen property', function () {
        const target = new ObservableMembrane();
        const obj = { foo: 'bar' };
        const proxy = target.getProxy(obj);
        Object.defineProperty(proxy, 'foo', {
            value: '',
            configurable: false,
            writable: false,
        });
        expect(() => {
            Object.prototype.hasOwnProperty.call(proxy, 'foo');
        }).not.toThrow();
    });
    it('should handle defineProperty with writable false and undefined value', function () {
        const target = new ObservableMembrane();
        const todos = {};
        Object.defineProperty(todos, 'first', {
            value: 'foo',
            configurable: true,
        });
        const proxy = target.getProxy(todos);
        Object.defineProperty(proxy, 'first', {
            value: undefined,
            writable: false,
        });
        expect(proxy.first).toEqual(undefined);
    });
    it('should handle defineProperty for getter with writable false and no value', function () {
        const target = new ObservableMembrane();
        const todos = {};
        Object.defineProperty(todos, 'first', {
            get() {
                return { text: 'Learn JavaScript' };
            },
            configurable: true,
        });
        const proxy = target.getProxy(todos);
        Object.defineProperty(proxy, 'first', {
            writable: false,
        });
        expect(proxy.first).toEqual(undefined);
    });
    it('should freeze objects correctly when object has symbols', function () {
        const target = new ObservableMembrane();
        const sym = Symbol();
        const symValue = { sym: 'value' };
        const obj = {
            foo: 'bar',
            [sym]: symValue,
        };
        const proxy = target.getProxy(obj);
        Object.freeze(proxy);
        expect(proxy[sym]).toEqual(symValue);
    });
    it('setPrototypeOf should throw', function () {
        const target = new ObservableMembrane();
        const obj = {};
        const property = target.getProxy(obj);

        expect(() => {
            Object.setPrototypeOf(property, {});
        }).toThrow();
    });
    it('should handle Object.getOwnPropertyNames correctly', function () {
        const target = new ObservableMembrane();
        const obj = {
            a: 'b',
        };
        const proxy = target.getProxy(obj);
        expect(Object.getOwnPropertyNames(proxy)).toEqual(['a']);
    });
    it('should handle Object.getOwnPropertyNames when object has symbol', function () {
        const target = new ObservableMembrane();
        const sym = Symbol();
        const obj = {
            a: 'b',
            [sym]: 'symbol',
        };
        const proxy = target.getProxy(obj);
        expect(Object.getOwnPropertyNames(proxy)).toEqual(['a']);
    });
    it('should handle Object.getOwnPropertySymbols when object has symbol', function () {
        const target = new ObservableMembrane();
        const sym = Symbol();
        const obj = {
            [sym]: 'symbol',
        };
        const proxy = target.getProxy(obj);
        expect(Object.getOwnPropertySymbols(proxy)).toEqual([sym]);
    });
    it('should handle Object.getOwnPropertySymbols when object has symbol and key', function () {
        const target = new ObservableMembrane();
        const sym = Symbol();
        const obj = {
            a: 'a',
            [sym]: 'symbol',
        };
        const proxy = target.getProxy(obj);
        expect(Object.getOwnPropertySymbols(proxy)).toEqual([sym]);
    });
    it('should handle Object.keys when object has symbol and key', function () {
        const target = new ObservableMembrane();
        const sym = Symbol();
        const obj = {
            a: 'a',
            [sym]: 'symbol',
        };
        const proxy = target.getProxy(obj);
        expect(Object.keys(proxy)).toEqual(['a']);
    });

    it('should maintain equality', () => {
        const membrane = new ObservableMembrane();

        const obj = {};
        expect(membrane.getProxy(obj)).toBe(membrane.getProxy(obj));
    });

    it('should allow deep mutations', () => {
        const membrane = new ObservableMembrane();

        const obj = membrane.getProxy({});
        expect(() => {
            obj.foo = 'bar';
        }).not.toThrowError();
    });

    it('should notify when changes occur', () => {
        const obj = {
            foo: 'bar',
        };
        const changeSpy = jest.fn();
        const membrane = new ObservableMembrane({
            valueMutated: changeSpy,
        });

        const wet = membrane.getProxy(obj);
        wet.foo = 'changed';
        expect(changeSpy).toHaveBeenCalledTimes(1);
        expect(changeSpy).toHaveBeenCalledWith(obj, 'foo');
    });

    it('should notify when deep changes occur', () => {
        const obj = {
            foo: {
                bar: 'baz',
            },
        };
        const changeSpy = jest.fn();
        const membrane = new ObservableMembrane({
            valueMutated: changeSpy,
        });

        const wet = membrane.getProxy(obj);
        wet.foo.bar = 'changed';
        expect(changeSpy).toHaveBeenCalledTimes(1);
        expect(changeSpy).toHaveBeenCalledWith(obj.foo, 'bar');
    });

    it('should notify when property is accessed', () => {
        const obj = {
            foo: 'bar',
        };
        const accessSpy = jest.fn();
        const membrane = new ObservableMembrane({
            valueObserved: accessSpy,
        });

        const wet = membrane.getProxy(obj);
        doNothing(wet.foo);
        expect(accessSpy).toHaveBeenCalledTimes(1);
        expect(accessSpy).toHaveBeenCalledWith(obj, 'foo');
    });

    it('should notify when deep property is accessed', () => {
        const obj = {
            foo: {
                bar: 'baz',
            },
        };
        const accessSpy = jest.fn();
        const membrane = new ObservableMembrane({
            valueObserved: accessSpy,
        });

        const wet = membrane.getProxy(obj);
        doNothing(wet.foo.bar);
        expect(accessSpy).toHaveBeenCalledTimes(2);
        expect(accessSpy).toHaveBeenLastCalledWith(obj.foo, 'bar');
    });

    describe('issue #20 - getOwnPropertyDescriptor', () => {
        it('should return reactive proxy when property value accessed via accessor descriptor', () => {
            const target = new ObservableMembrane();
            const todos = {};
            const observable = {};
            Object.defineProperty(todos, 'foo', {
                get() {
                    return observable;
                },
                configurable: true,
            });
            const expected = target.getProxy(observable);

            const proxy = target.getProxy(todos);
            expect(proxy.foo).toBe(expected);

            const desc = Object.getOwnPropertyDescriptor(proxy, 'foo');
            const { get } = desc!;
            expect(get!()).toBe(expected);
        });
        it('should return reactive proxy when property value accessed via data descriptor', () => {
            const target = new ObservableMembrane();
            const todos = {};
            const observable = {};
            Object.defineProperty(todos, 'foo', {
                value: observable,
                configurable: true,
            });
            const expected = target.getProxy(observable);

            const proxy = target.getProxy(todos);
            expect(proxy.foo).toBe(expected);

            const desc = Object.getOwnPropertyDescriptor(proxy, 'foo');
            const { value } = desc!;
            expect(value).toBe(expected);
        });
        it('should allow set invocation via descriptor', () => {
            const target = new ObservableMembrane();
            const todos = {};
            let value = 0;
            const newValue = {};
            Object.defineProperty(todos, 'entry', {
                get() {
                    return value;
                },
                set(v) {
                    value = v;
                },
                configurable: true,
            });
            const proxy = target.getProxy(todos);
            const desc = Object.getOwnPropertyDescriptor(proxy, 'entry');
            const { set, get } = desc!;
            set!.call(proxy, newValue);
            expect((todos as any).entry).toEqual(newValue);
            expect(proxy.entry).toEqual(get!.call(proxy));
        });
        it('should preserve the identity of the accessors', () => {
            const target = new ObservableMembrane();
            const todos = {};
            let value = 0;
            function get() {
                return value;
            }
            function set(v: any) {
                value = v;
            }
            Object.defineProperty(todos, 'entry', {
                get,
                set,
                configurable: true,
            });
            const proxy = target.getProxy(todos);
            const proxyDesc = Object.getOwnPropertyDescriptor(proxy, 'entry');
            Object.defineProperty(proxy, 'newentry', proxyDesc!);
            const copiedDesc = Object.getOwnPropertyDescriptor(todos, 'newentry');
            const proxyCopiedDesc = Object.getOwnPropertyDescriptor(proxy, 'newentry');
            expect(copiedDesc!.get).toEqual(get);
            expect(copiedDesc!.set).toEqual(set);
            expect(proxyDesc!.get).toEqual(proxyCopiedDesc!.get);
            expect(proxyDesc!.set).toEqual(proxyCopiedDesc!.set);
        });
        it('should protect against leaking accessors into the blue side', () => {
            const target = new ObservableMembrane();
            const todos: any = {};
            let value = 0;
            let getterThisValue = null;
            let setterThisValue = null;
            function get(this: any) {
                getterThisValue = this;
                return value;
            }
            function set(this: any, v: any) {
                setterThisValue = this;
                value = v;
            }
            const proxy = target.getProxy(todos);
            // installing and interacting with proxy
            Object.defineProperty(proxy, 'entry', {
                get,
                set,
                configurable: true,
            });
            const proxyDesc = Object.getOwnPropertyDescriptor(proxy, 'entry');
            expect(proxyDesc!.get).toEqual(get);
            expect(proxyDesc!.set).toEqual(set);
            expect(proxy.entry).toBe(0);
            expect(getterThisValue).toBe(proxy);
            proxy.entry = 1;
            expect(setterThisValue).toBe(proxy);
            expect(value).toBe(1);
            expect(proxy.entry).toBe(1);
            // interacting with real target
            const desc = Object.getOwnPropertyDescriptor(todos, 'entry');
            expect(desc!.get).not.toEqual(get);
            expect(desc!.set).not.toEqual(set);
            expect(desc!.get).toEqual(Object.getOwnPropertyDescriptor(todos, 'entry')!.get); // identity
            expect(desc!.set).toEqual(Object.getOwnPropertyDescriptor(todos, 'entry')!.set); // identity
            expect((todos as any).entry).toBe(1);
            expect(getterThisValue).toBe(proxy);
            (todos as any).entry = 2;
            expect(setterThisValue).toBe(proxy);
            expect(value).toBe(2);
            expect((todos as any).entry).toBe(2);
        });
        it('should be reactive when descriptor is accessed', () => {
            let observedTarget;
            let observedKey;
            const target = new ObservableMembrane({
                valueObserved(o, key) {
                    observedTarget = o;
                    observedKey = key;
                },
            });
            const todos = {};
            const observable = {};
            Object.defineProperty(todos, 'foo', {
                get() {
                    return observable;
                },
                configurable: true,
            });
            const expected = target.getProxy(observable);

            const proxy = target.getProxy(todos);
            expect(proxy.foo).toBe(expected);

            Object.getOwnPropertyDescriptor(proxy, 'foo');
            expect(observedKey).toBe('foo');
            expect(observedTarget).toBe(todos);
        });
    });

    describe('values that do not need to be wrapped', () => {
        let target: any;
        beforeEach(() => {
            target = new ObservableMembrane();
        });
        it('should not try to make date object reactive', () => {
            const date = new Date();

            const state = target.getProxy({});
            state.date = date;
            expect(state.date).toBe(date);
        });
        it('should not try to object with non-standard prototype reactive', () => {
            const foo = Object.create({});

            const state = target.getProxy({});
            state.foo = foo;
            expect(state.foo).toBe(foo);
        });
        it.each(
            // tslint:disable-next-line:no-empty
            [undefined, null, 'foo', true, false, 1, Symbol(), () => {}]
        )('should not treat following value as reactive: %s', (value) => {
            expect(target.getProxy(value)).toBe(value);
        });
    });

    describe('handles array type values', () => {
        let defaultMembrane: any;
        beforeEach(() => {
            defaultMembrane = new ObservableMembrane();
        });
        it('wraps array', () => {
            const value: any[] = [];
            const proxy = defaultMembrane.getProxy(value);
            expect(proxy).not.toBe(value);
            expect(defaultMembrane.unwrapProxy(value)).toBe(value);
        });
        it('access allow length mutations', () => {
            const value: any[] = [];
            const proxy = defaultMembrane.getProxy(value);
            expect(Array.isArray(proxy)).toBe(true);
            expect(proxy.length).toBe(0);
            proxy.length = 1;
            expect(proxy.length).toBe(1);
            proxy[1] = 'another';
            expect(proxy.length).toBe(2);
            expect(proxy[1]).toBe('another');
        });
        it('access length descriptor', () => {
            const value: any[] = [];
            const proxy = defaultMembrane.getProxy(value);
            expect(Array.isArray(proxy)).toBe(true);
            expect(Object.getOwnPropertyDescriptor(proxy, 'length')!.value).toBe(0);
            proxy.length = 1;
            expect(Object.getOwnPropertyDescriptor(proxy, 'length')!.value).toBe(1);
            proxy[1] = 'another';
            expect(Object.getOwnPropertyDescriptor(proxy, 'length')!.value).toBe(2);
            expect(proxy[1]).toBe('another');
        });
        it('access items in array', () => {
            const value = ['foo', 'bar'];
            const proxy = defaultMembrane.getProxy(value);
            expect(Array.isArray(proxy)).toBe(true);
            expect(proxy.length).toBe(2);
            expect(proxy[0]).toBe('foo');
            expect(proxy[1]).toBe('bar');
        });
        it('should notify when values accessed', () => {
            const value = ['foo', { nested: 'bar' }];
            const accessSpy = jest.fn();
            const observedMembrane = new ObservableMembrane({
                valueObserved: accessSpy,
            });

            const proxy = observedMembrane.getProxy(value);
            doNothing(proxy[0]);
            doNothing(proxy[1]);
            expect(accessSpy).toHaveBeenCalledTimes(2);
            expect(accessSpy).toHaveBeenCalledWith(value, '0');
            expect(accessSpy).toHaveBeenCalledWith(value, '1');
        });

        it('should handle setting length correctly', function () {
            const target = new ObservableMembrane();
            const obj = { foo: ['bar', 'baz'] };
            const property = target.getProxy(obj);

            property.foo.length = 0;

            expect(property.foo).toEqual([]);

            // Explicitly set the length twice, to trigger the code path for unchanged values
            property.foo.length = 0;

            expect(property.foo).toEqual([]);
        });

        it('should handle setting array expando properties', function () {
            const target = new ObservableMembrane();
            const obj = { foo: ['bar', 'baz'] };
            const property = target.getProxy(obj);

            property.foo.expando = 0;

            expect([...property.foo]).toEqual(['bar', 'baz']);
            expect(property.foo.expando).toEqual(0);

            // Explicitly set the expando twice, to trigger the code path for unchanged values
            property.foo.expando = 0;

            expect([...property.foo]).toEqual(['bar', 'baz']);
            expect(property.foo.expando).toEqual(0);
        });

        describe('access values in array', () => {
            let membrane: any;
            let accessSpy: any;
            let changeSpy: any;
            beforeEach(() => {
                accessSpy = jest.fn();
                changeSpy = jest.fn();
                membrane = new ObservableMembrane({
                    valueObserved: accessSpy,
                    valueMutated: changeSpy,
                });
            });
            it('entries() works on wrapped array', () => {
                const value = ['foo', 'bar'];
                const proxy = membrane.getProxy(value);
                const entries = proxy.entries();
                expect(entries.next().value).toEqual([0, 'foo']);
                expect(entries.next().value).toEqual([1, 'bar']);
                expect(entries.next().done).toBe(true);
                // 6 invocations: 1 time for .entries, 3 times for entries.next() and 2 times for actually accessing the index value
                expect(accessSpy).toHaveBeenCalledTimes(6);
                expect(changeSpy).toHaveBeenCalledTimes(0);
            });
            it('concat() does not notify a mutation', () => {
                const value = ['foo', 'bar'];
                const proxy = membrane.getProxy(value);
                const actual = proxy.concat(['baz']);
                expect(accessSpy).toHaveBeenCalledTimes(8);
                expect(actual).toEqual(['foo', 'bar', 'baz']);
                expect(changeSpy).toHaveBeenCalledTimes(0);
            });
            it('indexOf() does not notify a mutation', () => {
                const value = ['foo', 'bar'];
                const proxy = membrane.getProxy(value);
                expect(proxy.indexOf('bar')).toBe(1);
                expect(accessSpy).toHaveBeenCalledTimes(6);
                expect(changeSpy).toHaveBeenCalledTimes(0);
            });
        });
        describe('should be notified on array mutation', () => {
            let membrane: any;
            let changeSpy: any;
            beforeEach(() => {
                changeSpy = jest.fn();
                membrane = new ObservableMembrane({
                    valueMutated: changeSpy,
                });
            });
            it('should notify when value is changed by index', () => {
                const value = ['foo', 'bar'];
                const proxy = membrane.getProxy(value);
                proxy[1] = 'baz';
                expect(proxy[1]).toBe('baz');
                expect(changeSpy).toHaveBeenCalledTimes(1);
                expect(changeSpy).toHaveBeenCalledWith(value, '1');
            });
            it('should notify on pop()', () => {
                const value = ['foo', 'bar'];
                const proxy = membrane.getProxy(value);
                expect(proxy.pop()).toBe('bar');
                expect(changeSpy).toHaveBeenCalledTimes(2);
                expect(changeSpy).toHaveBeenCalledWith(value, 'length');
                expect(changeSpy).toHaveBeenCalledWith(value, '1');
            });
        });
    });
    describe('with tag key property', () => {
        it('should support tagPropertyKey', () => {
            const o = {};
            const target = new ObservableMembrane({
                tagPropertyKey: 'foo',
            });

            const wet = target.getProxy(o);
            expect(Object.getOwnPropertyNames(wet).length).toBe(1);
            expect('foo' in wet).toBe(true);
            expect('foo' in o).toBe(false);
            expect(wet.foo).toBe(undefined);
        });
        it('should not shadow tagPropertyKey if the target has it', () => {
            const o = { foo: 1 };
            const target = new ObservableMembrane({
                tagPropertyKey: 'foo',
            });

            const wet = target.getProxy(o);
            expect(Object.getOwnPropertyNames(wet).length).toBe(1);
            expect('foo' in wet).toBe(true);
            expect('foo' in o).toBe(true);
            expect(wet.foo).toBe(1);
        });
        it('should support frozen target when using tagPropertyKey', () => {
            const o = Object.freeze({});
            const target = new ObservableMembrane({
                tagPropertyKey: 'foo',
            });

            const wet = target.getProxy(o);
            expect(Object.getOwnPropertyNames(wet).length).toBe(1);
            expect('foo' in wet).toBe(true);
            expect('foo' in o).toBe(false);
            expect(wet.foo).toBe(undefined);
        });
        it('should support freezing the proxy when using tagPropertyKey', () => {
            const o = {};
            const target = new ObservableMembrane({
                tagPropertyKey: 'foo',
            });

            const wet = target.getProxy(o);
            Object.freeze(wet);
            expect(Object.getOwnPropertyNames(wet).length).toBe(1);
            expect('foo' in wet).toBe(true);
            expect('foo' in o).toBe(false);
            expect(wet.foo).toBe(undefined);
        });
        it('should return the proper the descriptor for the tag property', () => {
            const o = {};
            const target = new ObservableMembrane({
                tagPropertyKey: 'foo',
            });

            const wet = target.getProxy(o);
            expect(Object.getOwnPropertyDescriptor(wet, 'foo')).toMatchObject({
                value: undefined,
                enumerable: false,
                configurable: false,
                writable: false,
            });
        });
        it('should allow dynamic manipulation of the tag key in original target', () => {
            const o = {};
            const target = new ObservableMembrane({
                tagPropertyKey: '$$MagicKey$$',
            });

            const wet = target.getProxy(o);
            // trying to define a non-configurable property
            Object.defineProperty(wet, '$$MagicKey$$', {
                value: 'bar',
                configurable: true,
            });

            expect('$$MagicKey$$' in wet).toBe(true);
            expect(wet.$$MagicKey$$).toBe(undefined); // because it is non-configurable
            expect(Object.getOwnPropertyNames(wet)).toEqual(['$$MagicKey$$']);
            // making sure that you cannot mess with the magic key
            delete wet.$$MagicKey$$;
            expect('$$MagicKey$$' in wet).toBe(true);
            expect(Object.getOwnPropertyNames(wet)).toEqual(['$$MagicKey$$']);
        });
        it('should allow original target to exhibit the tag key as configurable', () => {
            const dry = {};
            const target = new ObservableMembrane({
                tagPropertyKey: '$$MagicKey$$',
            });

            const wet = target.getProxy(dry);
            Object.defineProperty(dry, '$$MagicKey$$', {
                value: 'bar',
                configurable: true,
            });

            Object.defineProperty(wet, '$$MagicKey$$', {
                value: 'baz',
            });

            expect('$$MagicKey$$' in wet).toBe(true);
            expect(Object.getOwnPropertyNames(wet)).toEqual(['$$MagicKey$$']);
            expect(wet.$$MagicKey$$).toBe('baz'); // because the dry has a configurable property the proxy will propagate the change
            expect((dry as any).$$MagicKey$$).toBe('baz'); // value set on wet propagated to dry

            delete wet.$$MagicKey$$;
            // synthetic tag key will kick in
            expect('$$MagicKey$$' in wet).toBe(true);
            expect(wet.$$MagicKey$$).toBe(undefined);
            expect(Object.getOwnPropertyNames(wet)).toEqual(['$$MagicKey$$']);

            // while dry doesn't have anything
            expect((dry as any).$$MagicKey$$).toBe(undefined);
            expect('$$MagicKey$$' in dry).toBe(false);
            expect(Object.getOwnPropertyNames(dry)).toEqual([]);
        });
        it('should allow original target to exhibit the tag key as non-configurable', () => {
            const dry = {};
            const target = new ObservableMembrane({
                tagPropertyKey: '$$MagicKey$$',
            });

            const wet = target.getProxy(dry);
            Object.defineProperty(dry, '$$MagicKey$$', {
                value: 'bar',
                configurable: false,
            });

            expect(() => {
                // throw because this is strict mode
                Object.defineProperty(wet, '$$MagicKey$$', {
                    value: 'baz',
                });
            }).toThrow();

            expect('$$MagicKey$$' in wet).toBe(true);
            expect(Object.getOwnPropertyNames(wet)).toEqual(['$$MagicKey$$']);
            expect(wet.$$MagicKey$$).toBe('bar'); // because the dry has a non-configurable property the proxy will not propagate the change
            expect((dry as any).$$MagicKey$$).toBe('bar'); // value set on wet propagated to dry

            expect(() => {
                // throw because this is strict mode
                delete wet.$$MagicKey$$;
            }).toThrow();
            // it can't be deleted
            expect('$$MagicKey$$' in wet).toBe(true);
            expect(Object.getOwnPropertyNames(wet)).toEqual(['$$MagicKey$$']);
            expect(wet.$$MagicKey$$).toBe('bar');
            expect((dry as any).$$MagicKey$$).toBe('bar');
        });
    });
    it('should return undefined when input is undefined', () => {
        const target = new ObservableMembrane();
        const state = target.getProxy(undefined);
        expect(state).toBe(undefined);
    });
});
