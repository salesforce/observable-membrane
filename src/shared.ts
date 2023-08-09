/*
 * Copyright (c) 2023, Salesforce.com, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
const { isArray } = Array;

const {
    prototype: ObjectDotPrototype,
    getPrototypeOf,
    create: ObjectCreate,
    defineProperty: ObjectDefineProperty,
    isExtensible,
    getOwnPropertyDescriptor,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    preventExtensions,
    hasOwnProperty,
} = Object;

const { push: ArrayPush, concat: ArrayConcat } = Array.prototype;

export {
    ArrayPush,
    ArrayConcat,
    isArray,
    getPrototypeOf,
    ObjectCreate,
    ObjectDefineProperty,
    ObjectDotPrototype,
    isExtensible,
    getOwnPropertyDescriptor,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    preventExtensions,
    hasOwnProperty,
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

const proxyToValueMap: WeakMap<object, any> = new WeakMap();

export function registerProxy(proxy: object, value: any) {
    proxyToValueMap.set(proxy, value);
}

export const unwrap = (replicaOrAny: any): any => proxyToValueMap.get(replicaOrAny) || replicaOrAny;

// In the specification for Proxy, the keys are defined not as PropertyKeys (i.e. `string | symbol | number`)
// but as `string | symbol`. See: https://github.com/microsoft/TypeScript/pull/35594
export type ProxyPropertyKey = string | symbol;
