import {
    ObjectCreate,
    ObjectDefineProperties,
    ObjectDefineProperty,
    unwrap,
    isArray,
    isObservable,
    isObject,
    isUndefined,
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

interface ObservableMembraneInit {
    valueMutated?: ReactiveMembraneMutationCallback;
    valueObserved?: ReactiveMembraneAccessCallback;
    valueDistortion?: ReactiveMembraneDistortionCallback;
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

export class ReactiveMembrane {

    // TODO: make these private fields
    valueDistortion: ReactiveMembraneDistortionCallback | undefined;
    valueMutated: ReactiveMembraneMutationCallback | undefined;
    valueObserved: ReactiveMembraneAccessCallback | undefined;
    objectGraph: WeakMap<any, ReactiveState> = new WeakMap();

    constructor(options?: ObservableMembraneInit) {
        if (!isUndefined(options)) {
            this.valueDistortion = options.valueDistortion;
            this.valueMutated = options.valueMutated;
            this.valueObserved = options.valueObserved;
        }
    }

    getProxy(value: any) {
        const { valueDistortion } = this;
        const distorted = isUndefined(valueDistortion) ? value : valueDistortion(value);
        if (isObservable(distorted)) {
            const o = this._getReactiveState(distorted);
            // when trying to extract the writable version of a readonly
            // we return the readonly.
            return o.readOnly === value ? value : o.reactive;
        }
        return distorted;
    }

    getReadOnlyProxy(value: any) {
        const { valueDistortion } = this;
        const distorted = isUndefined(valueDistortion) ? value : valueDistortion(value);
        if (isObservable(distorted)) {
            return this._getReactiveState(distorted).readOnly;
        }
        return distorted;
    }

    unwrapProxy(p: any) {
        return unwrap(p);
    }

    // TODO: make these private methods
    _getReactiveState(value: any): ReactiveState {
        const membrane = this;
        const {
            objectGraph,
            valueMutated,
            valueObserved,
        } = membrane;
        value = unwrap(value);
        let reactiveState = objectGraph.get(value);
        if (reactiveState) {
            return reactiveState;
        }

        reactiveState = ObjectDefineProperties(ObjectCreate(null), {
            reactive: {
                get(this: ReactiveState) {
                    const reactiveHandler = new ReactiveProxyHandler(membrane, value, {
                        valueMutated,
                        valueObserved,
                    });
                    // caching the reactive proxy after the first time it is accessed
                    const proxy = new Proxy(createShadowTarget(value), reactiveHandler);
                    ObjectDefineProperty(this, 'reactive', { value: proxy });
                    return proxy;
                },
                configurable: true,
            },
            readOnly: {
                get(this: ReactiveState) {
                    const readOnlyHandler = new ReadOnlyHandler(membrane, value, {
                        valueObserved,
                    });
                    // caching the readOnly proxy after the first time it is accessed
                    const proxy = new Proxy(createShadowTarget(value), readOnlyHandler);
                    ObjectDefineProperty(this, 'readOnly', { value: proxy });
                    return proxy;
                },
                configurable: true,
            }
        }) as ReactiveState;

        objectGraph.set(value, reactiveState);
        return reactiveState;
    }

}
