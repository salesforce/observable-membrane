import {
    ArrayConcat,
    getPrototypeOf,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    getOwnPropertyDescriptor,
    isUndefined,
    isExtensible,
    hasOwnProperty,
    ObjectDefineProperty,
    preventExtensions,
    isArray,
    freeze,
} from './shared';
import { ReactiveMembrane } from './reactive-membrane';

export type ReactiveMembraneShadowTarget = object;

export function createShadowTarget(value: any): ReactiveMembraneShadowTarget {
    return isArray(value) ? [] : {};
}

export abstract class BaseProxyHandler {
    originalTarget: any;
    membrane: ReactiveMembrane;

    constructor(membrane: ReactiveMembrane, value: any) {
        this.originalTarget = value;
        this.membrane = membrane;
        // future proxy optimizations
        freeze(this);
    }

    // Abstract utility methods

    abstract wrapValue(value: any): any;
    abstract wrapGetter(originalGet: () => any): () => any;
    abstract wrapSetter(originalSet: (v: any) => void): (v: any) => void;

    // Shared utility methods

    wrapDescriptor(descriptor: PropertyDescriptor): PropertyDescriptor {
        if (hasOwnProperty.call(descriptor, 'value')) {
            descriptor.value = this.wrapValue(descriptor.value);
        } else {
            const { set: originalSet, get: originalGet } = descriptor;
            if (!isUndefined(originalGet)) {
                descriptor.get = this.wrapGetter(originalGet);;
            }
            if (!isUndefined(originalSet)) {
                descriptor.set = this.wrapSetter(originalSet);
            }
        }
        return descriptor;
    }
    copyDescriptorIntoShadowTarget(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey) {
        const { originalTarget } = this;
        // Note: a property might get defined multiple times in the shadowTarget
        //       but it will always be compatible with the previous descriptor
        //       to preserve the object invariants, which makes these lines safe.
        const originalDescriptor = getOwnPropertyDescriptor(originalTarget, key);
        if (!isUndefined(originalDescriptor)) {
            const wrappedDesc = this.wrapDescriptor(originalDescriptor);
            ObjectDefineProperty(shadowTarget, key, wrappedDesc);
        }
    }
    lockShadowTarget(shadowTarget: ReactiveMembraneShadowTarget): void {
        const { originalTarget } = this;
        const targetKeys = ArrayConcat.call(getOwnPropertyNames(originalTarget), getOwnPropertySymbols(originalTarget));
        targetKeys.forEach((key: PropertyKey) => {
            this.copyDescriptorIntoShadowTarget(shadowTarget, key);
        });
        preventExtensions(shadowTarget);
    }

    // Abstract Traps

    abstract set(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey, value: any): boolean;
    abstract deleteProperty(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey): boolean;
    abstract setPrototypeOf(shadowTarget: ReactiveMembraneShadowTarget, prototype: any): any;
    abstract preventExtensions(shadowTarget: ReactiveMembraneShadowTarget): boolean;
    abstract defineProperty(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey, descriptor: PropertyDescriptor): boolean;

    // Shared Traps

    apply(shadowTarget: ReactiveMembraneShadowTarget, thisArg: any, argArray: any[]) {
        /* No op */
    }
    construct(shadowTarget: ReactiveMembraneShadowTarget, argArray: any, newTarget?: any): any {
        /* No op */
    }
    get(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey): any {
        const { originalTarget, membrane: { valueObserved } } = this;
        const value = originalTarget[key];
        valueObserved(originalTarget, key);
        return this.wrapValue(value);
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
        const { originalTarget } = this;
        // optimization to avoid attempting to lock down the shadowTarget multiple times
        if (!isExtensible(shadowTarget)) {
            return false; // was already locked down
        }
        if (!isExtensible(originalTarget)) {
            this.lockShadowTarget(shadowTarget);
            return false;
        }
        return true;
    }
    getPrototypeOf(shadowTarget: ReactiveMembraneShadowTarget): object {
        const { originalTarget } = this;
        return getPrototypeOf(originalTarget);
    }
    getOwnPropertyDescriptor(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey): PropertyDescriptor | undefined {
        const { originalTarget, membrane: { valueObserved } } = this;

        // keys looked up via getOwnPropertyDescriptor need to be reactive
        valueObserved(originalTarget, key);

        const desc = getOwnPropertyDescriptor(originalTarget, key);
        if (isUndefined(desc)) {
            return undefined;
        }

        if (desc.configurable === false) {
            // updating the descriptor to non-configurable on the shadow
            this.copyDescriptorIntoShadowTarget(shadowTarget, key);
        }
        // Note: by accessing the descriptor, the key is marked as observed
        // but access to the value, setter or getter (if available) cannot observe
        // mutations, just like regular methods, in which case we just do nothing.
        return this.wrapDescriptor(desc);
    }
}

// future proxy optimizations
freeze(BaseProxyHandler.prototype);
