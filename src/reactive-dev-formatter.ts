import {
    ArrayPush,
    ArrayConcat,
    isArray,
    ObjectCreate,
    getPrototypeOf,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    unwrap, ProxyPropertyKey
} from './shared';

// Define globalThis since it's not current defined in by typescript.
// https://github.com/tc39/proposal-global
declare var globalThis: any;

interface DevToolFormatter {
    header: (object: any, config: any) => any;
    hasBody: (object: any, config: any) => boolean | null;
    body: (object: any, config: any) => any;
}

function extract(objectOrArray: any): any {
    if (isArray(objectOrArray)) {
        return objectOrArray.map((item) => {
            const original = unwrap(item);
            if (original !== item) {
                return extract(original);
            }
            return item;
        });
    }

    const obj = ObjectCreate(getPrototypeOf(objectOrArray));
    const names = getOwnPropertyNames(objectOrArray);
    return ArrayConcat.call(names, getOwnPropertySymbols(objectOrArray))
        .reduce((seed: any, key: ProxyPropertyKey) => {
            const item = objectOrArray[key];
            const original = unwrap(item);
            if (original !== item) {
                seed[key] = extract(original);
            } else {
                seed[key] = item;
            }
            return seed;
        }, obj);
}

const formatter: DevToolFormatter = {
    header: (plainOrProxy) => {
        const originalTarget = unwrap(plainOrProxy);
        // if originalTarget is falsy or not unwrappable, exit
        if (!originalTarget || originalTarget === plainOrProxy) {
            return null;
        }

        const obj = extract(plainOrProxy);
        return ['object', { object: obj }];
    },
    hasBody: () => {
        return false;
    },
    body: () => {
        return null;
    }
};

// Inspired from paulmillr/es6-shim
// https://github.com/paulmillr/es6-shim/blob/master/es6-shim.js#L176-L185
function getGlobal(): any {
    // the only reliable means to get the global object is `Function('return this')()`
    // However, this causes CSP violations in Chrome apps.
    if (typeof globalThis !== 'undefined') { return globalThis; }
    if (typeof self !== 'undefined') { return self; }
    if (typeof window !== 'undefined') { return window; }
    if (typeof global !== 'undefined') { return global; }

    // Gracefully degrade if not able to locate the global object
    return {};
}

export function init() {
    if (process.env.NODE_ENV === 'production') {
        // this method should never leak to prod
        throw new ReferenceError();
    }

    const global = getGlobal();

    // Custom Formatter for Dev Tools. To enable this, open Chrome Dev Tools
    //  - Go to Settings,
    //  - Under console, select "Enable custom formatters"
    // For more information, https://docs.google.com/document/d/1FTascZXT9cxfetuPRT2eXPQKXui4nWFivUnS_335T3U/preview
    const devtoolsFormatters = global.devtoolsFormatters || [];
    ArrayPush.call(devtoolsFormatters, formatter);
    global.devtoolsFormatters = devtoolsFormatters;
}
