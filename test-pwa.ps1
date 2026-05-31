# Script PowerShell pour tester la configuration PWA
# Usage: .\test-pwa.ps1

Write-Host "Test de la configuration PWA - RetroBus Essonne" -ForegroundColor Cyan
Write-Host ""

$publicDir = "C:\Dev\RETROBUS_ESSONNE\interne\public"

# Verifier les fichiers essentiels
Write-Host "Verification des fichiers..." -ForegroundColor Yellow
Write-Host ""

$files = @(
    @{ Path = "$publicDir\manifest.json"; Name = "manifest.json" },
    @{ Path = "$publicDir\service-worker.js"; Name = "service-worker.js" },
    @{ Path = "$publicDir\icons\icon-192.png"; Name = "icon-192.png" },
    @{ Path = "$publicDir\icons\icon-512.png"; Name = "icon-512.png" },
    @{ Path = "$publicDir\icons\icon-maskable-512.png"; Name = "icon-maskable-512.png" }
)

$allGood = $true

foreach ($file in $files) {
    if (Test-Path $file.Path) {
        $size = (Get-Item $file.Path).Length
        $sizeKB = [math]::Round($size / 1KB, 2)
        Write-Host "   [OK] $($file.Name) - $sizeKB Ko" -ForegroundColor Green
    } else {
        Write-Host "   [ERREUR] $($file.Name) - MANQUANT" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host ""

# Verifier le contenu du manifest
Write-Host "Verification du manifest..." -ForegroundColor Yellow

if (Test-Path "$publicDir\manifest.json") {
    $manifest = Get-Content "$publicDir\manifest.json" -Raw | ConvertFrom-Json
    
    Write-Host "   Nom: $($manifest.name)" -ForegroundColor Gray
    Write-Host "   Nom court: $($manifest.short_name)" -ForegroundColor Gray
    Write-Host "   Display: $($manifest.display)" -ForegroundColor Gray
    Write-Host "   Theme color: $($manifest.theme_color)" -ForegroundColor Gray
    Write-Host "   Background: $($manifest.background_color)" -ForegroundColor Gray
    Write-Host "   Icones: $($manifest.icons.Count)" -ForegroundColor Gray
    
    if ($manifest.theme_color -eq "#d30c4c" -and $manifest.background_color -eq "#0f172a") {
        Write-Host "   [OK] Couleurs correctes" -ForegroundColor Green
    } else {
        Write-Host "   [ATTENTION] Couleurs non conformes" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [ERREUR] manifest.json introuvable" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# Verifier index.html
Write-Host "Verification de index.html..." -ForegroundColor Yellow

$indexPath = "C:\Dev\RETROBUS_ESSONNE\interne\index.html"
if (Test-Path $indexPath) {
    $indexContent = Get-Content $indexPath -Raw
    
    $checks = @(
        @{ Tag = 'rel="manifest"'; Name = "Manifest link" },
        @{ Tag = 'name="theme-color"'; Name = "Theme color" },
        @{ Tag = 'name="apple-mobile-web-app-capable"'; Name = "iOS capable" },
        @{ Tag = 'rel="apple-touch-icon"'; Name = "Apple touch icon" }
    )
    
    foreach ($check in $checks) {
        if ($indexContent -match [regex]::Escape($check.Tag)) {
            Write-Host "   [OK] $($check.Name)" -ForegroundColor Green
        } else {
            Write-Host "   [ERREUR] $($check.Name) - MANQUANT" -ForegroundColor Red
            $allGood = $false
        }
    }
} else {
    Write-Host "   [ERREUR] index.html introuvable" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# Verifier main.jsx
Write-Host "Verification de main.jsx..." -ForegroundColor Yellow

$mainPath = "C:\Dev\RETROBUS_ESSONNE\interne\src\main.jsx"
if (Test-Path $mainPath) {
    $mainContent = Get-Content $mainPath -Raw
    
    if ($mainContent -match "serviceWorker" -and $mainContent -match "service-worker.js") {
        Write-Host "   [OK] Service Worker enregistre" -ForegroundColor Green
    } else {
        Write-Host "   [ERREUR] Service Worker non enregistre" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "   [ERREUR] main.jsx introuvable" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Gray
Write-Host ""

if ($allGood) {
    Write-Host "[OK] Configuration PWA complete !" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaines etapes:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   1. Demarrer le serveur:" -ForegroundColor White
    Write-Host "      cd C:\Dev\RETROBUS_ESSONNE\interne" -ForegroundColor Gray
    Write-Host "      npm run dev" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   2. Ouvrir dans le navigateur:" -ForegroundColor White
    Write-Host "      http://localhost:5173" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   3. Verifier dans la console:" -ForegroundColor White
    Write-Host "      Service Worker enregistre: ..." -ForegroundColor Gray
    Write-Host ""
    Write-Host "   4. Tester sur mobile:" -ForegroundColor White
    Write-Host "      Deployer en HTTPS puis:" -ForegroundColor Gray
    Write-Host "      - Android: Menu > Ajouter a l'ecran d'accueil" -ForegroundColor Gray
    Write-Host "      - iPhone: Partager > Sur l'ecran d'accueil" -ForegroundColor Gray
} else {
    Write-Host "[ERREUR] Configuration PWA incomplete" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifier les fichiers manquants ci-dessus" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Documentation complete: PWA_CONFIGURATION.md" -ForegroundColor Cyan
Write-Host ""
