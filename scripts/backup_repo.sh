#!/bin/bash

# Script to temporarily change git remote origin from swimlane/swimlane-connectors to euphoricsystems,
# pull latest, force-with-lease push, then restore original origin
# Usage: ./backup_repo.sh [repo-name]

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_highlight() {
    echo -e "${MAGENTA}$1${NC}"
}

# Function to restore original origin
restore_origin() {
    if [ ! -z "$ORIGINAL_ORIGIN" ]; then
        print_warning "Restoring original origin to: $ORIGINAL_ORIGIN"
        
        # Clean up any lock files before restoration
        find .git -name "*.lock" -type f -delete 2>/dev/null || true
        
        # Remove current origin (if any)
        git remote remove origin 2>/dev/null || true
        
        # If removal failed, force cleanup
        if git remote | grep -q "^origin$"; then
            git config --unset-all remote.origin.url 2>/dev/null || true
            git config --unset-all remote.origin.fetch 2>/dev/null || true
            git config --remove-section remote.origin 2>/dev/null || true
        fi
        
        git remote add origin "$ORIGINAL_ORIGIN"
        git fetch origin 2>/dev/null || true
        print_info "Origin restored to $SOURCE_ORG organization"
    fi
}

# Set up trap to restore origin on script exit (success or failure)
trap restore_origin EXIT

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI (gh) is not installed!"
    echo "Please install it first: https://cli.github.com/"
    exit 1
fi

# Check if gh is authenticated
if ! gh auth status &>/dev/null; then
    print_error "GitHub CLI is not authenticated!"
    echo "Please run: gh auth login"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "This is not a git repository!"
    exit 1
fi

# Get current repository name from origin or use provided argument
if [ $# -eq 1 ]; then
    REPO_NAME="$1"
    print_info "Using provided repository name: $REPO_NAME"
else
    # Try to extract repo name from current origin
    CURRENT_ORIGIN=$(git remote get-url origin 2>/dev/null || echo "")
    if [ -z "$CURRENT_ORIGIN" ]; then
        print_error "No origin remote found and no repository name provided!"
        echo "Usage: $0 [repo-name]"
        echo "Example: $0 my-repository"
        exit 1
    fi

    # Extract repository name from URL (works with both HTTPS and SSH)
    REPO_NAME=$(echo "$CURRENT_ORIGIN" | sed -E 's/.*[\/:]([^\/]+)\/([^\/]+)(\.git)?$/\2/' | sed 's/\.git$//')
    print_info "Detected repository name: $REPO_NAME"
fi

# Store original origin
ORIGINAL_ORIGIN=$(git remote get-url origin 2>/dev/null || echo "")
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Verify original origin is from swimlane or swimlane-connectors
if [[ "$ORIGINAL_ORIGIN" != *"swimlane"* ]] && [[ "$ORIGINAL_ORIGIN" != *"swimlane-connectors"* ]]; then
    print_warning "Current origin doesn't appear to be from swimlane or swimlane-connectors organization!"
    echo "Current origin: $ORIGINAL_ORIGIN"
    read -p "Do you still want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_info "Operation cancelled"
        exit 0
    fi
fi

# Determine source organization name
if [[ "$ORIGINAL_ORIGIN" == *"swimlane-connectors"* ]]; then
    SOURCE_ORG="swimlane-connectors"
else
    SOURCE_ORG="swimlane"
fi

# Always use SSH for euphoricsystems
NEW_REMOTE_URL="git@github.com:euphoricsystems/${REPO_NAME}.git"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    print_warning "You have uncommitted changes in your working directory!"
    git status --short
    echo ""
    read -p "Do you want to continue anyway? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_info "Operation cancelled - please commit or stash your changes first"
        exit 0
    fi
fi

# Pull latest from source organization first
print_step "Pulling latest changes from $SOURCE_ORG..."
echo "  Remote: $ORIGINAL_ORIGIN"
echo "  Branch: $CURRENT_BRANCH"

if git pull origin "$CURRENT_BRANCH"; then
    print_info "Successfully pulled latest changes from $SOURCE_ORG"
else
    print_warning "Could not pull from $SOURCE_ORG (might be up to date or have conflicts)"
    read -p "Do you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_info "Operation cancelled"
        exit 0
    fi
fi

# Get current commit info for confirmation
CURRENT_COMMIT=$(git rev-parse HEAD)
CURRENT_COMMIT_SHORT=$(git rev-parse --short HEAD)
COMMIT_MESSAGE=$(git log -1 --pretty=%s)
COMMIT_AUTHOR=$(git log -1 --pretty=%an)
COMMIT_DATE=$(git log -1 --pretty=%ar)

# Show detailed confirmation
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
print_highlight "                    PUSH CONFIRMATION REQUIRED"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}FROM:${NC}"
echo "  Organization: ${GREEN}$SOURCE_ORG${NC}"
echo "  Repository:   ${GREEN}$REPO_NAME${NC}"
echo "  Remote URL:   $ORIGINAL_ORIGIN"
echo ""
echo -e "${YELLOW}TO:${NC}"
echo "  Organization: ${RED}euphoricsystems${NC}"
echo "  Repository:   ${RED}$REPO_NAME${NC}"
echo "  Remote URL:   $NEW_REMOTE_URL"
echo ""
echo -e "${YELLOW}WHAT WILL BE PUSHED:${NC}"
echo "  Branch:       ${MAGENTA}$CURRENT_BRANCH${NC}"
echo "  Commit:       $CURRENT_COMMIT_SHORT - $COMMIT_MESSAGE"
echo "  Author:       $COMMIT_AUTHOR"
echo "  Date:         $COMMIT_DATE"
echo "  Full SHA:     $CURRENT_COMMIT"
echo ""
echo -e "${YELLOW}METHOD:${NC}"
echo "  Push Type:    ${CYAN}--force-with-lease${NC} (safer than --force)"
echo "  Description:  Will only force push if remote hasn't changed"
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Confirm the action
read -p "$(echo -e ${YELLOW}Are you SURE you want to push to euphoricsystems? [yes/no]: ${NC})" confirm

