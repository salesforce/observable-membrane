import { createRequire } from 'module';

import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';

const require = createRequire(import.meta.url);
const { version } = require('./package.json');

const output = { 
    format: 'es', 
    banner: `/**\n * Copyright (C) 2017 salesforce.com, inc.\n */`, 
    footer: `/** version: ${version} */`
};

export default [
    {
        input: 'src/main.ts',

        output: {
            ...output,
            file: 'dist/observable-membrane.js',
        },

        plugins: [
            typescript({
                tsconfig: './tsconfig.json',
            }),
        ],
    },
    {
        input: 'src/main.ts',

        output: {
            ...output,
            file: 'dist/observable-membrane.prod.js',
        },

        plugins: [
            replace({
                'process.env.NODE_ENV': JSON.stringify('production'),
                preventAssignment: true,
            }),
            typescript({
                tsconfig: './tsconfig.json',
            }),
        ],
    },
];
