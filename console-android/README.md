# Console RétroBus (APK)

Application Android native (Kotlin, `minSdk 29`, cible Android 15 : Galaxy A17 5G) du pupitre conducteur. Référence d'interface : [`../docs/CONSOLE_MOBILE_REFERENCE.md`](../docs/CONSOLE_MOBILE_REFERENCE.md).

## État

Socle uniquement : activation par IMEI puis écran d'accueil (véhicule, UC associé, révision de contenu). Aucun outil Android n'a servi à compiler ce projet pour le moment (pas de JDK/SDK sur le poste de développement).

## Compiler

1. Installer Android Studio (JDK 17 et SDK 35 inclus), ouvrir ce dossier.
2. Laisser Gradle synchroniser, puis `Build > Build APK(s)`.

## Règle d'activation

- La console envoie son IMEI à `POST /api/ineo-rbe-desktop/console/activate`.
- Le serveur ne l'accepte que si l'IMEI est rattaché à un véhicule **ayant un UC associé** (profil véhicule, champ `consoleImei`). La réponse est identique pour un IMEI inconnu et pour un véhicule sans UC.
- Android 10+ interdit aux applications ordinaires de lire l'IMEI : sauf appareil géré (propriétaire d'appareil/MDM), l'IMEI est saisi une fois à l'activation (`*#06#`) puis mémorisé. Le serveur enregistre aussi `ANDROID_ID`, le modèle et la version.

## Suite prévue

Champ « IMEI console » dans le profil véhicule de l'URBEX, synchronisation du contenu (annonces, écrans) via l'UC, messagerie et maintenance.
