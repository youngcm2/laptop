# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2025-08-25)


### ⚠ BREAKING CHANGES

* new laptop script ([#3](https://github.com/youngcm2/laptop/issues/3))

### Features

* add comprehensive laptop backup and restore features ([#5](https://github.com/youngcm2/laptop/issues/5)) ([e7b8930](https://github.com/youngcm2/laptop/commit/e7b8930dd7eb421928fb340f5c5097610659f004))
* new laptop script ([#3](https://github.com/youngcm2/laptop/issues/3)) ([94e6a97](https://github.com/youngcm2/laptop/commit/94e6a971da540bc4fdec04185b93cd4c1434cb5e))

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