if [ "$confirm" != "yes" ]; then
    print_info "Operation cancelled"
    exit 0
fi

# Start the process
print_step "Starting push to euphoricsystems..."

# Remove old origin
print_step "Removing current origin..."

# Clean up any stale git lock files first
if find .git -name "*.lock" -type f 2>/dev/null | grep -q .; then
    print_warning "Found git lock files, cleaning up..."
    find .git -name "*.lock" -type f -delete
fi

# Try to remove origin, with retry logic
if ! git remote remove origin 2>/dev/null; then
    print_warning "Failed to remove origin cleanly, trying alternative approach..."
    
    # Force remove the remote by editing git config
    git config --unset-all remote.origin.url 2>/dev/null || true
    git config --unset-all remote.origin.fetch 2>/dev/null || true
    git config --remove-section remote.origin 2>/dev/null || true
    
    # Clean up remote tracking branches
    print_info "Cleaning up remote tracking branches..."
    git for-each-ref --format='%(refname:short)' refs/remotes/origin | while read ref; do
        git update-ref -d "refs/remotes/origin/${ref#origin/}" 2>/dev/null || true
    done
    
    # Remove the remote refs directory if it exists
    if [ -d ".git/refs/remotes/origin" ]; then
        rm -rf ".git/refs/remotes/origin"
    fi
    
    print_info "Origin removed using fallback method"
fi

# Add euphoricsystems origin
print_step "Adding euphoricsystems origin: $NEW_REMOTE_URL"
git remote add origin "$NEW_REMOTE_URL"

