import {
    ArrayConcat,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    getPrototypeOf,
    unwrap,
} from './shared';

import {
    ReactiveMembrane,
    ReactiveMembraneShadowTarget,
    getOwnPropertyDescriptorMembraneTrap,
    isExtensibleMembraneTrap,
    MembraneProxyHandler,
} from './reactive-membrane';

const getterMap = new WeakMap<() => any, () => any>();
const setterMap = new WeakMap<(v: any) => void, (v: any) => void>();

export class ReadOnlyHandler implements MembraneProxyHandler {
    originalTarget: any;
    membrane: ReactiveMembrane;

    constructor(membrane: ReactiveMembrane, value: any) {
        this.originalTarget = value;
        this.membrane = membrane;
    }
    wrapValue(value: any): any {
        const { membrane } = this;
        return membrane.valueIsObservable(value) ? membrane.getReadOnlyProxy(value) : value;
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
            if (process.env.NODE_ENV !== 'production') {
                const { originalTarget } = handler;
                throw new Error(`Invalid mutation: Cannot invoke a setter on "${originalTarget}". "${originalTarget}" is read-only.`);
            }
        };
        setterMap.set(originalSet, set);
        return set;
    }
    get(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey): any {
        const { membrane, originalTarget } = this;
        const value = originalTarget[key];
        const { valueObserved } = membrane;
        valueObserved(originalTarget, key);
        return membrane.getReadOnlyProxy(value);
    }
    set(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey, value: any): boolean {
        if (process.env.NODE_ENV !== 'production') {
            const { originalTarget } = this;
            throw new Error(`Invalid mutation: Cannot set "${key.toString()}" on "${originalTarget}". "${originalTarget}" is read-only.`);
        }
        return false;
    }
    deleteProperty(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey): boolean {
        if (process.env.NODE_ENV !== 'production') {
            const { originalTarget } = this;
            throw new Error(`Invalid mutation: Cannot delete "${key.toString()}" on "${originalTarget}". "${originalTarget}" is read-only.`);
        }
        return false;
    }
    apply(shadowTarget: ReactiveMembraneShadowTarget, thisArg: any, argArray: any[]) {
        /* No op */
    }
    construct(target: ReactiveMembraneShadowTarget, argArray: any, newTarget?: any): any {
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
            const { originalTarget } = this;
            throw new Error(`Invalid prototype mutation: Cannot set prototype on "${originalTarget}". "${originalTarget}" prototype is read-only.`);
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
        if (process.env.NODE_ENV !== 'production') {
            const { originalTarget } = this;
            throw new Error(`Invalid mutation: Cannot preventExtensions on ${originalTarget}". "${originalTarget} is read-only.`);
        }
        return false;
    }
    defineProperty(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey, descriptor: PropertyDescriptor): boolean {
        if (process.env.NODE_ENV !== 'production') {
            const { originalTarget } = this;
            throw new Error(`Invalid mutation: Cannot defineProperty "${key.toString()}" on "${originalTarget}". "${originalTarget}" is read-only.`);
        }
        return false;
    }
}
