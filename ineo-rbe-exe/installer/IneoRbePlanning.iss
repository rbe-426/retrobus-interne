; Installateur Inéo RétroBus Planification (PC de l'exploitation) — Inno Setup 5.6.1, compatible Windows XP SP3.
#define AppName "Inéo RétroBus Planification"
#define AppVersion GetFileVersion("..\src\IneoRbe.Planning\bin\" + Configuration + "\IneoRbe.Planning.exe")
#define AppPublisher "RétroBus Essonne"
#define AppExeName "IneoRbe.Planning.exe"

[Setup]
AppId={{C4E8A1D7-6B92-4F30-9D5A-3E7B1F0C8A24}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={pf}\RetroBus Essonne\Inéo RétroBus Planification
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
OutputBaseFilename=InéoRétroBus-Planification-Setup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
MinVersion=0,5.1sp3
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\{#AppExeName}
CloseApplications=yes

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Dirs]
Name: "{commonappdata}\IneoRbePlanning"; Permissions: users-modify

[Files]
Source: "..\src\IneoRbe.Planning\bin\{#Configuration}\IneoRbe.Planning.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\src\IneoRbe.Planning\bin\{#Configuration}\IneoRbe.Planning.exe.config"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\src\IneoRbe.Planning\bin\{#Configuration}\BouncyCastle.Crypto.dll"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{commondesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Lancer {#AppName}"; Flags: nowait postinstall runasoriginaluser

[Code]
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
    MsgBox('Inéo RétroBus Planification nécessite le Microsoft .NET Framework 4.0 (ou plus récent), qui n''est pas installé sur ce PC.' + #13#10#13#10 +
           'Installez-le (gratuit, compatible Windows XP SP3), puis relancez cet installateur.',
           mbError, MB_OK);
end;
