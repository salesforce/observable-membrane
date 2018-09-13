const { isArray } = Array;

const {
    getPrototypeOf,
    create: ObjectCreate,
    defineProperty: ObjectDefineProperty,
    defineProperties: ObjectDefineProperties,
    isExtensible,
    getOwnPropertyDescriptor,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    preventExtensions,
} = Object;

const {
    push: ArrayPush,
    concat: ArrayConcat,
    map: ArrayMap,
} = Array.prototype;

export {
    ArrayPush,
    ArrayConcat,
    ArrayMap,
    isArray,
    getPrototypeOf,
    ObjectCreate,
    ObjectDefineProperty,
    ObjectDefineProperties,
    isExtensible,
    getOwnPropertyDescriptor,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    preventExtensions,
};

const OtS = {}.toString;
export function toString(obj: any): string {
    if (obj && obj.toString) {
        return obj.toString();
    } else if (typeof obj === 'object') {
        return OtS.call(obj);
    } else {
        return obj + '';
    }
}

export function isUndefined(obj: any): obj is undefined {
    return obj === undefined;
}

export function isFunction(obj: any): obj is Function {
    return typeof obj === 'function';
}

export const TargetSlot = Symbol();

// TODO: we are using a funky and leaky abstraction here to try to identify if
// the proxy is a compat proxy, and define the unwrap method accordingly.
// @ts-ignore
const { getKey } = Proxy;

export const unwrap = getKey ?
    (replicaOrAny: any): any => (replicaOrAny && getKey(replicaOrAny, TargetSlot)) || replicaOrAny
    : (replicaOrAny: any): any => (replicaOrAny && replicaOrAny[TargetSlot]) || replicaOrAny;

export function isObject(obj: any): obj is object {
    return typeof obj === 'object';
}
