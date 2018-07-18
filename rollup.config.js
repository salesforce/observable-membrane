// -- Modules -----------------------------------------------------------------
const path = require('path');
const typescript = require('rollup-plugin-typescript');
const replace = require('rollup-plugin-replace');
const babelMinify = require('babel-minify');
const { version } = require('./package.json');

// -- Config ------------------------------------------------------------------
const input = path.resolve(__dirname, 'src/main.ts');
const umdDir = path.resolve(__dirname, 'dist/umd');
const cjsDir = path.resolve(__dirname, 'dist/commonjs');
const modulesDir = path.resolve(__dirname, 'dist/modules');
const banner = (`/**\n * Copyright (C) 2017 salesforce.com, inc.\n */`);
const footer = `/** version: ${version} */`;

// -- Helpers -----------------------------------------------------------------
function inlineMinifyPlugin() {
    return {
        transformBundle(code) {
            return babelMinify(code);
        }
    };
}

function rollupConfig({ formats, prod }) {
    const replaceToken = JSON.stringify(prod ? 'production' : 'development');
    const plugins = [
        typescript({ target: 'es6', typescript: require('typescript') }),
        prod !== undefined && replace({ 'process.env.NODE_ENV': replaceToken }),
        prod && inlineMinifyPlugin({})
    ].filter(Boolean);

    const output = formats.map(format => {
        const targetDirectory = format === 'umd' ? umdDir : format === 'cjs' ? cjsDir : modulesDir;
        const targetName = `observable-membrane${prod ? '.min' : '' }.js`;

        return {
            name: 'ObservableMembrane',
            file: path.join(targetDirectory, targetName),
            format,
            banner,
            footer
        }
    });

    return { input, output, plugins };
}

// -- Rollup ------------------------------------------------------------------

module.exports = [
    rollupConfig({ formats: ['cjs', 'es'] }),
    rollupConfig({ formats: ['umd'], prod: false }),
    rollupConfig({ formats: ['umd'], prod: true })
];
