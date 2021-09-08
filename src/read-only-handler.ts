import {unwrap, isArray, isUndefined, ProxyPropertyKey} from './shared';
import { BaseProxyHandler, ReactiveMembraneShadowTarget } from './base-handler';

const getterMap = new WeakMap<() => any, () => any>();
const setterMap = new WeakMap<(v: any) => void, (v: any) => void>();

export class ReadOnlyHandler extends BaseProxyHandler {
    wrapValue(value: any): any {
        return this.membrane.getReadOnlyProxy(value);
    }
    wrapGetter(originalGet: () => any): () => any {
        const wrappedGetter = getterMap.get(originalGet);
        if (!isUndefined(wrappedGetter)) {
            return wrappedGetter;
        }
        const handler = this;
        const get = function (this: any): any {
            // invoking the original getter with the original target
            return handler.wrapValue(originalGet.call(unwrap(this)));
        };
        getterMap.set(originalGet, get);
        return get;
    }
    wrapSetter(originalSet: (v: any) => void): (v: any) => void {
        const wrappedSetter = setterMap.get(originalSet);
        if (!isUndefined(wrappedSetter)) {
            return wrappedSetter;
        }
        const handler = this;
        const set = function (this: any, v: any) {
            if (process.env.NODE_ENV !== 'production') {
                const { originalTarget } = handler;
                throw new Error(`Invalid mutation: Cannot invoke a setter on "${originalTarget}". "${originalTarget}" is read-only.`);
            }
        };
        setterMap.set(originalSet, set);
        return set;
    }
    set(shadowTarget: ReactiveMembraneShadowTarget, key: ProxyPropertyKey, value: any): boolean {
        if (process.env.NODE_ENV !== 'production') {
            const { originalTarget } = this;
            const msg = isArray(originalTarget) ?
                `Invalid mutation: Cannot mutate array at index ${key.toString()}. Array is read-only.` :
                `Invalid mutation: Cannot set "${key.toString()}" on "${originalTarget}". "${originalTarget}" is read-only.`;
            throw new Error(msg);
        }
        return false;
    }
    deleteProperty(shadowTarget: ReactiveMembraneShadowTarget, key: ProxyPropertyKey): boolean {
        if (process.env.NODE_ENV !== 'production') {
            const { originalTarget } = this;
            throw new Error(`Invalid mutation: Cannot delete "${key.toString()}" on "${originalTarget}". "${originalTarget}" is read-only.`);
        }
        return false;
    }
    setPrototypeOf(shadowTarget: ReactiveMembraneShadowTarget, prototype: any): any {
        if (process.env.NODE_ENV !== 'production') {
            const { originalTarget } = this;
            throw new Error(`Invalid prototype mutation: Cannot set prototype on "${originalTarget}". "${originalTarget}" prototype is read-only.`);
        }
    }
    preventExtensions(shadowTarget: ReactiveMembraneShadowTarget): boolean {
        if (process.env.NODE_ENV !== 'production') {
            const { originalTarget } = this;
            throw new Error(`Invalid mutation: Cannot preventExtensions on ${originalTarget}". "${originalTarget} is read-only.`);
        }
        return false;
    }
    defineProperty(shadowTarget: ReactiveMembraneShadowTarget, key: ProxyPropertyKey, descriptor: PropertyDescriptor): boolean {
        if (process.env.NODE_ENV !== 'production') {
            const { originalTarget } = this;
            throw new Error(`Invalid mutation: Cannot defineProperty "${key.toString()}" on "${originalTarget}". "${originalTarget}" is read-only.`);
        }
        return false;
    }
}
