import {
    toString,
    ArrayConcat,
    isArray,
    getPrototypeOf,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    unwrap,
} from './shared';

import {
    ReactiveMembrane,
    ReactiveMembraneShadowTarget,
    isExtensibleMembraneTrap,
    getOwnPropertyDescriptorMembraneTrap,
    definePropertyMembraneTrap,
    preventExtensionsMembraneTrap,
    MembraneProxyHandler,
} from './reactive-membrane';

const getterMap = new WeakMap<() => any, () => any>();
const setterMap = new WeakMap<(v: any) => void, (v: any) => void>();

export class ReactiveProxyHandler implements MembraneProxyHandler {
    originalTarget: any;
    membrane: ReactiveMembrane;

    constructor(membrane: ReactiveMembrane, value: any) {
        this.originalTarget = value;
        this.membrane = membrane;
    }
    wrapValue(value: any): any {
        const { membrane } = this;
        return membrane.valueIsObservable(value) ? membrane.getProxy(value) : value;
    }
    wrapGetter(originalGet: () => any): () => any {
        if (getterMap.has(originalGet)) {
            return getterMap.get(originalGet) as () => any;
        }
        const handler = this;
        function get(this: any): any {
            // invoking the original getter with the original target
            return handler.wrapValue(originalGet.call(unwrap(this)));
        };
        getterMap.set(originalGet, get);
        return get;
    }
    wrapSetter(originalSet: (v: any) => void): (v: any) => void {
        if (setterMap.has(originalSet)) {
            return setterMap.get(originalSet) as (v: any) => void;
        }
        const handler = this;
        function set(this: any, v: any) {
            // invoking the original setter with the original target
            handler.wrapValue(originalSet.call(unwrap(this), v));
        };
        setterMap.set(originalSet, set);
        return set;
    }
    get(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey): any {
        const { originalTarget, membrane } = this;
        const value = originalTarget[key];
        const { valueObserved } = membrane;
        valueObserved(originalTarget, key);
        return membrane.getProxy(value);
    }
    set(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey, value: any): boolean {
        const { originalTarget, membrane: { valueMutated } } = this;
        const oldValue = originalTarget[key];
        if (oldValue !== value) {
            originalTarget[key] = value;
            valueMutated(originalTarget, key);
        } else if (key === 'length' && isArray(originalTarget)) {
            // fix for issue #236: push will add the new index, and by the time length
            // is updated, the internal length is already equal to the new length value
            // therefore, the oldValue is equal to the value. This is the forking logic
            // to support this use case.
            valueMutated(originalTarget, key);
        }
        return true;
    }
    deleteProperty(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey): boolean {
        const { originalTarget, membrane: { valueMutated } } = this;
        delete originalTarget[key];
        valueMutated(originalTarget, key);
        return true;
    }
    apply(shadowTarget: ReactiveMembraneShadowTarget, thisArg: any, argArray: any[]) {
        /* No op */
    }
    construct(shadowTarget: ReactiveMembraneShadowTarget, argArray: any, newTarget?: any): any {
        /* No op */
    }
    has(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey): boolean {
        const { originalTarget, membrane: { valueObserved } } = this;
        valueObserved(originalTarget, key);
        return key in originalTarget;
    }
    ownKeys(shadowTarget: ReactiveMembraneShadowTarget): string[] {
        const { originalTarget } = this;
        return ArrayConcat.call(getOwnPropertyNames(originalTarget), getOwnPropertySymbols(originalTarget));
    }
    isExtensible(shadowTarget: ReactiveMembraneShadowTarget): boolean {
        return isExtensibleMembraneTrap.call(this, shadowTarget);
    }
    setPrototypeOf(shadowTarget: ReactiveMembraneShadowTarget, prototype: any): any {
        if (process.env.NODE_ENV !== 'production') {
            throw new Error(`Invalid setPrototypeOf invocation for reactive proxy ${toString(this.originalTarget)}. Prototype of reactive objects cannot be changed.`);
        }
    }
    getPrototypeOf(shadowTarget: ReactiveMembraneShadowTarget): object {
        const { originalTarget } = this;
        return getPrototypeOf(originalTarget);
    }
    getOwnPropertyDescriptor(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey): PropertyDescriptor | undefined {
        return getOwnPropertyDescriptorMembraneTrap.call(this, shadowTarget, key);
    }
    preventExtensions(shadowTarget: ReactiveMembraneShadowTarget): boolean {
        return preventExtensionsMembraneTrap.call(this, shadowTarget);
    }
    defineProperty(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey, descriptor: PropertyDescriptor): boolean {
        return definePropertyMembraneTrap.call(this, shadowTarget, key, descriptor);
    }
}
