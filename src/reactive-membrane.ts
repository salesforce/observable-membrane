import {
    ObjectDefineProperty,
    unwrap,
    isArray,
    isObject,
    isUndefined,
    getPrototypeOf,
    isFunction,
    hasOwnProperty,
    registerProxy,
    preventExtensions,
    ArrayConcat,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    getOwnPropertyDescriptor,
    isExtensible,
} from './shared';
import { ReactiveProxyHandler } from './reactive-handler';
import { ReadOnlyHandler } from './read-only-handler';
import { init as initDevFormatter } from './reactive-dev-formatter';

if (process.env.NODE_ENV !== 'production') {
    initDevFormatter();
}

interface ReactiveState {
    readOnly: any;
    reactive: any;
    shadowTarget: ReactiveMembraneShadowTarget;
}

export type ReactiveMembraneShadowTarget = object | any[];

export type ReactiveMembraneAccessCallback = (obj: any, key: PropertyKey) => void;
export type ReactiveMembraneMutationCallback = (obj: any, key: PropertyKey) => void;
export type ReactiveMembraneDistortionCallback = (value: any) => any;
export type ReactiveMembraneObservableCallback = (value: any) => boolean;

export interface ObservableMembraneInit {
    valueMutated?: ReactiveMembraneMutationCallback;
    valueObserved?: ReactiveMembraneAccessCallback;
    valueDistortion?: ReactiveMembraneDistortionCallback;
    valueIsObservable?: ReactiveMembraneObservableCallback;
}

export interface MembraneProxyHandler extends ProxyHandler<any> {
    originalTarget: any;
    membrane: ReactiveMembrane;
    wrapValue(v: any): any;
    wrapGetter(get: () => any): () => any;
    wrapSetter(set: (v: any) => void): (v: any) => void;
}

function createShadowTarget(value: any): ReactiveMembraneShadowTarget {
    let shadowTarget: ReactiveMembraneShadowTarget | undefined = undefined;
    if (isArray(value)) {
        shadowTarget = [];
    } else if (isObject(value)) {
        shadowTarget = {};
    }
    return shadowTarget as ReactiveMembraneShadowTarget;
}

const ObjectDotPrototype = Object.prototype;

function defaultValueIsObservable(value: any): boolean {
    // intentionally checking for null
    if (value === null) {
        return false;
    }

    // treat all non-object types, including undefined, as non-observable values
    if (typeof value !== 'object') {
        return false;
    }

    if (isArray(value)) {
        return true;
    }

    const proto = getPrototypeOf(value);
    return (proto === ObjectDotPrototype || proto === null || getPrototypeOf(proto) === null);
}

const defaultValueObserved: ReactiveMembraneAccessCallback = (obj: any, key: PropertyKey) => {
    /* do nothing */
};
const defaultValueMutated: ReactiveMembraneMutationCallback = (obj: any, key: PropertyKey) => {
    /* do nothing */
};
const defaultValueDistortion: ReactiveMembraneDistortionCallback = (value: any) => value;

const reserveGetterMap = new WeakMap<() => any, () => any>();
const reverseSetterMap = new WeakMap<(v: any) => void, (v: any) => void>();

export function wrapDescriptor(handler: MembraneProxyHandler, descriptor: PropertyDescriptor): PropertyDescriptor {
    if (hasOwnProperty.call(descriptor, 'value')) {
        descriptor.value = handler.wrapValue(descriptor.value);
    } else {
        const { set: originalSet, get: originalGet } = descriptor;
        if (!isUndefined(originalGet)) {
            const get = handler.wrapGetter(originalGet);
            reserveGetterMap.set(get, originalGet);
            descriptor.get = get;
        }
        if (!isUndefined(originalSet)) {
            const set = handler.wrapSetter(originalSet);
            reverseSetterMap.set(set, originalSet);
            descriptor.set = set;
        }
    }
    return descriptor;
}

export function unwrapDescriptor(handler: MembraneProxyHandler, descriptor: PropertyDescriptor): PropertyDescriptor {
    if (hasOwnProperty.call(descriptor, 'value')) {
        // dealing with a data descriptor
        descriptor.value = unwrap(descriptor.value);
    } else {
        const { set, get } = descriptor;
        if (!isUndefined(get)) {
            descriptor.get = reserveGetterMap.get(get) || get;
        }
        if (!isUndefined(set)) {
            descriptor.set = reverseSetterMap.get(set) || set;
        }
    }
    return descriptor;
}

export function copyDescriptorIntoShadowTarget(
    handler: MembraneProxyHandler,
    shadowTarget: ReactiveMembraneShadowTarget,
    key: PropertyKey,
) {
    const { originalTarget } = handler;
    // Note: a property might get defined multiple times in the shadowTarget
    //       but it will always be compatible with the previous descriptor
    //       to preserve the object invariants, which makes these lines safe.
    const normalizedDescriptor = getOwnPropertyDescriptor(originalTarget, key);
    if (!isUndefined(normalizedDescriptor)) {
        const blueDesc = wrapDescriptor(handler, normalizedDescriptor);
        ObjectDefineProperty(shadowTarget, key, blueDesc);
    }
}

export function lockShadowTarget(
    handler: MembraneProxyHandler,
    shadowTarget: ReactiveMembraneShadowTarget
): void {
    const { originalTarget } = handler;
    const targetKeys = ArrayConcat.call(getOwnPropertyNames(originalTarget), getOwnPropertySymbols(originalTarget));
    targetKeys.forEach((key: PropertyKey) => {
        copyDescriptorIntoShadowTarget(handler, shadowTarget, key);
    });

    preventExtensions(shadowTarget);
}

