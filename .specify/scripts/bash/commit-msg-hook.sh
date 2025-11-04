#!/usr/bin/env bash
#
# Git commit-msg hook to validate Conventional Commits format
# Based on the Laptop Setup & Backup Tool Constitution v1.1.0
#
# Install: ln -sf ../../.specify/scripts/bash/commit-msg-hook.sh .git/hooks/commit-msg
#

set -e

COMMIT_MSG_FILE="$1"
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Skip validation for merge commits
if grep -q "^Merge branch" "$COMMIT_MSG_FILE"; then
    exit 0
fi

# Skip validation for revert commits
if grep -q "^Revert" "$COMMIT_MSG_FILE"; then
    exit 0
fi

# Allowed commit types from constitution
ALLOWED_TYPES="feat|fix|chore|docs|refactor|test|perf|style|ci|build"

# Regex for conventional commit format
# Format: <type>: <description> OR <type>!: <description>
CONVENTIONAL_COMMIT_REGEX="^($ALLOWED_TYPES)(\!)?: .{1,}"

# Extract first line of commit message (the title)
COMMIT_TITLE=$(echo "$COMMIT_MSG" | head -n1)

# Check if commit title matches conventional commit format
if ! echo "$COMMIT_TITLE" | grep -qE "$CONVENTIONAL_COMMIT_REGEX"; then
    echo "❌ ERROR: Commit message does not follow Conventional Commits format"
    echo ""
    echo "Current commit title:"
    echo "  $COMMIT_TITLE"
    echo ""
    echo "Required format: <type>: <description>"
    echo "  OR: <type>!: <description> (for breaking changes)"
    echo ""
    echo "Allowed types:"
    echo "  - feat     (new feature)"
    echo "  - fix      (bug fix)"
    echo "  - chore    (maintenance tasks)"
    echo "  - docs     (documentation changes)"
    echo "  - refactor (code restructuring)"
    echo "  - test     (adding or updating tests)"
    echo "  - perf     (performance improvements)"
    echo "  - style    (code style changes)"
    echo "  - ci       (CI/CD pipeline changes)"
    echo "  - build    (build system changes)"
    echo ""
    echo "Examples:"
    echo "  ✓ feat: add encryption support for sensitive files"
    echo "  ✓ fix: resolve file permission preservation issue"
    echo "  ✓ feat!: remove deprecated --legacy-mode flag"
    echo "  ✓ docs: update README with encryption examples"
    echo ""
    echo "Rules:"
    echo "  - Use lowercase for type and description"
    echo "  - Use imperative mood (add not added or adds)"
    echo "  - No period at end of description"
    echo "  - Maximum 72 characters"
    echo "  - Title only (no body except BREAKING CHANGE footer)"
    echo ""
    exit 1
fi

# Check title length (72 chars max)
if [ ${#COMMIT_TITLE} -gt 72 ]; then
    echo "❌ ERROR: Commit title exceeds 72 characters"
    echo ""
    echo "Current length: ${#COMMIT_TITLE} characters"
    echo "Title: $COMMIT_TITLE"
    echo ""
    echo "Please shorten your commit message."
    echo ""
    exit 1
fi

# Check if title ends with period
if echo "$COMMIT_TITLE" | grep -q '\.$'; then
    echo "❌ ERROR: Commit title should not end with a period"
    echo ""
    echo "Current: $COMMIT_TITLE"
    echo ""
    exit 1
fi

# Check if description is capitalized (should be lowercase)
DESCRIPTION=$(echo "$COMMIT_TITLE" | sed -E "s/^($ALLOWED_TYPES)(\!)?:\s*//")
FIRST_CHAR="${DESCRIPTION:0:1}"
if [[ "$FIRST_CHAR" =~ [A-Z] ]]; then
    echo "⚠️  WARNING: Commit description should start with lowercase"
    echo ""
    echo "Current: $COMMIT_TITLE"
    echo "Suggested: $(echo "$COMMIT_TITLE" | sed -E "s/: ([A-Z])/: \L\1/")"
    echo ""
    # This is a warning, not an error - allow commit to proceed
fi

# Validate commit body (should be empty except for BREAKING CHANGE footer)
LINE_COUNT=$(echo "$COMMIT_MSG" | wc -l | tr -d ' ')
if [ "$LINE_COUNT" -gt 1 ]; then
    # Check if the body contains only BREAKING CHANGE footer
    BODY=$(echo "$COMMIT_MSG" | tail -n +3)

    if [ -n "$BODY" ] && ! echo "$BODY" | grep -q "^BREAKING CHANGE:"; then
        echo "❌ ERROR: Commit body is not allowed (except BREAKING CHANGE footer)"
        echo ""
        echo "Current commit message:"
        echo "$COMMIT_MSG"
        echo ""
        echo "Constitution requires:"
        echo "  - Title only (no body)"
        echo "  - Footer allowed ONLY for breaking changes: 'BREAKING CHANGE: <description>'"
        echo ""
        echo "If you need to add context, use the PR description instead."
        echo ""
        exit 1
    fi
fi

# All validation passed
exit 0
