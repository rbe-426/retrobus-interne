#!/usr/bin/env bash
# scan-migration-targets.sh
# Scan for files needing migration

echo "🔍 Scanning for migration targets..."
echo ""

echo "❌ Files with localStorage.getItem('token'):"
grep -r "localStorage\.getItem.*token" src --include="*.jsx" --include="*.js" 2>/dev/null | cut -d: -f1 | sort | uniq

echo ""
echo "❌ Files importing from auth.js (use authService.js):"
grep -r "from.*auth\.js" src --include="*.jsx" --include="*.js" 2>/dev/null | cut -d: -f1 | sort | uniq

echo ""
echo "❌ Files using fetchJson (use apiClient):"
grep -r "fetchJson" src --include="*.jsx" --include="*.js" 2>/dev/null | cut -d: -f1 | sort | uniq | grep -v apiClient.js

echo ""
echo "⚠️  Files using buildPathCandidates:"
grep -r "buildPathCandidates" src --include="*.jsx" --include="*.js" 2>/dev/null | cut -d: -f1 | sort | uniq

echo ""
echo "✅ Migration scan complete!"
