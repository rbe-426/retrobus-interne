/**
 * Validation Schemas for Frontend Data
 * Utilise un système simple de validation sans dépendances externes
 * 
 * Chaque schema a:
 * - validate(data) → {valid, errors}
 * - getSafeData(data) → data sanitized
 */

/**
 * Validation Result Object
 */
class ValidationResult {
  constructor(valid = true, errors = {}) {
    this.valid = valid;
    this.errors = errors; // { field: 'error message' }
    this.fieldCount = Object.keys(errors).length;
  }

  hasError(field) {
    return Boolean(this.errors[field]);
  }

  getError(field) {
    return this.errors[field] || null;
  }

  summary() {
    if (this.valid) return 'Validation réussie';
    return `Erreurs de validation: ${this.fieldCount} champ(s)`;
  }

  getAllErrors() {
    return Object.values(this.errors).filter(Boolean);
  }
}

/**
 * Vehicle Validation Schema
 */
export const vehicleSchema = {
  validate(data) {
    const errors = {};

    // Parc - Requis, format XXX ou XXXX
    if (!data.parc) {
      errors.parc = 'Le parc est requis';
    } else if (!/^\d{3,4}$/.test(data.parc)) {
      errors.parc = 'Le parc doit être 3 ou 4 chiffres';
    }

    // Type - Optionnel mais valider si présent
    if (data.type && !['Bus', 'Voiture', 'Camion', 'Train-Tram'].includes(data.type)) {
      errors.type = 'Type invalide. Doit être: Bus, Voiture, Camion, ou Train-Tram';
    }

    // Marque - Requis
    if (!data.marque || !data.marque.trim()) {
      errors.marque = 'La marque est requise';
    } else if (data.marque.trim().length < 2) {
      errors.marque = 'La marque doit avoir au moins 2 caractères';
    } else if (data.marque.trim().length > 50) {
      errors.marque = 'La marque ne peut pas dépasser 50 caractères';
    }

    // Modèle - Requis
    if (!data.modele || !data.modele.trim()) {
      errors.modele = 'Le modèle est requis';
    } else if (data.modele.trim().length < 2) {
      errors.modele = 'Le modèle doit avoir au moins 2 caractères';
    } else if (data.modele.trim().length > 50) {
      errors.modele = 'Le modèle ne peut pas dépasser 50 caractères';
    }

    // Immatriculation - Optionnel mais valider format si présent
    if (data.immat && !/^[A-Z0-9\-]{4,12}$/.test(data.immat.toUpperCase())) {
      errors.immat = 'Format d\'immatriculation invalide (ex: AB-123-CD)';
    }

    // État - Optionnel
    if (data.etat && !['Neuf', 'Bon', 'Usé', 'Réparation'].includes(data.etat)) {
      errors.etat = 'État invalide';
    }

    // Mise en circulation - Optionnel mais valider format date
    if (data.miseEnCirculation && isNaN(new Date(data.miseEnCirculation).getTime())) {
      errors.miseEnCirculation = 'Date de mise en circulation invalide';
    }

    // Énergie - Optionnel
    if (data.energie && !['Essence', 'Diesel', 'Électrique', 'Hybride', 'GPL', 'Autre'].includes(data.energie)) {
      errors.energie = 'Type d\'énergie invalide';
    }

    // Fuel - Optionnel
    if (data.fuel !== undefined && data.fuel !== null && data.fuel !== '') {
      const fuelNum = Number(data.fuel);
      if (isNaN(fuelNum) || fuelNum < 0 || fuelNum > 1000) {
        errors.fuel = 'Carburant doit être un nombre entre 0 et 1000';
      }
    }

    // Mileage - Optionnel
    if (data.mileage !== undefined && data.mileage !== null && data.mileage !== '') {
      const mileageNum = Number(data.mileage);
      if (isNaN(mileageNum) || mileageNum < 0 || mileageNum > 9999999) {
        errors.mileage = 'Kilométrage doit être un nombre valide';
      }
    }

    // IsPublic - Boolean, optionnel
    if (data.isPublic !== undefined && typeof data.isPublic !== 'boolean' && data.isPublic !== 'true' && data.isPublic !== 'false' && data.isPublic !== '' && data.isPublic !== null) {
      errors.isPublic = 'IsPublic doit être oui ou non';
    }

    // Characteristics - Optionnel, doit être un tableau
    if (data.caracteristiques !== undefined) {
      if (typeof data.caracteristiques === 'string') {
        // Si c'est une chaîne, essayer de parser
        try {
          JSON.parse(data.caracteristiques);
        } catch (e) {
          errors.caracteristiques = 'Format de caractéristiques invalide';
        }
      } else if (Array.isArray(data.caracteristiques)) {
        // Vérifier chaque caractéristique
        const invalidChars = data.caracteristiques.some((char, idx) => {
          if (!char.label || !String(char.label).trim()) {
            errors.caracteristiques = `Caractéristique ${idx + 1}: label requis`;
            return true;
          }
          if (String(char.label).trim().length > 100) {
            errors.caracteristiques = `Caractéristique ${idx + 1}: label trop long (max 100 chars)`;
            return true;
          }
          if (String(char.value).length > 500) {
            errors.caracteristiques = `Caractéristique ${idx + 1}: valeur trop longue (max 500 chars)`;
            return true;
          }
          return false;
        });
      }
    }

    const valid = Object.keys(errors).length === 0;
    return new ValidationResult(valid, errors);
  },

  getSafeData(data) {
    return {
      parc: String(data.parc || '').trim(),
      type: data.type ? String(data.type).trim() : undefined,
      marque: String(data.marque || '').trim(),
      modele: String(data.modele || '').trim(),
      immat: data.immat ? String(data.immat || '').trim().toUpperCase() : undefined,
      etat: data.etat ? String(data.etat).trim() : undefined,
      miseEnCirculation: data.miseEnCirculation || undefined,
      energie: data.energie ? String(data.energie).trim() : undefined,
      fuel: data.fuel !== undefined && data.fuel !== '' && data.fuel !== null ? Number(data.fuel) : undefined,
      mileage: data.mileage !== undefined && data.mileage !== '' && data.mileage !== null ? Number(data.mileage) : undefined,
      isPublic: data.isPublic ? Boolean(data.isPublic === true || data.isPublic === 'true') : false,
      caracteristiques: data.caracteristiques ? (Array.isArray(data.caracteristiques) ? JSON.stringify(data.caracteristiques) : data.caracteristiques) : undefined,
      thumbnailImage: data.thumbnailImage || undefined,
      backgroundImage: data.backgroundImage || undefined,
      gallery: Array.isArray(data.gallery) ? data.gallery : undefined,
    };
  }
};

