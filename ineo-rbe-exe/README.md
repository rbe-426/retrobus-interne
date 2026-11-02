# Inéo RétroBus embarqué

Application Windows embarquée destinée aux ordinateurs installés dans les bus RétroBus Essonne.

## Compatibilité et fonctionnement

- **Windows XP SP3 à Windows 11** (32 et 64 bits) ;
- **.NET Framework 4.0 minimum** (dernière version installable sur XP ; déjà présent ou installable sur Windows 7 et plus récent). L'installateur vérifie sa présence ;
- interface locale minimaliste ;
- vérification de l'accès Internet et des mises à jour au démarrage ;
- démarrage automatique pour tous les utilisateurs du poste ;
- installateur Inno Setup 5.6.1 (compatible XP) avec désinstallation propre ;
- connexion sécurisée **TLS 1.2 embarquée** (BouncyCastle) pour les Windows qui ne la gèrent pas (XP, Vista) : le serveur est validé avec les racines Let's Encrypt (ISRG Root X1/X2) intégrées au programme, sans vérification de révocation, et seul le serveur RétroBus est joignable dans ce mode.

Sur Windows 7 et plus récent avec .NET 4.5+, le chiffrement du système est utilisé. Sur XP/Vista, ou si Windows refuse TLS 1.2, le logiciel bascule seul sur le client embarqué (affiché sur la page « Ce poste »).

Le programme ne télécharge jamais un exécutable sans que son empreinte SHA-256, publiée par l'API Railway, corresponde à l'empreinte du fichier téléchargé.

## Identité du poste (UC) et profil véhicule

L'ordinateur embarqué s'appelle un **UC**. À chaque démarrage (et dès que la connexion revient), le logiciel :

1. lit le **numéro de série (SN)** de l'ordinateur via WMI (BIOS, puis carte mère, puis produit) ; les valeurs génériques des constructeurs (« To Be Filled By O.E.M. », « Default string »…) sont refusées car elles ne distinguent pas deux ordinateurs ;
2. envoie ce SN à l'API Railway (`POST /api/ineo-rbe-desktop/identify`) ;
3. affiche le **profil du véhicule** auquel l'UC est rattaché (ex. « Profil 920 ») et le conserve en cache local pour fonctionner sans Internet.

Côté URBEX (**Inéo RétroBus > Profils véhicules**), chaque profil porte le **N° IMEI** (boîtier GPS) et le **N° de série UC**. Un UC qui s'identifie pour la première fois apparaît dans la liste **UC détectés** : il suffit de le rattacher au véhicule voulu, puis de cliquer sur « Actualiser le profil » sur l'UC.

## Profils écrans, simulateur et véhicule pilote

**Profils écrans (URBEX > Inéo RétroBus > Profils écrans).** Un profil regroupe les écrans d'un véhicule : pour chacun, son **emplacement** (girouette avant/latérale/arrière, intérieur avant/milieu/arrière, libre), sa **position** sur le plan du véhicule (glisser-déposer), sa **taille** (largeur sur le plan + résolution en pixels) et ses deux images (**perte de connexion** / **média si connecté**, 6 Mo max, PNG/JPEG/GIF/WebP, stockées sur le serveur). Le profil se rattache à un véhicule dans **Profils véhicules**.

**Simulateur d'écrans (logiciel UC > Config SAEIV).** Le logiciel récupère le profil écran de son véhicule et ses images, les conserve localement (utilisables hors connexion) et les affiche sur un plan. Il bascule seul entre l'image « connecté » et l'image « perte de connexion » selon l'état du réseau. Un double-clic sur un écran l'ouvre dans une fenêtre à son ratio réel ; « Mire de test » affiche une mire de couleur pendant 60 s.

**Synchronisation.** Le logiciel interroge `POST /api/ineo-rbe-desktop/sync` (toutes les 60 s, 15 s pour le véhicule pilote) : profil du véhicule, profil écran (révision) et commandes. L'URBEX voit en retour la version du logiciel, l'état du réseau du PC et si le profil écran est à jour. L'ancienne route `identify` reste disponible pour les logiciels déjà installés.

**Véhicule pilote (URBEX > Inéo RétroBus > Véhicule pilote).** Borne de test propre à Inéo (hors parc RBE), identifiée par le **numéro de série du PC pilote** (différent des UC rattachés aux véhicules). L'URBEX affiche son état (en ligne, version, dernière connexion, réseau, profil écran à jour) et son aperçu en temps réel, et permet d'envoyer des commandes : vérifier/installer la mise à jour, recharger le profil et les écrans, jouer une annonce de test, afficher une mire de test. Les commandes sont exécutées à la prochaine synchronisation du PC pilote et expirent après 10 minutes.

