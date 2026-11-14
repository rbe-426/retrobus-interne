# Console RétroBus (APK)

Application Android native (Kotlin, `minSdk 29`, cible Android 15 : Galaxy A17 5G) du pupitre conducteur. Référence d'interface : [`../docs/CONSOLE_MOBILE_REFERENCE.md`](../docs/CONSOLE_MOBILE_REFERENCE.md).

## État

Pupitre conducteur : activation par IMEI, connexion par matricule (5 chiffres) + code, prise de service, écran de course. Disposition verrouillée (barres d'état et de navigation masquées) et textes proportionnels à l'écran du téléphone (`UiScale`).

**La console ne parle qu'à l'UC du véhicule** (HTTP, port TCP 47801, trouvé par balayage du sous-réseau local) : connexion, service courant, démarrage, course suivante, fin, position. L'UC reçoit services et conducteurs du serveur et lui remonte les événements. Matricule et code se gèrent dans le Gestionnaire (Conducteurs). Les messages flash et le marquage d'arrêt (Stop by Stop) ne sont plus disponibles dans la console.

## Compiler

`gradlew assembleDebug` avec le JDK d'Android Studio (`JAVA_HOME=...\Android Studio\jbr`) et le SDK 35.

## Règle d'activation

- La console envoie son IMEI à `POST /api/ineo-rbe-desktop/console/activate`.
- Le serveur ne l'accepte que si l'IMEI est rattaché à un véhicule **ayant un UC associé** (profil véhicule, champ `consoleImei`). La réponse est identique pour un IMEI inconnu et pour un véhicule sans UC.
- Android 10+ interdit aux applications ordinaires de lire l'IMEI : sauf appareil géré (propriétaire d'appareil/MDM), l'IMEI est saisi une fois à l'activation (`*#06#`) puis mémorisé. Le serveur enregistre aussi `ANDROID_ID`, le modèle et la version.

## Suite prévue

Champ « IMEI console » dans le profil véhicule de l'URBEX, synchronisation du contenu (annonces, écrans) via l'UC, messagerie et maintenance.
