import {
    unwrap,
    isArray,
    isUndefined,
    getPrototypeOf,
    isFunction,
    registerProxy,
    ProxyPropertyKey,
} from './shared';
import { ReactiveProxyHandler } from './reactive-handler';
import { ReadOnlyHandler } from './read-only-handler';
import { init as initDevFormatter } from './reactive-dev-formatter';

/* istanbul ignore else */
if (process.env.NODE_ENV !== 'production') {
    initDevFormatter();
}

export type ReactiveMembraneAccessCallback = (obj: any, key: ProxyPropertyKey) => void;
export type ReactiveMembraneMutationCallback = (obj: any, key: ProxyPropertyKey) => void;
export type ReactiveMembraneObservableCallback = (value: any) => boolean;

export interface ObservableMembraneInit {
    valueMutated?: ReactiveMembraneMutationCallback;
    valueObserved?: ReactiveMembraneAccessCallback;
    valueIsObservable?: ReactiveMembraneObservableCallback;
    tagPropertyKey?: ProxyPropertyKey;
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
    return proto === ObjectDotPrototype || proto === null || getPrototypeOf(proto) === null;
}

const defaultValueObserved: ReactiveMembraneAccessCallback = (obj: any, key: ProxyPropertyKey) => {
    /* do nothing */
};
const defaultValueMutated: ReactiveMembraneMutationCallback = (obj: any, key: ProxyPropertyKey) => {
    /* do nothing */
};

function createShadowTarget(value: any): any {
    return isArray(value) ? [] : {};
}

export class ReactiveMembrane {
    valueMutated: ReactiveMembraneMutationCallback;
    valueObserved: ReactiveMembraneAccessCallback;
    valueIsObservable: ReactiveMembraneObservableCallback;
    tagPropertyKey: ProxyPropertyKey | undefined;

    private readOnlyObjectGraph: WeakMap<any, any> = new WeakMap();
    private reactiveObjectGraph: WeakMap<any, any> = new WeakMap();

    constructor(options: ObservableMembraneInit = {}) {
        const { valueMutated, valueObserved, valueIsObservable, tagPropertyKey } = options;
        this.valueMutated = isFunction(valueMutated) ? valueMutated : defaultValueMutated;
        this.valueObserved = isFunction(valueObserved) ? valueObserved : defaultValueObserved;
        this.valueIsObservable = isFunction(valueIsObservable)
            ? valueIsObservable
            : defaultValueIsObservable;
        this.tagPropertyKey = tagPropertyKey;
    }

    getProxy(value: any) {
        const unwrappedValue = unwrap(value);
        if (this.valueIsObservable(unwrappedValue)) {
            // When trying to extract the writable version of a readonly we return the readonly.
            if (this.readOnlyObjectGraph.get(unwrappedValue) === value) {
                return value;
            }
            return this.getReactiveHandler(unwrappedValue);
        }
        return unwrappedValue;
    }

    getReadOnlyProxy(value: any) {
        value = unwrap(value);
        if (this.valueIsObservable(value)) {
            return this.getReadOnlyHandler(value);
        }
        return value;
    }

    unwrapProxy(p: any) {
        return unwrap(p);
    }

    private getReactiveHandler(value: any): any {
        let proxy = this.reactiveObjectGraph.get(value);
        if (isUndefined(proxy)) {
            // caching the proxy after the first time it is accessed
            const handler = new ReactiveProxyHandler(this, value);
            proxy = new Proxy(createShadowTarget(value), handler);
            registerProxy(proxy, value);
            this.reactiveObjectGraph.set(value, proxy);
        }
        return proxy;
    }

    private getReadOnlyHandler(value: any): any {
        let proxy = this.readOnlyObjectGraph.get(value);
        if (isUndefined(proxy)) {
            // caching the proxy after the first time it is accessed
            const handler = new ReadOnlyHandler(this, value);
            proxy = new Proxy(createShadowTarget(value), handler);
            registerProxy(proxy, value);
            this.readOnlyObjectGraph.set(value, proxy);
        }
        return proxy;
    }
}
