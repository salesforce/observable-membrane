import {
    ObjectDefineProperty,
    unwrap,
    isArray,
    isObject,
    isUndefined,
    getPrototypeOf,
    isFunction,
    hasOwnProperty,
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
export type ReactiveMembraneDistortionCallback = (value: any, obj: any, key: PropertyKey) => any;
export type ReactiveMembraneObservableCallback = (value: any, obj: any, key: PropertyKey) => boolean;

export interface ObservableMembraneInit {
    valueMutated?: ReactiveMembraneMutationCallback;
    valueObserved?: ReactiveMembraneAccessCallback;
    valueDistortion?: ReactiveMembraneDistortionCallback;
    valueIsObservable?: ReactiveMembraneObservableCallback;
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
    // intentionally checking for null and undefined
    if (value == null) {
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

export function wrapDescriptor(membrane: ReactiveMembrane, descriptor: PropertyDescriptor, obj: any, key: PropertyKey, getValue: (membrane: ReactiveMembrane, originalValue: any, o: any, k: PropertyKey) => any): PropertyDescriptor {
    const { set, get } = descriptor;
    if (hasOwnProperty.call(descriptor, 'value')) {
        descriptor.value = getValue(membrane, descriptor.value, obj, key);
    } else {
        if (!isUndefined(get)) {
            descriptor.get = function() {
                const v = unwrap(this);
                // invoking the original getter with the original target
                return getValue(membrane, get.call(v), v, key);
            };
        }
        if (!isUndefined(set)) {
            descriptor.set = function(value) {
                // At this point we don't have a clear indication of whether
                // or not a valid mutation will occur, we don't have the key,
                // and we are not sure why and how they are invoking this setter.
                // Nevertheless we preserve the original semantics by invoking the
                // original setter with the original target and the unwrapped value
                set.call(unwrap(this), membrane.unwrapProxy(value));
            };
        }
    }
    return descriptor;
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

    getProxy(value: any, obj: any, key: PropertyKey) {
        const distorted = this.valueDistortion(value, obj, key);
        if (this.valueIsObservable(distorted, obj, key)) {
            const o = this.getReactiveState(distorted);
            // when trying to extract the writable version of a readonly
            // we return the readonly.
            return o.readOnly === value ? value : o.reactive;
        }
        return distorted;
    }

    getReadOnlyProxy(value: any, obj: any, key: PropertyKey) {
        const distorted = this.valueDistortion(value, obj, key);
        if (this.valueIsObservable(distorted, obj, key)) {
            return this.getReactiveState(distorted).readOnly;
        }
        return distorted;
    }

    unwrapProxy(p: any) {
        return unwrap(p);
    }

    private getReactiveState(value: any): ReactiveState {
        const {
            objectGraph,
        } = this;
        value = unwrap(value);
        let reactiveState = objectGraph.get(value);
        if (reactiveState) {
            return reactiveState;
        }
        const membrane = this;
        reactiveState = {
            get reactive() {
                const reactiveHandler = new ReactiveProxyHandler(membrane, value);
                // caching the reactive proxy after the first time it is accessed
                const proxy = new Proxy(createShadowTarget(value), reactiveHandler);
                ObjectDefineProperty(this, 'reactive', { value: proxy });
                return proxy;
            },
            get readOnly() {
                const readOnlyHandler = new ReadOnlyHandler(membrane, value);
                // caching the readOnly proxy after the first time it is accessed
                const proxy = new Proxy(createShadowTarget(value), readOnlyHandler);
                ObjectDefineProperty(this, 'readOnly', { value: proxy });
                return proxy;
            }
        } as ReactiveState;

        objectGraph.set(value, reactiveState);
        return reactiveState;
    }

}
