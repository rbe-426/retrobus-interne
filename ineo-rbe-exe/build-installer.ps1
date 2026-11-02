[CmdletBinding()]
param(
  [string]$Configuration = 'Release'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSCommandPath
$project = Join-Path $root 'src\IneoRbe.Desktop\IneoRbe.Desktop.csproj'
$installer = Join-Path $root 'installer\IneoRbe.iss'
$artifacts = Join-Path $root 'artifacts'

$msbuildPath = (Get-Command msbuild.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source)
if (-not $msbuildPath) {
  $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
  if (Test-Path $vswhere) {
    $msbuildPath = & $vswhere -latest -products * -requires Microsoft.Component.MSBuild -find 'MSBuild\**\Bin\MSBuild.exe' | Select-Object -First 1
  }
}
if (-not $msbuildPath) {
  throw 'MSBuild est introuvable. Installez Visual Studio Build Tools avec ".NET desktop build tools" et le pack de ciblage .NET Framework 4.8.'
}

$isccCandidates = @(
  (Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 6\ISCC.exe'),
  (Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe'),
  (Join-Path $env:ProgramFiles 'Inno Setup 6\ISCC.exe')
)
$iscc = $isccCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) {
  $isccCommand = Get-Command ISCC.exe -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($isccCommand) { $iscc = $isccCommand.Source }
}
if (-not $iscc) {
  throw 'Inno Setup 6 est introuvable (ISCC.exe). Installez-le avec : winget install --id JRSoftware.InnoSetup'
}

New-Item -ItemType Directory -Force -Path $artifacts | Out-Null

# Le serveur de compilation partagé peut garder un fichier verrouillé (erreur CS2012) : on le désactive.
& $msbuildPath $project "/p:Configuration=$Configuration" '/p:Platform=AnyCPU' '/t:Rebuild' '/nologo' '/v:minimal' '/nodeReuse:false' '/p:UseSharedCompilation=false'
if ($LASTEXITCODE -ne 0) { throw 'La compilation de l''application a échoué.' }

& $iscc "/DConfiguration=$Configuration" "/O$artifacts" $installer
if ($LASTEXITCODE -ne 0) { throw 'La création de l''installateur a échoué.' }

$setupPath = Join-Path $artifacts 'InéoRétroBus-Setup.exe'
$builtExe = Join-Path $root "src\IneoRbe.Desktop\bin\$Configuration\IneoRbe.Desktop.exe"
$releaseVersion = ([System.Reflection.AssemblyName]::GetAssemblyName($builtExe).Version | ForEach-Object { '{0}.{1}.{2}' -f $_.Major, $_.Minor, [Math]::Max(0, $_.Build) })
$hash = (Get-FileHash -LiteralPath $setupPath -Algorithm SHA256).Hash.ToLower()

Write-Host ''
Write-Host "Installateur créé : $setupPath"
Write-Host ''
Write-Host 'Valeurs à saisir dans Railway (Variables) pour publier cette version :'
Write-Host "  INEO_RBE_DESKTOP_VERSION=$releaseVersion"
Write-Host "  INEO_RBE_DESKTOP_INSTALLER_SHA256=$hash"
Write-Host '  INEO_RBE_DESKTOP_INSTALLER_URL=<lien direct de la GitHub Release>'
