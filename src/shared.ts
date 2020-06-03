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
    hasOwnProperty,
    freeze,
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
    hasOwnProperty,
    freeze,
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

export function isObject(obj: any): obj is object {
    return typeof obj === 'object';
}

const proxyToValueMap: WeakMap<object, any> = new WeakMap();

export function registerProxy(proxy: object, value: any) {
    proxyToValueMap.set(proxy, value);
}

export const unwrap = (replicaOrAny: any): any => proxyToValueMap.get(replicaOrAny) || replicaOrAny;
