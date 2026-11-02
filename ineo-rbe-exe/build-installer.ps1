[CmdletBinding()]
param(
  [string]$Configuration = 'Release'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSCommandPath
$project = Join-Path $root 'src\IneoRbe.Desktop\IneoRbe.Desktop.csproj'
$installer = Join-Path $root 'installer\IneoRbe.iss'
$artifacts = Join-Path $root 'artifacts'
$refs = Join-Path $root '.refs\net40'
$lib = Join-Path $root 'lib'

# --- Dépendances de compilation (téléchargées une seule fois, empreinte SHA-256 vérifiée) -------------------------------
function Get-NuGetPackage($id, $version, $sha256) {
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor 3072
  $temp = Join-Path ([IO.Path]::GetTempPath()) ("ineo-" + $id + ".zip")
  Invoke-WebRequest -UseBasicParsing -Uri "https://www.nuget.org/api/v2/package/$id/$version" -OutFile $temp
  $actual = (Get-FileHash -LiteralPath $temp -Algorithm SHA256).Hash.ToLower()
  if ($actual -ne $sha256) { Remove-Item $temp -Force; throw "Empreinte inattendue pour $id $version ($actual) : téléchargement refusé." }
  $folder = Join-Path ([IO.Path]::GetTempPath()) ("ineo-" + $id)
  if (Test-Path $folder) { Remove-Item $folder -Recurse -Force }
  Expand-Archive -LiteralPath $temp -DestinationPath $folder -Force
  Remove-Item $temp -Force
  return $folder
}

# Assemblies de référence .NET 4.0 : compiler contre elles garantit qu'aucune API plus récente que XP SP3 n'est utilisée.
if (-not (Test-Path (Join-Path $refs 'mscorlib.dll'))) {
  Write-Host 'Téléchargement des assemblies de référence .NET 4.0...'
  $package = Get-NuGetPackage 'Microsoft.NETFramework.ReferenceAssemblies.net40' '1.0.3' '54d6e20a1b61caf79395d6d71d091265e81f5a5705ac4ae52af45ca143c3c694'
  New-Item -ItemType Directory -Force -Path (Split-Path $refs) | Out-Null
  Copy-Item (Join-Path $package 'build\.NETFramework\v4.0') $refs -Recurse -Force
  Remove-Item $package -Recurse -Force
}

# Client TLS 1.2 embarqué (Windows XP/Vista ne savent pas négocier TLS 1.2).
if (-not (Test-Path (Join-Path $lib 'BouncyCastle.Crypto.dll'))) {
  Write-Host 'Téléchargement de BouncyCastle (TLS 1.2)...'
  $package = Get-NuGetPackage 'Portable.BouncyCastle' '1.9.0' '18e5cce137534e8756946cc47db305a2b4df4d023f39b2469c564c483e97f04e'
  New-Item -ItemType Directory -Force -Path $lib | Out-Null
  Copy-Item (Join-Path $package 'lib\net40\BouncyCastle.Crypto.dll') $lib -Force
  Remove-Item $package -Recurse -Force
}

# --- Outils -------------------------------------------------------------------------------------------------------------
$msbuildPath = (Get-Command msbuild.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source)
if (-not $msbuildPath) {
  $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
  if (Test-Path $vswhere) {
    $msbuildPath = & $vswhere -latest -products * -requires Microsoft.Component.MSBuild -find 'MSBuild\**\Bin\MSBuild.exe' | Select-Object -First 1
  }
}
if (-not $msbuildPath) {
  throw 'MSBuild est introuvable. Installez Visual Studio Build Tools avec ".NET desktop build tools".'
}

# Inno Setup 5.6.1 obligatoire : la version 6 refuse de produire un installateur pour Windows XP.
$isccCandidates = @(
  (Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 5\ISCC.exe'),
  (Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 5\ISCC.exe'),
  (Join-Path $env:ProgramFiles 'Inno Setup 5\ISCC.exe')
)
$iscc = $isccCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) {
  throw 'Inno Setup 5.6.1 est introuvable. Téléchargez innosetup-5.6.1-unicode.exe sur https://jrsoftware.org/download.php/is.exe?site=1&version=5 (ou https://files.jrsoftware.org/is/5/innosetup-5.6.1-unicode.exe) puis installez-le.'
}

New-Item -ItemType Directory -Force -Path $artifacts | Out-Null

# Le serveur de compilation partagé peut garder un fichier verrouillé (erreur CS2012) : on le désactive.
& $msbuildPath $project "/p:Configuration=$Configuration" '/p:Platform=AnyCPU' '/t:Rebuild' '/nologo' '/v:minimal' '/nodeReuse:false' '/p:UseSharedCompilation=false'
if ($LASTEXITCODE -ne 0) { throw 'La compilation de l''application a échoué.' }

& $iscc "/DConfiguration=$Configuration" "/O$artifacts" $installer
if ($LASTEXITCODE -ne 0) { throw 'La création de l''installateur a échoué.' }

$setupPath = Join-Path $artifacts 'InéoRétroBus-Setup.exe'
$builtExe = Join-Path $root "src\IneoRbe.Desktop\bin\$Configuration\IneoRbe.Desktop.exe"
$assemblyVersion = [System.Reflection.AssemblyName]::GetAssemblyName($builtExe).Version
$releaseVersion = '{0}.{1}.{2}' -f $assemblyVersion.Major, $assemblyVersion.Minor, [Math]::Max(0, $assemblyVersion.Build)
$hash = (Get-FileHash -LiteralPath $setupPath -Algorithm SHA256).Hash.ToLower()

Write-Host ''
Write-Host "Installateur créé : $setupPath"
Write-Host "Version           : $releaseVersion"
Write-Host "SHA-256           : $hash"
Write-Host ''
Write-Host 'Publication : URBEX > Inéo RétroBus > Logiciel > Installateur UC, importez ce fichier avec ce numéro de version.'
Write-Host 'Les UC (y compris sous Windows XP) le téléchargent ensuite depuis le serveur RétroBus : aucune variable Railway à modifier.'
