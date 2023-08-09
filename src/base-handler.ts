/*
 * Copyright (c) 2023, Salesforce.com, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
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
    ArrayPush,
    ObjectCreate,
    ProxyPropertyKey,
} from './shared';
import { ObservableMembrane } from './observable-membrane';

export type ShadowTarget = object;

export abstract class BaseProxyHandler {
    originalTarget: any;
    membrane: ObservableMembrane;

    constructor(membrane: ObservableMembrane, value: any) {
        this.originalTarget = value;
        this.membrane = membrane;
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
                descriptor.get = this.wrapGetter(originalGet);
            }
            if (!isUndefined(originalSet)) {
                descriptor.set = this.wrapSetter(originalSet);
            }
        }
        return descriptor;
    }
    copyDescriptorIntoShadowTarget(shadowTarget: ShadowTarget, key: ProxyPropertyKey) {
        const { originalTarget } = this;
        // Note: a property might get defined multiple times in the shadowTarget
        //       but it will always be compatible with the previous descriptor
        //       to preserve the object invariants, which makes these lines safe.
        const originalDescriptor = getOwnPropertyDescriptor(originalTarget, key);
        // TODO: it should be impossible for the originalDescriptor to ever be undefined, this `if` can be removed
        /* istanbul ignore else */
        if (!isUndefined(originalDescriptor)) {
            const wrappedDesc = this.wrapDescriptor(originalDescriptor);
            ObjectDefineProperty(shadowTarget, key, wrappedDesc);
        }
    }
    lockShadowTarget(shadowTarget: ShadowTarget): void {
        const { originalTarget } = this;
        const targetKeys: ProxyPropertyKey[] = ArrayConcat.call(
            getOwnPropertyNames(originalTarget),
            getOwnPropertySymbols(originalTarget),
        );
        targetKeys.forEach((key: ProxyPropertyKey) => {
            this.copyDescriptorIntoShadowTarget(shadowTarget, key);
        });
        const {
            membrane: { tagPropertyKey },
        } = this;
        if (!isUndefined(tagPropertyKey) && !hasOwnProperty.call(shadowTarget, tagPropertyKey)) {
            ObjectDefineProperty(shadowTarget, tagPropertyKey, ObjectCreate(null));
        }
        preventExtensions(shadowTarget);
    }

    // Abstract Traps

    abstract set(shadowTarget: ShadowTarget, key: ProxyPropertyKey, value: any): boolean;
    abstract deleteProperty(shadowTarget: ShadowTarget, key: ProxyPropertyKey): boolean;
    abstract setPrototypeOf(shadowTarget: ShadowTarget, prototype: any): any;
    abstract preventExtensions(shadowTarget: ShadowTarget): boolean;
    abstract defineProperty(
        shadowTarget: ShadowTarget,
        key: ProxyPropertyKey,
        descriptor: PropertyDescriptor,
    ): boolean;

    // Shared Traps

    // TODO: apply() is never called
    /* istanbul ignore next */
    apply(shadowTarget: ShadowTarget, thisArg: any, argArray: any[]) {
        /* No op */
    }
    // TODO: construct() is never called
    /* istanbul ignore next */
    construct(shadowTarget: ShadowTarget, argArray: any, newTarget?: any): any {
        /* No op */
    }
    get(shadowTarget: ShadowTarget, key: ProxyPropertyKey): any {
        const {
            originalTarget,
            membrane: { valueObserved },
        } = this;
        const value = originalTarget[key];
        valueObserved(originalTarget, key);
        return this.wrapValue(value);
    }
    has(shadowTarget: ShadowTarget, key: ProxyPropertyKey): boolean {
        const {
            originalTarget,
            membrane: { tagPropertyKey, valueObserved },
        } = this;
        valueObserved(originalTarget, key);
        // since key is never going to be undefined, and tagPropertyKey might be undefined
        // we can simply compare them as the second part of the condition.
        return key in originalTarget || key === tagPropertyKey;
    }
    ownKeys(shadowTarget: ShadowTarget): ProxyPropertyKey[] {
        const {
            originalTarget,
            membrane: { tagPropertyKey },
        } = this;
        // if the membrane tag key exists and it is not in the original target, we add it to the keys.
        const keys =
            isUndefined(tagPropertyKey) || hasOwnProperty.call(originalTarget, tagPropertyKey)
                ? []
                : [tagPropertyKey];
        // small perf optimization using push instead of concat to avoid creating an extra array
        ArrayPush.apply(keys, getOwnPropertyNames(originalTarget));
        ArrayPush.apply(keys, getOwnPropertySymbols(originalTarget));
        return keys;
    }
    isExtensible(shadowTarget: ShadowTarget): boolean {
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
    getPrototypeOf(shadowTarget: ShadowTarget): object {
        const { originalTarget } = this;
        return getPrototypeOf(originalTarget);
    }
    getOwnPropertyDescriptor(
        shadowTarget: ShadowTarget,
        key: ProxyPropertyKey,
    ): PropertyDescriptor | undefined {
        const {
            originalTarget,
            membrane: { valueObserved, tagPropertyKey },
        } = this;

        // keys looked up via getOwnPropertyDescriptor need to be reactive
        valueObserved(originalTarget, key);

        let desc = getOwnPropertyDescriptor(originalTarget, key);
        if (isUndefined(desc)) {
            if (key !== tagPropertyKey) {
                return undefined;
            }
            // if the key is the membrane tag key, and is not in the original target,
            // we produce a synthetic descriptor and install it on the shadow target
            desc = { value: undefined, writable: false, configurable: false, enumerable: false };
            ObjectDefineProperty(shadowTarget, tagPropertyKey, desc);
            return desc;
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
