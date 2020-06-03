import { toString, isArray, unwrap, isExtensible, preventExtensions, ObjectDefineProperty, freeze } from './shared';
import { BaseProxyHandler, ReactiveMembraneShadowTarget } from './base-handler';

const getterMap = new WeakMap<() => any, () => any>();
const setterMap = new WeakMap<(v: any) => void, (v: any) => void>();

export class ReactiveProxyHandler extends BaseProxyHandler {
    wrapValue(value: any): any {
        return this.membrane.getProxy(value);
    }
    wrapGetter(originalGet: () => any): () => any {
        if (getterMap.has(originalGet)) {
            return getterMap.get(originalGet) as () => any;
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
        if (setterMap.has(originalSet)) {
            return setterMap.get(originalSet) as (v: any) => void;
        }
        const set = function (this: any, v: any) {
            // invoking the original setter with the original target
            originalSet.call(unwrap(this), unwrap(v));
        };
        setterMap.set(originalSet, set);
        return set;
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
    setPrototypeOf(shadowTarget: ReactiveMembraneShadowTarget, prototype: any): any {
        if (process.env.NODE_ENV !== 'production') {
            throw new Error(`Invalid setPrototypeOf invocation for reactive proxy ${toString(this.originalTarget)}. Prototype of reactive objects cannot be changed.`);
        }
    }
    preventExtensions(shadowTarget: ReactiveMembraneShadowTarget): boolean {
        const { originalTarget } = this;
        if (isExtensible(shadowTarget)) {
            preventExtensions(originalTarget);
            // if the originalTarget is a proxy itself, it might reject
            // the preventExtension call, in which case we should not attempt to lock down
            // the shadow target.
            if (isExtensible(originalTarget)) {
                return false;
            }
            this.lockShadowTarget(shadowTarget);
        }
        return true;
    }
    defineProperty(shadowTarget: ReactiveMembraneShadowTarget, key: PropertyKey, descriptor: PropertyDescriptor): boolean {
        const { originalTarget, membrane: { valueMutated } } = this;
        // in the future, we could use Reflect.defineProperty to know the result of the operation
        // for now, we assume it was carry on (if originalTarget is a proxy, it could reject the operation)
        ObjectDefineProperty(originalTarget, key, this.unwrapDescriptor(descriptor));
        // intentionally testing against true since it could be undefined as well
        if (descriptor.configurable === false) {
            this.copyDescriptorIntoShadowTarget(shadowTarget, key);
        }
        valueMutated(originalTarget, key);
        return true;
    }
}

// future proxy optimizations
freeze(ReactiveProxyHandler.prototype);
