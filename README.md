# Observable Membrane

This package implements an observable membrane in JavaScript using Proxies.

A membrane can be created to control access to a module graph, observe what the other part is attempting to do with the objects that were handed over to them, and even distort the way they see the module graph.

## What is a Membrane

* [Tom van Cutsem's original article, "Membranes in JavaScript"](https://tvcutsem.github.io/js-membranes)
* [es-membrane library](https://github.com/ajvincent/es-membrane)

## Use Cases

One of the prime use-cases for observable membranes is the popular `@observed` or `@tracked` decorator used in components to detect mutations on the state of the component to re-render the component when needed. In this case, any object value set into a decorated field can be wrapped into an observable membrane to monitor if the object is accessed during the rendering phase, and if so, the component must be re-rendered when mutations on the object value are detected. And this process is applied not only at the object value level, but at any level in the object graph accessible via the observed object value.

Additionally, it supports distorting objects within an object graph, which could be used for:

* Avoid leaking symbols and other non-observables objects.
* Distorting values observed through the membrane.

### API

This package exposes a constructor called `ObservableMembrane` as the default export. This constructor expects an optional configuration object that can contain three callbacks, `valueObserved`, `valueMutated`, and `valueDistortion`. It returns a new membrane instance that contains three methods, `getProxy()`, `getReadOnlyProxy()`, and `unwrapProxy()`. 

```ts
interface ObservableMembraneInit {
    valueMutated?: (obj: any, key: PropertyKey) => void;
    valueObserved?: (obj: any, key: PropertyKey) => void;
    valueDistortion?: (value: any) => any;
}
class ObservableMembrane {
    constructor(options?: ObservableMembraneInit);
    getProxy(o: object): proxy;
    getReadOnlyProxy(o: object): proxy;
    unwrapProxy(p: proxy): object;
}
```

### Usage

The following example illustrates how to create an observable membrane, and proxies:

```js
import ObservableMembrane from 'observable-membrane';

const membrane = new ObservableMembrane();

const o = {
    x: 2,
    y: {
        z: 1
    },
};

const p = membrane.getProxy(o);

p.x;
// yields 2

p.y.z;
// yields 1
```

_Note: If the value that you're accessing via the membrane is an object that can be observed then the membrane will return a new proxy. In the example above, `o.y !== p.y` because it is a proxy that applies the exact same mechanism. In other words, the membrane is applicable to an entire object graph._

#### Observing Access and Mutations

The most basic operation in an observable membrane is to observe property member access and mutations. For that, the constructor accepts an optional arguments `options` that accepts two callbacks, `valueObserved` and `valueMutated`:

```js
import ObservableMembrane from 'observable-membrane';

const membrane = new ObservableMembrane({
    valueObserved(target, key) {
        // where target is the object that was accessed
        // and key is the key that was read
        console.log('accessed ', key);
    },
    valueMutated(target, key) {
        // where target is the object that was mutated
        // and key is the key that was mutated
        console.log('mutated ', key);
    },
});

const o = {
    x: 2,
    y: {
        z: 1
    },
};

const p = membrane.getProxy(o);

p.x;
// console output -> 'accessed x'
// yields 2

p.y.z;
// console output -> 'accessed z'
// yields 1

p.y.z = 3;
// console output -> 'mutated z'
// yields 3
```

#### Read Only Proxies

Another use-case for observable membranes is to prevent mutations in the object graph. For that, `ObservableMembrane` provides an additional method that gets a read-only version of any object value. One of the prime use-cases for read-only membranes is to hand over an object to another actor, observe how the actor uses that object reference, but prevent the actor from mutating the object. E.g.: passing an object property down to a child component that can consume the object value but not mutate it.

This is also a very cheap way of doing deep-freeze, although it is not exactly the same, but can cover a lot of ground without having to actually freeze the original object, or a copy of it:


```js
import ObservableMembrane from 'observable-membrane';

const membrane = new ObservableMembrane({
    valueObserved(target, key) {
        // where target is the object that was accessed
        // and key is the key that was read
        console.log('accessed ', key);
    },
    valueMutated(target, key) {
        // where target is the object that was mutated
        // and key is the key that was mutated
        console.log('mutated ', key);
    },
});

const o = {
    x: 2,
    y: {
        z: 1
    },
};

const r = membrane.getReadOnlyProxy(o);

r.x;
// yields 2

r.y.z;
// yields 1

r.y.z = 2;
// throws Error in dev-mode, and does nothing in production mode
```

#### Distortion

As described above, you can use distortions to avoid leaking non-observable objects and distorting values observed through the membrane:

```js
import ObservableMembrane from 'observable-membrane';

const membrane = new ObservableMembrane({
    valueDistortion(value) {
        if (value instanceof Node) {
            throw new ReferenceError(`Invalid access to a non-observable Node`);
        }
        console.log('distorting ', value);
        if (value === 1) {
            return 10;
        }
        return value;
    },
});

const o = {
    x: 2,
    y: {
        z: 1,
        node: document.createElement('p'),
    },
};

const p = membrane.getProxy(o);

p.x;
// console output -> 'distorting 2'
// yields 2

p.y.z;
// console output -> 'distorting 1'
// yields 10

p.y.node;
// throws ReferenceError
```

_Note: You could use a `WeakMap` to remap symbols to avoid leaking the original symbols and other non-observable objects through the distortion mechanism._

#### Unwrapping Proxies

For advanced usages, the observable membrane instance offers the ability to unwrap any proxy generated by the membrane. This can be used to detect membrane presence and other detections that may be useful to framework authors. E.g.:

```js
import ObservableMembrane from 'observable-membrane';

const membrane = new ObservableMembrane();

const o = {
    x: 2,
    y: {
        z: 1,
    },
};

const p = membrane.getProxy(o);

o.y !== p.x;
// yields true because `p` is a proxy of `o`

o.y === membrane.unwrapProxy(p.y);
// yields true because `membrane.unwrapProxy(p.y)` returns the original target `o.y`
```

## Browser Compatibility

Observable membranes requires Proxy (ECMAScript 6) [to be available](https://caniuse.com/#search=proxy).

## Development State

This library is production ready, it has been used at Salesforce in production for over a year. It is very lightweight (~1k - minified and gzipped), that can be used with any framework or library. It is designed to be very performant.

## Contribution

Please make sure to read the [Contributing Guide](CONTRIBUTING.md) before making a pull request.

## License

[MIT](http://opensource.org/licenses/MIT)

Copyright (C) 2017 salesforce.com, Inc.