# Check if repository exists in euphoricsystems
print_step "Checking if repository exists in euphoricsystems..."
if ! gh repo view "euphoricsystems/${REPO_NAME}" &>/dev/null; then
    print_warning "Repository euphoricsystems/${REPO_NAME} does not exist"
    echo ""
    read -p "$(echo -e ${YELLOW}Do you want to create it as a private repository? [yes/no]: ${NC})" create_repo
    
    if [ "$create_repo" = "yes" ]; then
        print_step "Creating private repository euphoricsystems/${REPO_NAME}..."
        
        # Get the description from the current repo if it exists
        REPO_DESC=""
        if [ ! -z "$ORIGINAL_ORIGIN" ] && [[ "$ORIGINAL_ORIGIN" == *"github.com"* ]]; then
            # Extract org/repo from URL
            SWIMLANE_REPO=$(echo "$ORIGINAL_ORIGIN" | sed -E 's/.*github\.com[:/]([^/]+\/[^/]+)(\.git)?$/\1/' | sed 's/\.git$//')
            REPO_DESC=$(gh repo view "$SWIMLANE_REPO" --json description -q .description 2>/dev/null || echo "")
        fi
        
        # Create the repository
        if [ -z "$REPO_DESC" ]; then
            if gh repo create "euphoricsystems/${REPO_NAME}" --private --confirm; then
                print_info "Repository created successfully!"
            else
                print_error "Failed to create repository"
                exit 1
            fi
        else
            if gh repo create "euphoricsystems/${REPO_NAME}" --private --description "$REPO_DESC" --confirm; then
                print_info "Repository created successfully with description: $REPO_DESC"
            else
                print_error "Failed to create repository"
                exit 1
            fi
        fi
        
        # Wait a moment for GitHub to fully initialize the repo
        sleep 2
    else
        print_info "Skipping repository creation - push will likely fail"
    fi
else
    print_info "Repository euphoricsystems/${REPO_NAME} already exists"
fi

# Fetch from new origin (might fail if repo doesn't exist yet)
print_step "Fetching from euphoricsystems..."
git fetch origin 2>/dev/null || print_warning "Could not fetch (repository might be empty)"

# Force-with-lease push current branch
print_step "Pushing branch '$CURRENT_BRANCH' to euphoricsystems (using --force-with-lease)..."
if git push --force-with-lease --no-verify --set-upstream origin "$CURRENT_BRANCH"; then
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
    print_highlight "                    ✓ PUSH SUCCESSFUL!"
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
    echo ""
    print_info "Successfully pushed to euphoricsystems/$REPO_NAME"
    print_info "  Commit: $CURRENT_COMMIT_SHORT"
    print_info "  Branch: $CURRENT_BRANCH"
    print_info "  URL: https://github.com/euphoricsystems/$REPO_NAME"

    # Optional: Push all tags
    echo ""
    read -p "Do you also want to push all tags to euphoricsystems? (yes/no): " push_tags
    if [ "$push_tags" = "yes" ]; then
        print_step "Pushing all tags..."
        if git push --tags --no-verify --force-with-lease; then
            print_info "Tags pushed successfully!"
        else
            print_warning "Failed to push some tags (might already exist)"
        fi
    fi
else
    echo ""
    print_error "Failed to push to euphoricsystems!"
    echo ""
    echo "Possible reasons:"
    echo "  1. Repository doesn't exist in euphoricsystems organization"
    echo "  2. You don't have push permissions to euphoricsystems/$REPO_NAME"
    echo "  3. Remote has changes (--force-with-lease protection activated)"
    echo "  4. Authentication credentials are not set up correctly"
    echo ""
    echo "If the remote has changes, you may need to:"
    echo "  - Pull from euphoricsystems first, or"
    echo "  - Use --force instead of --force-with-lease (dangerous!)"
    exit_code=$?
fi

# The trap will automatically restore the origin when the script exits
print_step "Cleaning up..."

# If we had an error, exit with that code
if [ ! -z "$exit_code" ] && [ "$exit_code" -ne 0 ]; then
    exit $exit_code
fi
