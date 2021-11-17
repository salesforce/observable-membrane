#!/usr/bin/env node

/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import path from 'path';
import { createRequire } from 'module';

import execa from 'execa';
import semver from 'semver';
import readline from 'readline';

const require = createRequire(import.meta.url);
const currentVersion = require('../../package.json').version;

const VALID_SEMVER_KEYWORDS = [
    'major',
    'minor',
    'patch',
    'premajor',
    'preminor',
    'prepatch',
    'prerelease',
];

const { stdin, stdout } = process;
const rl = readline.createInterface({
    input: stdin,
    output: stdout,
});

rl.question(
    `Increment version by explicit version number or semver keyword (e.g., major, minor, patch, etc): `,
    (input) => {
        let trimmedInput = input.trim();
        let explicitVersion = semver.clean(trimmedInput);
        let isValidVersion = explicitVersion !== null;
        let isValidKeyword = VALID_SEMVER_KEYWORDS.includes(trimmedInput);

        if (!isValidVersion && !isValidKeyword) {
            rl.write(`"${trimmedInput}" is not a valid version number or semver keyword.`);
            rl.close();
            return;
        }

        const nextVersion = explicitVersion ?? semver.inc(currentVersion, trimmedInput);
        rl.question(
            `The current version v${currentVersion} will be updated to v${nextVersion}. Press ENTER or RETURN to continue.`,
            () => {
                execa.sync('npm', ['version', nextVersion]);
                rl.close();
            }
        );
    }
);
