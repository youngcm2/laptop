#!/usr/bin/env bash
#
# Install git hooks for the Laptop Setup & Backup Tool
# Enforces constitution standards for commits and branches
#

set -e

# Find repository root
if git rev-parse --show-toplevel >/dev/null 2>&1; then
    REPO_ROOT=$(git rev-parse --show-toplevel)
else
    echo "Error: Not in a git repository"
    exit 1
fi

cd "$REPO_ROOT"

HOOKS_DIR=".git/hooks"
SCRIPTS_DIR=".specify/scripts/bash"

echo "Installing git hooks..."

# Install commit-msg hook
if [ -f "$SCRIPTS_DIR/commit-msg-hook.sh" ]; then
    ln -sf "../../$SCRIPTS_DIR/commit-msg-hook.sh" "$HOOKS_DIR/commit-msg"
    chmod +x "$HOOKS_DIR/commit-msg"
    echo "✓ Installed commit-msg hook (validates conventional commits)"
else
    echo "✗ Warning: commit-msg-hook.sh not found"
fi

echo ""
echo "Git hooks installed successfully!"
echo ""
echo "These hooks enforce:"
echo "  - Conventional Commits format (feat, fix, chore, etc.)"
echo "  - Maximum 72 character commit titles"
echo "  - Lowercase descriptions"
echo "  - No commit bodies (except BREAKING CHANGE footer)"
echo ""
echo "See .specify/memory/constitution.md for full standards."
