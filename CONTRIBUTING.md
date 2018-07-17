# Contributing

[Set up SSH access to Github][setup-github-ssh] if you haven't done so already.

## Requirements

 * Node 8.x
 * NPM 5.x
 * Yarn >= 0.27.5

## Installation

### 1) Download the repository

```bash
git clone git@github.com:salesforce/observable-membrane.git
```

### 2) Install Dependencies

*We use [yarn](https://yarnpkg.com/) because it is significantly faster than npm for our use case. See this command [cheatsheet](https://yarnpkg.com/lang/en/docs/migrating-from-npm/).*

```bash
yarn install
```

## Building

When using `yarn build`, it will build the entire project into the `dist/` folder where you can find the different distributions:

```bash
yarn build
```

As a result, this is the output:

```
dist/
├── commonjs
│   └── observable-membrane.js
├── modules
│   └── observable-membrane.js
└── umd
    ├── observable-membrane.js
    └── observable-membrane.min.js
```

By default, when using this package in node, the `commonjs/` or `modules/` distribution will be used. Additionally, you can use the `umd/` version directly in browsers.

## Testing

When using `yarn test`, it will execute the unit tests using `jest`:

```bash
yarn test
```

## Linter

When using `yarn lint`, it will lint the `src/` folder using `tslint`:

```bash
yarn lint
```

The above command may display lint issues that are unrelated to your changes.
The recommended way to avoid lint issues is to [configure your
editor][eslint-integrations] to warn you in real time as you edit the file.

Fixing all existing lint issues is a tedious task so please pitch in by fixing
the ones related to the files you make changes to!

## Editor Configurations

Configuring your editor to use our lint and code style rules will help make the
code review process delightful!

### types

This project relies on type annotations heavily.

* Make sure your editor supports [typescript](https://www.typescriptlang.org/).

### tslint

[Configure your editor][tslint-integrations] to use our eslint configurations.

### editorconfig

[Configure your editor][editorconfig-plugins] to use our editor configurations.

### Visual Studio Code

```
ext install EditorConfig
```

## Git Workflow

The process of submitting a pull request is fairly straightforward and
generally follows the same pattern each time:

1. [Create a feature branch](#create-a-feature-branch)
1. [Make your changes](#make-your-changes)
1. [Rebase](#rebase)
1. [Check your submission](#check-your-submission)
1. [Create a pull request](#create-a-pull-request)
1. [Update the pull request](#update-the-pull-request)
1. [Commit Message Guidelines](#commit)

### Create a feature branch

```bash
git checkout master
git pull origin master
git checkout -b <name-of-the-feature>
```

### Make your changes

Modify the files, build, test, lint and eventually commit your code using the following command:

```bash
git add <path/to/file/to/commit>
git commit
git push origin <name-of-the-feature>
```

The above commands will commit the files into your feature branch. You can keep
pushing new changes into the same branch until you are ready to create a pull
request.

### Rebase

Sometimes your feature branch will get stale with respect to the master branch,
and it will require a rebase. The following steps can help:

```bash
git checkout master
git pull origin master
git checkout <name-of-the-feature>
git rebase master <name-of-the-feature>
```

_note: If no conflicts arise, these commands will ensure that your changes are applied on top of the master branch. Any conflicts will have to be manually resolved._

### Create a pull request

If you've never created a pull request before, follow [these
instructions][creating-a-pull-request].
Pull request title must be formatted according to [Commit Message Guidelines](#commit).
Pull request samples can be found [here](https://github.com/salesforce/observable-membrane/pulls)

### Update the pull request

```sh
git fetch origin
git rebase origin/${base_branch}

# If there were no merge conflicts in the rebase
git push origin ${feature_branch}

# If there was a merge conflict that was resolved
git push origin ${feature_branch} --force
```

_note: If more changes are needed as part of the pull request, just keep committing and pushing your feature branch as described above and the pull request will automatically update._

[setup-github-ssh]: https://help.github.com/articles/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent/
[creating-a-pull-request]: https://help.github.com/articles/creating-a-pull-request/
[tslint-integrations]: https://palantir.github.io/tslint/usage/third-party-tools/
[editorconfig-plugins]: http://editorconfig.org/#download
