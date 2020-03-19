'use strict';

const path = require('path');
const replace = require('@rollup/plugin-replace');
const { terser } = require('rollup-plugin-terser');
const typescript = require('@rollup/plugin-typescript');

const { version } = require('./package.json');

const input = path.resolve(__dirname, 'src/main.ts');

const umdDir = path.resolve(__dirname, 'dist/umd');
const cjsDir = path.resolve(__dirname, 'dist/commonjs');
const modulesDir = path.resolve(__dirname, 'dist/modules');

const name = 'ObservableMembrane';
const banner = `/**\n * Copyright (C) 2017 salesforce.com, inc.\n */`;
const footer = `/** version: ${version} */`;

function rollupConfig({ formats, prod }) {
    const replaceToken = JSON.stringify(prod ? 'production' : 'development');

    const plugins = [
        typescript({
            tsconfig: false,
            target: 'es2016',
            exclude: ['test/*'],
            typescript: require('typescript')
        }),
        prod !== undefined && replace({ 'process.env.NODE_ENV': replaceToken }),
        prod && terser()
    ].filter(Boolean);

    const output = formats.map(format => {
        const targetDirectory = format === 'umd' ? umdDir : format === 'cjs' ? cjsDir : modulesDir;
        const targetName = `observable-membrane${prod ? '.min' : '' }.js`;

        return {
            name,
            format,
            banner,
            footer,
            file: path.join(targetDirectory, targetName)
        };
    });

    return {
        input,
        output,
        plugins,
        onwarn: (msg, warn) => {
            if (!/Circular/.test(msg)) {
                warn(msg);
            }
        }
    };
}

module.exports = [
    rollupConfig({ formats: ['cjs', 'es'] }),
    rollupConfig({ formats: ['umd'], prod: false }),
    rollupConfig({ formats: ['umd'], prod: true })
];
