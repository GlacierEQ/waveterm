#!/bin/bash

# Comprehensive Disk Space Cleanup Script
# Run this regularly to prevent disk full issues

echo "🧹 COMPREHENSIVE DISK CLEANUP"
echo "============================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "📊 Before cleanup:"
df -h | grep '/dev/disk1s5s1'

echo ""
echo "🧹 Starting cleanup..."

# 1. Clear npm caches
info "Clearing npm caches..."
npm cache clean --force 2>/dev/null || true
rm -rf ~/.npm/_cacache 2>/dev/null || true
success "npm caches cleared"

# 2. Clear project caches
info "Clearing project caches..."
rm -rf node_modules/.cache .cache dist build coverage .nyc_output 2>/dev/null || true
find . -name "*.log" -delete 2>/dev/null || true
find . -name ".DS_Store" -delete 2>/dev/null || true
success "Project caches cleared"

# 3. Clear user caches
info "Clearing user caches..."
rm -rf ~/Library/Caches/* 2>/dev/null || true
rm -rf ~/Library/Caches/com.apple.Safari 2>/dev/null || true
rm -rf ~/Library/Caches/Google 2>/dev/null || true
success "User caches cleared"

# 4. Clear system caches (safe ones)
info "Clearing system caches..."
rm -rf ~/Library/Developer/Xcode/DerivedData 2>/dev/null || true
success "System caches cleared"

# 5. Git optimization
info "Optimizing git repositories..."
find ~ -name ".git" -type d 2>/dev/null | while read gitdir; do
    (cd "$gitdir/.." && git gc --aggressive --prune=now 2>/dev/null && echo "Optimized: $gitdir")
done
success "Git repositories optimized"

# 6. Clear temporary files
info "Clearing temporary files..."
rm -rf /tmp/* 2>/dev/null || true
rm -rf ~/tmp/* 2>/dev/null || true
success "Temporary files cleared"

# 7. Clear Downloads cache files
info "Clearing Downloads cache..."
find ~/Downloads -name "*.tmp" -o -name "*.cache" -o -name "*.temp" -delete 2>/dev/null || true
success "Downloads cache cleared"

echo ""
echo "📊 After cleanup:"
df -h | grep '/dev/disk1s5s1'

echo ""
echo "🧼 CLEANUP COMPLETE!"
echo "==================="
echo ""
echo "💡 To prevent future issues:"
echo "   • Run this script weekly: ./cleanup-disk-space.sh"
echo "   • Monitor space: df -h"
echo "   • Clear caches after large builds"
echo "   • Remove old downloads regularly"
echo ""
success "Disk space optimized!"
