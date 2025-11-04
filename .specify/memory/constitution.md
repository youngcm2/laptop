# Laptop Setup & Backup Tool Constitution

<!--
Sync Impact Report:
Version: 1.0.0 → 1.1.0 (MINOR)

Rationale for MINOR bump:
- Added comprehensive commit and PR standards section
- Materially expanded Development Workflow section
- Added branch naming conventions
- No breaking changes to existing principles
- No removal of existing sections

Modified Principles:
- Development Workflow > Commit Standards (expanded significantly)

Added Sections:
- Development Workflow > Branch Naming Convention
- Development Workflow > Commit Standards (NON-NEGOTIABLE) with comprehensive rules
- Development Workflow > Code Review Requirements
- Development Workflow > PR Description Format

Removed Sections: N/A

Templates Requiring Updates:
  ✅ plan-template.md - Reviewed, no updates needed (constitution check section is generic)
  ✅ spec-template.md - Reviewed, no updates needed (user story format aligns)
  ✅ tasks-template.md - Reviewed, no updates needed (task structure supports principles)
  ⚠ No command files exist yet - will guide creation when needed

Follow-up TODOs: None
-->

## Core Principles

### I. Security First

**MUST** protect user data and credentials at all times:
- Sensitive files (SSH keys, credentials, tokens) are opt-in only via explicit `--include-sensitive` flag
- Encryption MUST use industry-standard algorithms (AES-256-CBC minimum) when `--encrypt` flag is used
- Clear warnings MUST be shown when collecting sensitive data
- File permissions MUST be preserved during backup and restoration
- Credentials MUST NEVER be logged or displayed in plain text
- All user input MUST be validated to prevent command injection

**Rationale**: This tool handles SSH keys, AWS credentials, GPG keys, and other secrets that could compromise user security if mishandled. Security cannot be optional or implied.

### II. Fail-Safe Operations

**MUST** prevent data loss and enable recovery:
- Existing files MUST be backed up before overwriting (with `.backup-<timestamp>` suffix)
- Installation operations MUST be idempotent (safe to run multiple times)
- Clear validation MUST occur before destructive operations
- Error messages MUST be actionable and specific
- Partial failures MUST be recoverable without requiring full restart
- Exit codes MUST accurately reflect success (0) vs failure (non-zero)

**Rationale**: Users trust this tool with their entire development environment. A failed restore on a new laptop should never result in lost configurations or broken systems.

### III. Cross-Platform Compatibility

**MUST** work consistently across macOS environments:
- Support both Intel and Apple Silicon Macs
- Handle both system Homebrew (`/opt/homebrew`, `/usr/local`) and profile mode (`~/homebrew`)
- Detect and adapt to different macOS versions gracefully
- Account for both `/Applications` and `~/Applications` locations
- Support multiple shell environments (zsh, bash)
- Never assume specific directory structures exist

**Rationale**: Mac users work across different architectures and configurations. The tool must work for everyone from M1 MacBook Air to Intel Mac Pro.

### IV. Clear and Explicit

**MUST** make all operations transparent and controllable:
- All operations MUST log clear progress messages
- Flags and options MUST have obvious, descriptive names
- Default behavior MUST be safe (no sensitive files, no encryption)
- Users MUST explicitly opt-in to risky operations
- Output formats MUST be both human-readable and machine-parseable
- File paths in logs MUST be absolute or clearly relative

**Rationale**: Users need to understand exactly what the tool is doing, especially when it's modifying their system or collecting credentials.

### V. Minimize Dependencies

**MUST** keep external dependencies minimal and justified:
- Core functionality MUST work with only Node.js and npm
- System tools (Homebrew, git, etc.) are detected and installed if missing
- No framework lock-in—use Node.js standard library where possible
- Dependencies MUST be actively maintained and security-audited
- Large dependencies require justification in pull requests
- Avoid dependencies that require native compilation when alternatives exist

**Rationale**: A backup/restore tool must be reliable long-term. Fewer dependencies mean less breakage, easier maintenance, and reduced security surface area.

## Security Requirements

All code changes MUST consider:

1. **Input Validation**: Validate all user inputs, file paths, and external data
2. **Command Injection**: Use `execa` with array arguments, never string concatenation
3. **File System Operations**: Validate paths are within expected directories
4. **Encryption Keys**: Generate with `crypto.randomBytes`, never user input directly
5. **Sensitive Data**: Clear from memory after use when possible
6. **Error Messages**: Never include sensitive data in error output

## Development Workflow

### Code Quality Gates

**Before any commit:**
1. TypeScript compilation MUST pass: `npm run type-check`
2. Code MUST build successfully: `npm run build`
3. No security vulnerabilities in dependencies: `npm audit`

**For each pull request:**
1. README MUST be updated if CLI interface changes
2. Breaking changes require MAJOR version bump and migration guide
3. New flags require documentation with examples

