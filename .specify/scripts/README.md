# Specify Scripts

This directory contains automation scripts that enforce the project constitution standards.

## Git Hooks

### Installation

Hooks are automatically installed when you run `npm install` (via the `prepare` script).

Manual installation:
```bash
bash .specify/scripts/bash/install-hooks.sh
```

### Commit Message Validation

The `commit-msg` hook validates all commits against the Conventional Commits standard defined in the constitution.

**Enforced Rules:**
- Must follow format: `<type>: <description>` or `<type>!: <description>`
- Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `style`, `ci`, `build`
- Maximum 72 characters
- Lowercase description
- No period at end
- No commit body (except `BREAKING CHANGE:` footer)

**Valid Examples:**
```bash
git commit -m "feat: add encryption support for sensitive files"
git commit -m "fix: resolve file permission preservation issue"
git commit -m "feat!: remove deprecated --legacy-mode flag"
git commit -m "chore: update typescript to 5.7.2"
```

**Invalid Examples:**
```bash
# Wrong: uppercase description
git commit -m "feat: Add encryption support"

# Wrong: period at end
git commit -m "fix: resolve issue."

# Wrong: invalid type
git commit -m "update: change something"

# Wrong: too long (>72 chars)
git commit -m "feat: add a very long description that exceeds seventy two characters and will be rejected"
```

## Branch Creation

### Create Feature Branch

Creates a new feature branch following the constitution's naming convention: `feat/###-feature-name`

```bash
.specify/scripts/bash/create-new-feature.sh "Feature description"
```

**Options:**
- `--short-name <name>` - Custom branch name (2-4 words)
- `--number N` - Specific branch number (overrides auto-detection)
- `--json` - Output in JSON format

**Examples:**
```bash
# Auto-generate branch name from description
.specify/scripts/bash/create-new-feature.sh "Add encryption support for sensitive files"
# Creates: feat/001-encryption-support-sensitive

# Provide custom short name
.specify/scripts/bash/create-new-feature.sh "Implement OAuth2 integration" --short-name "oauth-integration"
# Creates: feat/002-oauth-integration

# Specify branch number manually
.specify/scripts/bash/create-new-feature.sh "Profile mode installation" --number 5
# Creates: feat/005-profile-mode-installation
```

**Branch Naming Rules:**
- Prefix: `feat/`
- Number: 3-digit zero-padded (001, 002, 003...)
- Name: 2-4 hyphen-separated meaningful words
- Maximum: 244 bytes (GitHub limit)
- Auto-detects next available number from remote, local branches, and spec directories

## Validation Script

Run pre-commit validation:

```bash
npm run validate
```

This runs:
1. TypeScript type checking (`npm run type-check`)
2. Build verification (`npm run build`)
3. Security audit (`npm audit`)

## Constitution Compliance

All scripts enforce standards from `.specify/memory/constitution.md`:

- **Branch Naming Convention** - `feat/###-feature-name` format
- **Commit Standards (NON-NEGOTIABLE)** - Conventional Commits 1.0.0
- **Code Quality Gates** - Type checking, builds, security audits

See the constitution for complete details on all standards and requirements.
