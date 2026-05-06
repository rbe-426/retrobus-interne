# Configuration de l'envoi d'emails

## 📧 Pour envoyer des emails aux participants

### 1. Configuration du serveur SMTP (Backend)

Modifiez le fichier `interne/api/.env` et ajoutez les variables suivantes :

```env
# Configuration SMTP pour l'envoi d'emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-application
EMAIL_FROM=noreply@retrobus-essonne.fr
EMAIL_FROM_NAME=RétroBus Essonne
```

### 2. Configuration Gmail (recommandé)

Si vous utilisez Gmail :

1. **Activer l'authentification à 2 facteurs** sur votre compte Gmail
2. **Créer un mot de passe d'application** :
   - Allez dans https://myaccount.google.com/apppasswords
   - Générez un nouveau mot de passe d'application
   - Utilisez ce mot de passe dans `SMTP_PASS`

### 3. Alternative : Autres fournisseurs SMTP

**SendGrid** :
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=votre-api-key-sendgrid
```

**OVH** :
```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_USER=votre-email@domaine.com
SMTP_PASS=votre-mot-de-passe
```

**Mailtrap** (pour tests) :
```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=votre-username-mailtrap
SMTP_PASS=votre-password-mailtrap
```

### 4. Installation des dépendances

Dans `interne/api`, installez nodemailer si pas déjà fait :

```bash
cd interne/api
npm install nodemailer
```

### 5. Code du service email

Le fichier `interne/api/src/services/emailService.js` doit contenir :

```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const sendConfirmationEmail = async (registration, event) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2563eb;">Inscription confirmée !</h1>
      <p>Bonjour ${registration.participantName},</p>
      <p>Votre inscription à l'événement <strong>${event.title}</strong> a bien été enregistrée.</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #1f2937; margin-top: 0;">Détails de votre inscription</h2>
        <p><strong>Code de validation :</strong> ${registration.validationCode}</p>
        <p><strong>Date :</strong> ${new Date(event.date).toLocaleDateString('fr-FR')}</p>
        <p><strong>Lieu :</strong> ${event.location || 'À préciser'}</p>
        <p><strong>Billets :</strong> ${registration.adultTickets} adulte(s) · ${registration.childTickets} enfant(s)</p>
      </div>
      
      <p>Conservez ce code de validation, il vous sera demandé le jour de l'événement.</p>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        RétroBus Essonne<br>
        <a href="https://retrobus-essonne.fr">retrobus-essonne.fr</a>
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
    to: registration.participantEmail,
    subject: `Confirmation d'inscription - ${event.title}`,
    html: htmlContent
  });
};
```

### 6. Utilisation dans le endpoint

Dans `interne/api/src/server.js`, après la création de la registration :

```javascript
// Après avoir créé la registration
try {
  await sendConfirmationEmail(registration, event);
  console.log('✅ Email de confirmation envoyé à:', registration.participantEmail);
} catch (emailError) {
  console.error('❌ Erreur envoi email:', emailError.message);
  // On ne bloque pas l'inscription si l'email échoue
}
```

### 7. Test de configuration

Créez un script de test `interne/api/test-email.mjs` :

```javascript
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

try {
  const info = await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
    to: 'votre-email-test@example.com',
    subject: 'Test SMTP RétroBus',
    html: '<h1>Test réussi !</h1><p>La configuration SMTP fonctionne correctement.</p>'
  });
  
  console.log('✅ Email envoyé:', info.messageId);
} catch (error) {
  console.error('❌ Erreur:', error.message);
}
```

Lancez le test :
```bash
node test-email.mjs
```

### 8. Variables Railway (Production)

Sur Railway, ajoutez les mêmes variables d'environnement dans la configuration du service API.

## ⚠️ Sécurité

- **Ne jamais commiter** les fichiers `.env` dans git
- Utilisez des **mots de passe d'application** au lieu de mots de passe principaux
- Limitez le **taux d'envoi** pour éviter d'être bloqué par les fournisseurs SMTP

## 📝 Logs

Les emails envoyés sont loggés dans la console du serveur :
- ✅ `Email de confirmation envoyé à: xxx@example.com`
- ❌ `Erreur envoi email: [raison]`
