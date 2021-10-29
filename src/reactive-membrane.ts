import {
    unwrap,
    isArray,
    isUndefined,
    getPrototypeOf,
    isFunction,
    registerProxy,
} from './shared';
import { ReactiveProxyHandler } from './reactive-handler';
import { ReadOnlyHandler } from './read-only-handler';
import { init as initDevFormatter } from './reactive-dev-formatter';

if (process.env.NODE_ENV !== 'production') {
    initDevFormatter();
}

export type ReactiveMembraneAccessCallback = (obj: any, key: PropertyKey) => void;
export type ReactiveMembraneMutationCallback = (obj: any, key: PropertyKey) => void;
export type ReactiveMembraneDistortionCallback = (value: any) => any;
export type ReactiveMembraneObservableCallback = (value: any) => boolean;

export interface ObservableMembraneInit {
    valueMutated?: ReactiveMembraneMutationCallback;
    valueObserved?: ReactiveMembraneAccessCallback;
    valueDistortion?: ReactiveMembraneDistortionCallback;
    valueIsObservable?: ReactiveMembraneObservableCallback;
    tagPropertyKey?: PropertyKey;
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

function createShadowTarget(value: any): any {
    return isArray(value) ? [] : {};
}

export class ReactiveMembrane {
    valueDistortion: ReactiveMembraneDistortionCallback = defaultValueDistortion;
    valueMutated: ReactiveMembraneMutationCallback = defaultValueMutated;
    valueObserved: ReactiveMembraneAccessCallback = defaultValueObserved;
    valueIsObservable: ReactiveMembraneObservableCallback = defaultValueIsObservable;
    tagPropertyKey: PropertyKey | undefined;
    private readOnlyObjectGraph: WeakMap<any, any> = new WeakMap();
    private reactiveObjectGraph: WeakMap<any, any> = new WeakMap();

    constructor(options?: ObservableMembraneInit) {
        if (!isUndefined(options)) {
            const { valueDistortion, valueMutated, valueObserved, valueIsObservable, tagPropertyKey } = options;
            this.valueDistortion = isFunction(valueDistortion) ? valueDistortion : defaultValueDistortion;
            this.valueMutated = isFunction(valueMutated) ? valueMutated : defaultValueMutated;
            this.valueObserved = isFunction(valueObserved) ? valueObserved : defaultValueObserved;
            this.valueIsObservable = isFunction(valueIsObservable) ? valueIsObservable : defaultValueIsObservable;
            this.tagPropertyKey = tagPropertyKey;
        }
    }

    getProxy(value: any) {
        const unwrappedValue = unwrap(value);
        const distorted = this.valueDistortion(unwrappedValue);
        if (this.valueIsObservable(distorted)) {
            const readOnly = this.getReactiveHandler(unwrappedValue, distorted, true);
            // when trying to extract the writable version of a readonly
            // we return the readonly.
            return readOnly === value ? value : this.getReactiveHandler(unwrappedValue, distorted, false);
        }
        return distorted;
    }

    getReadOnlyProxy(value: any) {
        value = unwrap(value);
        const distorted = this.valueDistortion(value);
        if (this.valueIsObservable(distorted)) {
            return this.getReactiveHandler(value, distorted, true);
        }
        return distorted;
    }

    unwrapProxy(p: any) {
        return unwrap(p);
    }

    private getReactiveHandler(value: any, distortedValue: any, readOnly: boolean): any {
        const objectGraph = readOnly ? this.readOnlyObjectGraph : this.reactiveObjectGraph
        let proxy = objectGraph.get(distortedValue);
        if (isUndefined(proxy)) {
            // caching the proxy after the first time it is accessed
            const handler = readOnly
                ? new ReadOnlyHandler(this, distortedValue)
                : new ReactiveProxyHandler(this, distortedValue);
            proxy = new Proxy(createShadowTarget(distortedValue), handler);
            registerProxy(proxy, value);
            objectGraph.set(distortedValue, proxy);
        }
        return proxy
    }
}
