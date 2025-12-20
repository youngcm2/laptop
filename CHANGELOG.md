# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2025-12-20)


### ⚠ BREAKING CHANGES

* **deps:** update dependency @types/archiver to v7 ([#28](https://github.com/youngcm2/laptop/issues/28))
* **deps:** update dependency yargs to v18 ([#29](https://github.com/youngcm2/laptop/issues/29))
* **deps:** update Node.js to v24 ([#27](https://github.com/youngcm2/laptop/issues/27))
* new laptop script ([#3](https://github.com/youngcm2/laptop/issues/3))

### Features

* add comprehensive laptop backup and restore features ([#5](https://github.com/youngcm2/laptop/issues/5)) ([1aac13c](https://github.com/youngcm2/laptop/commit/1aac13c69b3a09afeba7196714f9cb098f84616b))
* add constitution v1.1.0 with enforcement tooling ([713386d](https://github.com/youngcm2/laptop/commit/713386d699309a5e32bf966cf733f864529d3b68))
* **deps:** update dependency @types/archiver to v7 ([#28](https://github.com/youngcm2/laptop/issues/28)) ([4fe353a](https://github.com/youngcm2/laptop/commit/4fe353a950bcd0fb2ac23a6109e8943084b4314d))
* **deps:** update dependency yargs to v18 ([#29](https://github.com/youngcm2/laptop/issues/29)) ([6844abd](https://github.com/youngcm2/laptop/commit/6844abd5722b8283af4eae3ef2605131da9bacf3))
* **deps:** update Node.js to v24 ([#27](https://github.com/youngcm2/laptop/issues/27)) ([79eab0d](https://github.com/youngcm2/laptop/commit/79eab0d65a875adb541aae889f91b8c79179d315))
* new laptop script ([#3](https://github.com/youngcm2/laptop/issues/3)) ([94e6a97](https://github.com/youngcm2/laptop/commit/94e6a971da540bc4fdec04185b93cd4c1434cb5e))


### Bug Fixes

* change module system to commonjs for compatibility ([3849f4a](https://github.com/youngcm2/laptop/commit/3849f4a4fd67f44b0e496eb409ae793ecd6b693c))
* **deps:** update dependency @types/archiver to v6.0.4 ([#16](https://github.com/youngcm2/laptop/issues/16)) ([e55e594](https://github.com/youngcm2/laptop/commit/e55e59454b78d3f0effdaa1d4032ff9d9520c6f9))
* **deps:** update dependency execa to v9.6.0 ([#23](https://github.com/youngcm2/laptop/issues/23)) ([377a27d](https://github.com/youngcm2/laptop/commit/377a27d6f53f07d0e7e8fb3abc31d5844229cb98))
* **deps:** update dependency execa to v9.6.1 ([#43](https://github.com/youngcm2/laptop/issues/43)) ([66cbe42](https://github.com/youngcm2/laptop/commit/66cbe425707ce8960f71972735a28720013e2a39))
* **deps:** update dependency fs-extra to v11.3.2 ([#24](https://github.com/youngcm2/laptop/issues/24)) ([15ab416](https://github.com/youngcm2/laptop/commit/15ab416ba97a07e7897b05e2724abb681248cbe1))
* **deps:** update dependency fs-extra to v11.3.3 ([#56](https://github.com/youngcm2/laptop/issues/56)) ([958703d](https://github.com/youngcm2/laptop/commit/958703d016647d2aabc87de56d4ce85f2b2c9d05))
* **deps:** update dependency npm to v11.6.2 ([#17](https://github.com/youngcm2/laptop/issues/17)) ([e2a55f9](https://github.com/youngcm2/laptop/commit/e2a55f970fd54ad823ac6f27f0bfba08ec75c992))
* **deps:** update dependency npm to v11.6.3 ([#40](https://github.com/youngcm2/laptop/issues/40)) ([9bba80d](https://github.com/youngcm2/laptop/commit/9bba80da84679e434a03ea23daf4a9bd16486420))
* **deps:** update dependency npm to v11.6.4 ([#42](https://github.com/youngcm2/laptop/issues/42)) ([fa5644e](https://github.com/youngcm2/laptop/commit/fa5644e6389dc337a6eb87644064c2f78f409d33))
* **deps:** update dependency npm to v11.7.0 ([#47](https://github.com/youngcm2/laptop/issues/47)) ([a356351](https://github.com/youngcm2/laptop/commit/a356351f241a58e038cde4aa25f72df0669cc05f))
* **deps:** update node.js to v24.11.1 ([#35](https://github.com/youngcm2/laptop/issues/35)) ([423ccb6](https://github.com/youngcm2/laptop/commit/423ccb64561dc6598c27a430e1c94236776f288f))
* **deps:** update node.js to v24.12.0 ([#49](https://github.com/youngcm2/laptop/issues/49)) ([31fe438](https://github.com/youngcm2/laptop/commit/31fe4388ef6794d1474b0c056f242d0e30d77d6e))
* remove install script hook and add resume functionality ([c653fb4](https://github.com/youngcm2/laptop/commit/c653fb473f9ae021ecede07c9d552c45af39fd8a))
* resolve typescript compilation errors ([10a2e79](https://github.com/youngcm2/laptop/commit/10a2e79e2170bf74b74caba3e4866a49a7398457))

## [1.0.0] - 2025-01-22

### Added
- Initial release of laptop setup backup and restore tool
- Homebrew package collection (formulae, casks, taps)
- Application detection with installation source identification
- Shell configuration backup (.zshrc, .bashrc, etc.)
- Sensitive files collection with optional encryption
- Profile mode for non-admin installation
- Automated installation from backup
- GitHub Actions workflows with release-please
- Comprehensive documentation

### Security
- Sensitive files are only scanned by default (dry run)
- Explicit flag required to store sensitive files
- Optional AES-256-CBC encryption for sensitive data
- File permissions preserved during backup and restore