/**
 * Generic validation error handler
 * Affiche un toast avec le premier erreur
 */
export function showValidationErrors(validationResult, toast) {
  if (validationResult.valid) return;

  const firstError = Object.values(validationResult.errors)[0];
  if (toast && firstError) {
    toast({
      status: 'error',
      title: 'Erreurs de validation',
      description: firstError,
      duration: 4000,
      isClosable: true,
    });
  }

  return validationResult;
}

/**
 * Validation pour les Caractéristiques
 */
export const caracteristiquesSchema = {
  validate(data) {
    const errors = {};

    if (!Array.isArray(data)) {
      errors.root = 'Les caractéristiques doivent être un tableau';
      return new ValidationResult(false, errors);
    }

    data.forEach((char, idx) => {
      if (!char.label || !String(char.label).trim()) {
        errors[`char_${idx}_label`] = `Caractéristique ${idx + 1}: label requis`;
      } else if (String(char.label).trim().length > 100) {
        errors[`char_${idx}_label`] = `Caractéristique ${idx + 1}: label trop long (max 100)`;
      }

      if (String(char.value || '').length > 500) {
        errors[`char_${idx}_value`] = `Caractéristique ${idx + 1}: valeur trop longue (max 500)`;
      }
    });

    const valid = Object.keys(errors).length === 0;
    return new ValidationResult(valid, errors);
  }
};

/**
 * Email validation
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).toLowerCase());
}

/**
 * URL validation
 */
export function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Base64 image validation
 */
export function isValidBase64Image(base64String) {
  if (!base64String) return false;
  if (!base64String.startsWith('data:image/')) return false;
  if (!base64String.includes(';base64,')) return false;
  return true;
}