### Testing Philosophy

- **Manual Testing Required**: Test collect and install on actual macOS systems
- **Idempotency**: Run operations twice, verify second run is safe
- **Profile Mode**: Test both standard and `--profile` installation modes
- **Encryption**: Test full cycle: collect with `--encrypt`, install with `--decrypt-key`

**Rationale**: This is systems-level software that modifies user environments. Automated unit tests can't replace testing on real systems with real configurations.

### Branch Naming Convention

**Feature Branch Format**
- All feature branches MUST follow the format: `feat/###-feature-name`
- `###` is a zero-padded 3-digit sequential number (001, 002, 003, etc.)
- `feature-name` is a hyphen-separated descriptive name (2-4 meaningful words)
- Examples: `feat/001-encryption-support`, `feat/002-profile-mode`, `feat/003-compression-options`

**Branch Creation**
- Feature branches created manually or via automation script
- Sequential numbering ensures unique branch names and traceable feature progression
- Maximum branch name length: 244 bytes (GitHub limit)

**Rationale**
- `feat/` prefix clearly identifies feature branches in git history
- Sequential numbering prevents conflicts and enables tracking
- Consistent format enables automated tooling and CI/CD workflows

### Commit Standards (NON-NEGOTIABLE)

**Conventional Commits Format**
- All commits MUST follow Conventional Commits 1.0.0 specification
- Format: `<type>: <description>` OR `<type>!: <description>` for breaking changes
- Title only - NO body
- Footer allowed ONLY for breaking changes: `BREAKING CHANGE: <description>`
- Maximum title length: 72 characters

**Allowed Types**
- `feat` - New feature
- `fix` - Bug fix
- `chore` - Maintenance tasks (deps, config, tooling)
- `docs` - Documentation changes
- `refactor` - Code refactoring without feature/fix changes
- `test` - Adding or updating tests
- `perf` - Performance improvements
- `style` - Code style changes (formatting, whitespace)
- `ci` - CI/CD pipeline changes
- `build` - Build system changes

**Examples**
```
feat: add encryption support for sensitive files
fix: resolve file permission preservation issue
chore: update typescript to 5.7.2
docs: update README with encryption examples
refactor: simplify backup validation logic
test: add integration tests for profile mode

# Breaking change with ! indicator
feat!: remove deprecated --legacy-mode flag

# Breaking change with footer
feat: migrate to new compression algorithm

BREAKING CHANGE: old .zip files use different compression format
```

**Rules**
- Use lowercase for type and description
- Use imperative mood ("add" not "added" or "adds")
- No period at end of description
- Be concise but descriptive
- Group related changes in single commit when logical
- One commit per logical change unit
- Breaking changes: Use `!` after type OR add `BREAKING CHANGE:` footer
- Breaking change footer must describe what breaks and migration path

**Prohibited**
- ❌ Commit bodies (except breaking change footer)
- ❌ Issue/ticket references in commit (use PR description)
- ❌ Merge commit messages (use squash/rebase)
- ❌ Generic footers (only BREAKING CHANGE allowed)

### Code Review Requirements

**Pre-PR Checklist**
- [ ] All TypeScript compilation successful (`npm run type-check`)
- [ ] Build successful (`npm run build`)
- [ ] No security vulnerabilities (`npm audit`)
- [ ] No console errors or warnings
- [ ] Conventional commit title (used for squash merge)
- [ ] No commented-out code
- [ ] README updated if CLI interface changed
- [ ] Version bumped if breaking change

**PR Description Format**
- Summary of changes with bullet points
- Test plan with verification steps
- Breaking changes highlighted if applicable
- No AI attribution or tooling footers required

**PR Review Process**
- Manual testing required for system-level changes
- Security review required for sensitive file handling
- Documentation review if user-facing changes
- Performance impact assessed for large operations

## Governance

This constitution defines non-negotiable standards for the Laptop Setup & Backup Tool project.

**Amendment Process:**
1. Propose changes via GitHub issue with justification
2. Discuss impact on security, reliability, and user experience
3. Update constitution with incremented version
4. Update dependent templates (plan, spec, tasks)
5. Update this Sync Impact Report

**Version Policy:**
- **MAJOR**: Backward incompatible changes, removed principles, architectural shifts
- **MINOR**: New principles added, materially expanded guidance
- **PATCH**: Clarifications, wording improvements, typo fixes

**Compliance:**
- All pull requests MUST verify alignment with these principles
- Security violations MUST be rejected regardless of functionality
- Complexity MUST be justified against these principles
- Code reviews MUST reference specific constitutional requirements when relevant

**Runtime Guidance**: For day-to-day development patterns and workflow preferences, see `~/.claude/CLAUDE.md` (user's private global instructions).

**Version**: 1.1.0 | **Ratified**: 2025-01-04 | **Last Amended**: 2025-01-04
