#!/usr/bin/env node

/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
const execa = require('execa');
const isCI = require('is-ci');

if (!isCI) {
    console.error('This script is only meant to run in CI.');
    process.exit(1);
}

try {
    // We can't use a straightforward git command like `git branch --show-current` because we've
    // checked out a git tag and we're in a detached HEAD state. The following logic attempts to
    // verify that this tag points to a commit contained by a release branch.

    // All branches that contain the current commit. Since we only deal with release commits, the
    // only scenario where this might be an issue is if we try to publish a release commit from
    // master after CLCO because the commit will show up in two branches.
    const branches = execa.commandSync('git branch --all --contains').stdout;

    // Restrict the regex to remote branches to avoid assumptions about local branches.
    const REMOTE_RELEASE_BRANCH_RE = /origin\/(master|((winter|spring|summer)\d+))/;
    const result = REMOTE_RELEASE_BRANCH_RE.exec(branches);
    if (result === null) {
        const tag = execa.commandSync('git tag --points-at HEAD').stdout;
        console.error(`The commit referenced by "${tag}" is not contained by any release branch.`);
        process.exit(1);
    }
} catch (ex) {
    console.error(ex);
    process.exit(1);
}

const [, releaseBranch] = result;
const distTag = releaseBranch === 'master' ? 'next' : releaseBranch;

console.log(
    `Attempting to release from branch "${releaseBranch}" using dist-tag "${distTag}".`
);

try {
    execa.commandSync(`npm publish --tag ${distTag}`);
} catch (ex) {
    console.error(ex);
    process.exit(1);
}