export function isExtensibleMembraneTrap(
    this: MembraneProxyHandler,
    shadowTarget: ReactiveMembraneShadowTarget
): boolean {
    const { originalTarget } = this;
    // optimization to avoid attempting to lock down the shadowTarget multiple times
    if (!isExtensible(shadowTarget)) {
        return false; // was already locked down
    }
    if (!isExtensible(originalTarget)) {
        lockShadowTarget(this, shadowTarget);
        return false;
    }
    return true;
}

export function getOwnPropertyDescriptorMembraneTrap(
    this: MembraneProxyHandler,
    shadowTarget: ReactiveMembraneShadowTarget,
    key: PropertyKey
): PropertyDescriptor | undefined {
    const { originalTarget, membrane: { valueObserved } } = this;

    // keys looked up via hasOwnProperty need to be reactive
    valueObserved(originalTarget, key);

    const desc = getOwnPropertyDescriptor(originalTarget, key);
    if (isUndefined(desc)) {
        return desc;
    }

    if (desc.configurable === false) {
        // updating the descriptor to non-configurable on the shadow
        copyDescriptorIntoShadowTarget(this, shadowTarget, key);
    }
    // Note: by accessing the descriptor, the key is marked as observed
    // but access to the value, setter or getter (if available) cannot observe
    // mutations, just like regular methods, in which case we just do nothing.
    return wrapDescriptor(this, desc);
}

export function preventExtensionsMembraneTrap(
    this: MembraneProxyHandler,
    shadowTarget: ReactiveMembraneShadowTarget
): boolean {
    const { originalTarget } = this;
    if (isExtensible(shadowTarget)) {
        preventExtensions(originalTarget);
        // if the originalTarget is a proxy itself, it might reject
        // the preventExtension call, in which case we should not attempt to lock down
        // the shadow target.
        if (isExtensible(originalTarget)) {
            return false;
        }
        lockShadowTarget(this, shadowTarget);
    }
    return true;
}

export function definePropertyMembraneTrap(
    this: MembraneProxyHandler,
    shadowTarget: ReactiveMembraneShadowTarget,
    key: PropertyKey,
    descriptor: PropertyDescriptor
): boolean {
    const { originalTarget, membrane: { valueMutated } } = this;
    // in the future, we could use Reflect.defineProperty to know the result of the operation
    // for now, we assume it was carry on (if originalTarget is a proxy, it could reject the operation)
    ObjectDefineProperty(originalTarget, key, unwrapDescriptor(this, descriptor));
    // intentionally testing against true since it could be undefined as well
    if (descriptor.configurable === false) {
        copyDescriptorIntoShadowTarget(this, shadowTarget, key);
    }
    valueMutated(originalTarget, key);
    return true;
}

export class ReactiveMembrane {
    valueDistortion: ReactiveMembraneDistortionCallback = defaultValueDistortion;
    valueMutated: ReactiveMembraneMutationCallback = defaultValueMutated;
    valueObserved: ReactiveMembraneAccessCallback = defaultValueObserved;
    valueIsObservable: ReactiveMembraneObservableCallback = defaultValueIsObservable;
    private objectGraph: WeakMap<any, ReactiveState> = new WeakMap();

    constructor(options?: ObservableMembraneInit) {
        if (!isUndefined(options)) {
            const { valueDistortion, valueMutated, valueObserved, valueIsObservable } = options;
            this.valueDistortion = isFunction(valueDistortion) ? valueDistortion : defaultValueDistortion;
            this.valueMutated = isFunction(valueMutated) ? valueMutated : defaultValueMutated;
            this.valueObserved = isFunction(valueObserved) ? valueObserved : defaultValueObserved;
            this.valueIsObservable = isFunction(valueIsObservable) ? valueIsObservable : defaultValueIsObservable;
        }
    }

    getProxy(value: any) {
        const unwrappedValue = unwrap(value);
        const distorted = this.valueDistortion(unwrappedValue);
        if (this.valueIsObservable(distorted)) {
            const o = this.getReactiveState(unwrappedValue, distorted);
            // when trying to extract the writable version of a readonly
            // we return the readonly.
            return o.readOnly === value ? value : o.reactive;
        }
        return distorted;
    }

    getReadOnlyProxy(value: any) {
        value = unwrap(value);
        const distorted = this.valueDistortion(value);
        if (this.valueIsObservable(distorted)) {
            return this.getReactiveState(value, distorted).readOnly;
        }
        return distorted;
    }

    unwrapProxy(p: any) {
        return unwrap(p);
    }

    private getReactiveState(value: any, distortedValue: any): ReactiveState {
        const {
            objectGraph,
        } = this;
        let reactiveState = objectGraph.get(distortedValue);
        if (reactiveState) {
            return reactiveState;
        }
        const membrane = this;
        reactiveState = {
            get reactive() {
                const reactiveHandler = new ReactiveProxyHandler(membrane, distortedValue);
                // caching the reactive proxy after the first time it is accessed
                const proxy = new Proxy(createShadowTarget(distortedValue), reactiveHandler);
                registerProxy(proxy, value);
                ObjectDefineProperty(this, 'reactive', { value: proxy });
                return proxy;
            },
            get readOnly() {
                const readOnlyHandler = new ReadOnlyHandler(membrane, distortedValue);
                // caching the readOnly proxy after the first time it is accessed
                const proxy = new Proxy(createShadowTarget(distortedValue), readOnlyHandler);
                registerProxy(proxy, value);
                ObjectDefineProperty(this, 'readOnly', { value: proxy });
                return proxy;
            }
        } as ReactiveState;

        objectGraph.set(distortedValue, reactiveState);
        return reactiveState;
    }

}
