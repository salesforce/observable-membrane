import {
    isUndefined,
    TargetSlot,
    isObservable,
    ArrayConcat,
    ObjectDefineProperty,
    getOwnPropertyDescriptor,
    getOwnPropertyNames,
    getOwnPropertySymbols,
} from './shared';

import {
    ReactiveMembrane,
    ReactiveMembraneShadowTarget,
    ReactiveMembraneAccessCallback,
} from './reactive-membrane';

function wrapDescriptor(membrane: ReactiveMembrane, descriptor: PropertyDescriptor): PropertyDescriptor {
    if ('value' in descriptor) {
        descriptor.value = isObservable(descriptor.value) ? membrane.getReadOnlyProxy(descriptor.value) : descriptor.value;
    }
    return descriptor;
}

interface ReadOnlyHandlerInit {
    valueObserved?: ReactiveMembraneAccessCallback;
}

export class ReadOnlyHandler {
    
    // TODO: makes these private fields
    originalTarget: any;
    membrane: ReactiveMembrane;
    valueObserved: ReactiveMembraneAccessCallback | undefined;

    constructor(membrane: ReactiveMembrane, value: any, options?: ReadOnlyHandlerInit) {
        this.originalTarget = value;
        this.membrane = membrane;
        if (!isUndefined(options)) {
            this.valueObserved = options.valueObserved;
        }
    }
    get(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey): any {
        const { membrane, originalTarget } = this;
        if (key === TargetSlot) {
            return originalTarget;
        }
        const value = originalTarget[key];
        const { valueObserved } = this;
        if (!isUndefined(valueObserved)) {
            valueObserved(originalTarget, key);
        }
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
        const { originalTarget } = this;
        const { valueObserved } = this;
        if (!isUndefined(valueObserved)) {
            valueObserved(originalTarget, key);
        }
        return key in originalTarget;
    }
    ownKeys(shadowTarget: ReactiveMembraneShadowTarget): string[] {
        const { originalTarget } = this;
        return ArrayConcat.call(getOwnPropertyNames(originalTarget), getOwnPropertySymbols(originalTarget));
    }
    setPrototypeOf(shadowTarget: ReactiveMembraneShadowTarget, prototype: any): any {
        if (process.env.NODE_ENV !== 'production') {
            const { originalTarget } = this;
            throw new Error(`Invalid prototype mutation: Cannot set prototype on "${originalTarget}". "${originalTarget}" prototype is read-only.`);
        }
    }
    getOwnPropertyDescriptor(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey): PropertyDescriptor | undefined {
        const { originalTarget, membrane, valueObserved } = this;

        // keys looked up via hasOwnProperty need to be reactive
        if (!isUndefined(valueObserved)) {
            valueObserved(originalTarget, key);
        }

        let desc = getOwnPropertyDescriptor(originalTarget, key);
        if (isUndefined(desc)) {
            return desc;
        }
        const shadowDescriptor = getOwnPropertyDescriptor(shadowTarget, key);
        if (!desc.configurable && !shadowDescriptor) {
            // If descriptor from original target is not configurable,
            // We must copy the wrapped descriptor over to the shadow target.
            // Otherwise, proxy will throw an invariant error.
            // This is our last chance to lock the value.
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/getOwnPropertyDescriptor#Invariants
            desc = wrapDescriptor(membrane, desc);
            ObjectDefineProperty(shadowTarget, key, desc);
        }
        return shadowDescriptor || desc;
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