> Test local : définir la variable d'environnement `INEO_RBE_API_BASE` (par exemple `http://127.0.0.1:3999/api/ineo-rbe-desktop`) fait pointer le logiciel vers un serveur local. Seules les adresses `http://` de la machine elle-même sont acceptées.

## Config SAEIV

L'onglet **Config SAEIV** regroupe deux sous-onglets, dans une interface volontairement « Windows classique » :

### Configuration annonces sonores

- Une annonce = un nom, un fichier son (`wav`, `mp3`, `wma`, 50 Mo max), un point GPS (latitude / longitude) et une variable de déclenchement :
  - **Position GPS** : l'annonce se diffuse quand le bus entre dans le rayon du point ;
  - **Pré-annonce** : l'annonce se diffuse X mètres avant le point.
- Le bouton **Écouter** permet de tester le son sans attendre le GPS.
- La case **Diffuser les annonces automatiquement** démarre la lecture selon la position GPS. Deux sources, au choix (`Automatique` par défaut) :
  - **Localisation Windows** (Windows 7 et plus récent) ;
  - **Port série** (obligatoire sous XP/Vista) : lecture d'un récepteur GPS USB/série qui émet des phrases NMEA 0183 (GGA/RMC, somme de contrôle vérifiée). Port `AUTO` = détection du port qui répond, sinon COMx et vitesse (4800 à 115200 bauds) à choisir. Une annonce ne se rejoue qu'après que le bus s'est éloigné du point.
- Plusieurs annonces déclenchées en même temps sont lues l'une après l'autre.

### Configurations d'écrans

Pour chaque écran SAEIV : un nom, une **image de perte de connexion** (affichée sans Internet) et un **média/image si connecté**. L'aperçu met en gras l'image qui serait diffusée avec l'état réseau actuel. Pour l'instant, seules des images sont importables (`png`, `jpg`, `bmp`, `gif`, 20 Mo max). La diffusion effective sur les écrans sera ajoutée ultérieurement.

### Stockage

La configuration est enregistrée dans `C:\ProgramData\IneoRbe\` (`saeiv-config.json`, dossiers `sounds`, `screens` et `media`), partagée par tous les comptes Windows du poste, et conservée lors d'une mise à jour ou d'une désinstallation.

## Compiler l'installateur

1. Installer **Visual Studio Build Tools** avec la charge de travail « .NET desktop build tools ».
2. Installer **Inno Setup 5.6.1** (`innosetup-5.6.1-unicode.exe` sur https://files.jrsoftware.org/is/5/) : la version 6 refuse de produire un installateur pour XP.
3. Ouvrir PowerShell dans ce dossier puis exécuter :

```powershell
powershell -ExecutionPolicy Bypass -File .\build-installer.ps1
```

Le script télécharge une fois, avec vérification de leur empreinte SHA-256, les assemblies de référence .NET 4.0 (`.refs\`) et BouncyCastle (`lib\`). Compiler contre les assemblies 4.0 garantit qu'aucune API plus récente que XP n'est utilisée. Il affiche à la fin la version et l'empreinte de l'installateur, créé dans `artifacts\InéoRétroBus-Setup.exe`.

## Publier une mise à jour

1. Incrémenter `AssemblyVersion` et `AssemblyFileVersion` dans `src\IneoRbe.Desktop\Properties\AssemblyInfo.cs`.
2. Compiler l'installateur (voir ci-dessus).
3. Dans l'URBEX : **Inéo RétroBus > Logiciel > Installateur UC**, importer le fichier avec son numéro de version (et des notes facultatives).
4. Ajouter une entrée au journal des modifications (`/api/changelog`).

Aucune variable Railway n'est nécessaire : l'API propose la version la plus récente de l'URBEX et la sert elle-même (`GET /api/ineo-rbe-desktop/installer/:id`), ce qui est indispensable pour les Windows anciens qui ne peuvent joindre que le serveur RétroBus. Les variables `INEO_RBE_DESKTOP_*` (installateur hébergé ailleurs, par exemple une GitHub Release) restent prises en compte : la version la plus récente l'emporte, et à version égale celle de l'URBEX.

L'application interroge `GET /api/ineo-rbe-desktop/update`, compare la version reçue avec la sienne et active le bouton **Mettre à jour** seulement si une version plus récente existe. Elle vérifie l'empreinte SHA-256 du fichier téléchargé avant de le lancer, et se relance seule après l'installation, réussie ou non.

> Mise à jour depuis une version installée avec un ancien installateur (Inno 6) : même identifiant d'application et même dossier, l'installation se fait par-dessus. Ne désactivez pas `ArchitecturesInstallIn64BitMode` dans `installer\IneoRbe.iss`, sinon une 2e copie serait créée dans `Program Files (x86)`.