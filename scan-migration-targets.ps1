#!/usr/bin/env powershell
# scan-migration-targets.ps1
# Scan for files that need to be migrated to new auth/api system

Write-Host "🔍 Scanning for migration targets..." -ForegroundColor Cyan
Write-Host ""

$srcPath = "src"

# 1. Files with direct localStorage.getItem('token')
Write-Host "❌ Files using localStorage.getItem('token') directly:" -ForegroundColor Red
Get-ChildItem -Path $srcPath -Recurse -Include "*.jsx", "*.js" -Exclude "authService.js", "apiClient.js" | 
  Where-Object { (Get-Content $_ | Select-String "localStorage\.getItem\(['\"]token['\"]" | Measure-Object).Count -gt 0 } |
  ForEach-Object { Write-Host "  - $($_.FullName.Replace((Get-Location).Path + '\', ''))" }

Write-Host ""

# 2. Files importing from auth.js
Write-Host "❌ Files importing from auth.js (should use authService.js):" -ForegroundColor Red
Get-ChildItem -Path $srcPath -Recurse -Include "*.jsx", "*.js" -Exclude "authService.js" |
  Where-Object { (Get-Content $_ | Select-String "from.*['\"].*auth\.js['\"]" | Measure-Object).Count -gt 0 } |
  ForEach-Object { Write-Host "  - $($_.FullName.Replace((Get-Location).Path + '\', ''))" }

Write-Host ""

# 3. Files using fetchJson (should use apiClient)
Write-Host "❌ Files using fetchJson (should use apiClient):" -ForegroundColor Red
Get-ChildItem -Path $srcPath -Recurse -Include "*.jsx", "*.js" -Exclude "apiClient.js" |
  Where-Object { (Get-Content $_ | Select-String "fetchJson" | Measure-Object).Count -gt 0 } |
  ForEach-Object { Write-Host "  - $($_.FullName.Replace((Get-Location).Path + '\', ''))" }

Write-Host ""

# 4. Files using buildPathCandidates
Write-Host "⚠️  Files using buildPathCandidates (deprecated pattern):" -ForegroundColor Yellow
Get-ChildItem -Path $srcPath -Recurse -Include "*.jsx", "*.js" |
  Where-Object { (Get-Content $_ | Select-String "buildPathCandidates" | Measure-Object).Count -gt 0 } |
  ForEach-Object { Write-Host "  - $($_.FullName.Replace((Get-Location).Path + '\', ''))" }

Write-Host ""

# 5. Files using usePermissions + useFunctionPermissions (should consolidate)
Write-Host "⚠️  Files with multiple permission imports:" -ForegroundColor Yellow
Get-ChildItem -Path $srcPath -Recurse -Include "*.jsx", "*.js" -Exclude "usePermissions.unified.js" |
  Where-Object { 
    ((Get-Content $_ | Select-String "usePermissions" | Measure-Object).Count -gt 0) -and
    ((Get-Content $_ | Select-String "useFunctionPermissions" | Measure-Object).Count -gt 0)
  } |
  ForEach-Object { Write-Host "  - $($_.FullName.Replace((Get-Location).Path + '\', ''))" }

Write-Host ""
Write-Host "✅ Migration scan complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Read MIGRATION_GUIDE.md"
Write-Host "2. Start with high-priority files (e.g., AdminFinance.jsx)"
Write-Host "3. Test each file after migration"
Write-Host "4. Push changes incrementally"
