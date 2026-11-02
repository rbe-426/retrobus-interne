#define AppName "Inéo RétroBus"
#define AppVersion GetVersionNumbersString("..\src\IneoRbe.Desktop\bin\" + Configuration + "\IneoRbe.Desktop.exe")
#define AppPublisher "RétroBus Essonne"
#define AppExeName "IneoRbe.Desktop.exe"

[Setup]
AppId={{8F989FBD-C81A-47F0-9D03-A7E5F8DDE347}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\RetroBus Essonne\Inéo RétroBus
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
OutputBaseFilename=InéoRétroBus-Setup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
MinVersion=6.1sp1
ArchitecturesInstallIn64BitMode=x64compatible
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

[Registry]
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "IneoRbeDesktop"; ValueData: """{app}\{#AppExeName}"""; Flags: uninsdeletevalue

[Icons]
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"

[Run]
; Sans « skipifsilent » : la mise à jour (installation silencieuse) relance aussi le logiciel. « runasoriginaluser » évite de le lancer avec les droits administrateur de l'installateur.
Filename: "{app}\{#AppExeName}"; Description: "Lancer {#AppName}"; Flags: nowait postinstall runasoriginaluser
