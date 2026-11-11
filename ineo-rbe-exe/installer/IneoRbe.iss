; Installateur Inéo RétroBus — compilé avec Inno Setup 5.6.1 (dernière version compatible Windows XP).
; Les constantes {pf} / GetFileVersion sont celles de la version 5 ; la version 6 refuse de cibler XP.
#define AppName "Inéo RétroBus"
#define AppVersion GetFileVersion("..\src\IneoRbe.Desktop\bin\" + Configuration + "\IneoRbe.Desktop.exe")
#define AppPublisher "RétroBus Essonne"
#define AppExeName "IneoRbe.Desktop.exe"

[Setup]
AppId={{8F989FBD-C81A-47F0-9D03-A7E5F8DDE347}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={pf}\RetroBus Essonne\Inéo RétroBus
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
OutputBaseFilename=InéoRétroBus-Setup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
; Windows XP SP3 minimum (Windows 9x/Me exclus).
MinVersion=0,5.1sp3
; Windows 64 bits : installation en mode 64 bits, comme les versions 1.0.2 et antérieures (même dossier, même clé de démarrage).
; Sans cette ligne, une mise à jour créerait une 2e copie dans « Program Files (x86) » et un 2e démarrage automatique.
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\{#AppExeName}
CloseApplications=yes

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Dirs]
; Configuration SAEIV (sons, images) partagée par tous les comptes Windows du poste.
Name: "{commonappdata}\IneoRbe"; Permissions: users-modify

[Files]
Source: "..\src\IneoRbe.Desktop\bin\{#Configuration}\IneoRbe.Desktop.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\src\IneoRbe.Desktop\bin\{#Configuration}\IneoRbe.Desktop.exe.config"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\src\IneoRbe.Desktop\bin\{#Configuration}\BouncyCastle.Crypto.dll"; DestDir: "{app}"; Flags: ignoreversion
; Installateurs Infovox (voix embarquées) : uniquement le moteur et son Service Pack ; la licence est saisie à l'installation.
Source: "..\voix\Infovox Desktop v2.2 Engine.exe"; DestDir: "{app}\voix"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\voix\Infovox Desktop v2.210 Service Pack 1.exe"; DestDir: "{app}\voix"; Flags: ignoreversion skipifsourcedoesntexist

[Tasks]
Name: "infovox"; Description: "Installer les voix embarquées Infovox (annonces vocales de l'UC)"; Check: InfovoxMissing

[Registry]
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "IneoRbeDesktop"; ValueData: """{app}\{#AppExeName}"""; Flags: uninsdeletevalue

[Icons]
Name: "{commondesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"

[Run]
; Ouvre le port de maintenance (TCP 47800) : Vista et plus = règle avancée ; XP = ouverture de port du pare-feu Windows.
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall add rule name=""Inéo RétroBus Maintenance"" dir=in action=allow protocol=TCP localport=47800 profile=any"; Flags: runhidden; MinVersion: 0,6.0
Filename: "{sys}\netsh.exe"; Parameters: "firewall add portopening protocol=TCP port=47800 name=""Inéo RétroBus Maintenance"" mode=ENABLE scope=ALL"; Flags: runhidden; OnlyBelowVersion: 0,6.0
; Infovox : moteur (assistant), puis Service Pack 1 en silencieux. Sans effet si la tâche n'est pas cochée (ou en mise à jour silencieuse).
Filename: "{app}\voix\Infovox Desktop v2.2 Engine.exe"; Description: "Installation d'Infovox"; StatusMsg: "Installation du moteur vocal Infovox…"; Flags: waituntilterminated skipifdoesntexist; Tasks: infovox; Check: InfovoxMissing
Filename: "{app}\voix\Infovox Desktop v2.210 Service Pack 1.exe"; Parameters: "/SILENT /NORESTART"; StatusMsg: "Mise à jour d'Infovox (Service Pack 1)…"; Flags: waituntilterminated skipifdoesntexist; Tasks: infovox
; Sans « skipifsilent » : la mise à jour (installation silencieuse) relance aussi le logiciel. « runasoriginaluser » évite
; de le lancer avec les droits administrateur de l'installateur.
Filename: "{app}\{#AppExeName}"; Description: "Lancer {#AppName}"; Flags: nowait postinstall runasoriginaluser

[UninstallRun]
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""Inéo RétroBus Maintenance"""; Flags: runhidden; MinVersion: 0,6.0
Filename: "{sys}\netsh.exe"; Parameters: "firewall delete portopening protocol=TCP port=47800"; Flags: runhidden; OnlyBelowVersion: 0,6.0

[Code]
function InfovoxMissing(): Boolean;
begin
  Result := not (DirExists(ExpandConstant('{pf32}\Acapela Group\Infovox Desktop 2.2')) or DirExists(ExpandConstant('{pf}\Acapela Group\Infovox Desktop 2.2')));
end;
// .NET Framework 4.0 (ou plus récent) est indispensable ; il n'est pas préinstallé sur Windows XP.
function DotNet4Installed(): Boolean;
var
  Installed: Cardinal;
begin
  Result := RegQueryDWordValue(HKLM, 'SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full', 'Install', Installed) and (Installed = 1);
  if not Result and IsWin64 then
    Result := RegQueryDWordValue(HKLM64, 'SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full', 'Install', Installed) and (Installed = 1);
  if not Result then
    Result := RegQueryDWordValue(HKLM, 'SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Client', 'Install', Installed) and (Installed = 1);
end;

function InitializeSetup(): Boolean;
begin
  Result := DotNet4Installed();
  if not Result then
    MsgBox('Inéo RétroBus nécessite le Microsoft .NET Framework 4.0 (ou plus récent), qui n''est pas installé sur ce PC.' + #13#10#13#10 +
           'Installez-le (« Microsoft .NET Framework 4 », gratuit, compatible Windows XP SP3), puis relancez cet installateur.',
           mbError, MB_OK);
end;
