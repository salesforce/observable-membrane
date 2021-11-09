"use strict";

import { createRequire } from "module";

import replace from "@rollup/plugin-replace";
import typescript from "@rollup/plugin-typescript";

const require = createRequire(import.meta.url);
const { version } = require("./package.json");

const banner = `/**\n * Copyright (C) 2017 salesforce.com, inc.\n */`;
const footer = `/** version: ${version} */`;
const output = { banner, footer };

export default [
    {
        input: "src/main.ts",

        output: {
            ...output,
            format: "es",
            file: "dist/observable-membrane.js",
        },

        plugins: [
            typescript({
                tsconfig: "./tsconfig.json",
            }),
        ],
    },
    {
        input: "src/main.ts",

        output: {
            ...output,
            format: "es",
            file: "dist/observable-membrane.browser.js",
        },

        plugins: [
            replace({
                "process.env.NODE_ENV": JSON.stringify("production"),
                preventAssignment: true,
            }),
            typescript({
                tsconfig: "./tsconfig.json",
            }),
        ],
    },
];
