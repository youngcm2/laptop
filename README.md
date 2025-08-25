# Laptop Setup & Backup Tool

A comprehensive tool for backing up and restoring your Mac development environment, including Homebrew packages, applications, shell configurations, and sensitive files.

## Features

- **Homebrew Package Collection**: Backs up all installed formulae, casks, and taps
- **Application Detection**: Identifies all installed applications with their installation sources (Homebrew cask, Mac App Store, direct download, or system)
- **Shell Configuration**: Backs up shell configs (.zshrc, .bashrc, etc.) and development settings
- **Sensitive Files**: Optionally backs up SSH keys, AWS credentials, tokens, and other secrets with encryption
- **Profile Mode**: Install without admin access to a user-specific location
- **Automated Installation**: Restore your entire setup on a new Mac with a single command

## Installation

```bash
npm install
npm run build
```

## Usage

### Collecting Your Current Setup

Basic collection:
```bash
npm run collect
```

Include sensitive files (SSH keys, tokens, etc.):
```bash
npm run collect -- --include-sensitive
```

Include sensitive files with encryption:
```bash
npm run collect -- --include-sensitive --encrypt
```

Custom output location:
```bash
npm run collect -- --output ~/Desktop/my-backup.zip
```

### Installing on a New Mac

Basic installation:
```bash
npm run install laptop-setup-2025-01-22_10-30-00.zip
```

With profile mode (no admin required):
```bash
npm run install laptop-setup.zip --profile
```

With sensitive files decryption:
```bash
npm run install laptop-setup.zip --decrypt-key YOUR_ENCRYPTION_KEY
```

Skip sensitive files:
```bash
npm run install laptop-setup.zip --skip-sensitive
```

## What Gets Backed Up

### Homebrew
- All installed formulae (command-line tools)
- All installed casks (GUI applications)
- All tapped repositories
- Custom Homebrew configurations

### Applications
- Applications from /Applications and ~/Applications
- System applications and utilities
- Installation method detection (cask, App Store, direct download)
- Bundle identifiers and version information

### Shell Configurations
- Shell configs: .zshrc, .bashrc, .bash_profile, etc.
- Git configuration: .gitconfig, .gitignore_global
- Tool configs: .tmux.conf, .vimrc, .editorconfig
- Development settings: .tool-versions, .asdfrc
- Editor configs: .config/nvim/, .config/starship.toml

### Sensitive Files (Optional)
- SSH keys and configurations (~/.ssh/)
- AWS credentials (~/.aws/)
- NPM tokens (~/.npmrc)
- Git credentials (~/.git-credentials, ~/.netrc)
- GPG keys (~/.gnupg/)
- Kubernetes configs (~/.kube/config)
- Docker configs (~/.docker/config.json)
- Cloud provider credentials (GCP, Azure)
- Development tokens (Ruby, Rust, Gradle, Maven)
- Environment files (.env, .envrc)

## Security

- Sensitive files are only included when explicitly requested with `--include-sensitive`
- Clear warning is shown when including sensitive files
- Optional AES-256-CBC encryption for sensitive data with `--encrypt`
- Encryption key is generated automatically and saved separately
- Existing files are backed up before being overwritten during installation
- File permissions are preserved during backup and restore

## Profile Mode

Profile mode allows installation without admin access:
- Homebrew installs to ~/homebrew instead of /opt/homebrew
- GUI applications (casks) are skipped
- Shell configurations are updated with user-specific paths
- Perfect for corporate environments with restricted permissions

## Output Format

The tool creates a timestamped ZIP file containing:
- `laptop-setup.json`: Main configuration data
- `configs/`: Shell configuration files
- `sensitive/`: Encrypted sensitive files (if included)
- `applications_list.txt`: Human-readable list of all applications
- `appstore_apps.txt`: Apps that need App Store installation
- `sensitive_files_summary.txt`: Summary of collected sensitive files
- `ENCRYPTION_KEY.txt`: Decryption key (if encryption is used)

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run collect command
npm run collect

# Run install command
npm run install <zipfile>
```

## Manual Setup Scripts (Legacy)

The original manual setup scripts are still available:

```bash
cd laptop

# Install system packages
source ./laptop.sh

# Install programming languages
source ./asdf.sh

# Create dotfile symlinks
source ./dotfiles.sh
```

## Requirements

- macOS
- Node.js 18+
- npm or yarn
- GitHub CLI (for backup script)
- Homebrew (will be installed if missing)

## License

MIT