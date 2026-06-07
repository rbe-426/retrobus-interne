/**
 * helloAssoParser.js
 * Utilitaire pour parser les liens et iframes HelloAsso
 * Extrait automatiquement les informations d'événement
 */

/**
 * Extraire l'URL de l'iframe HelloAsso depuis le code HTML
 * @param {string} iframeHtml - Code HTML de l'iframe HelloAsso
 * @returns {string|null} - URL extraite ou null
 */
export function extractUrlFromIframe(iframeHtml) {
  if (!iframeHtml) return null;
  
  // Rechercher l'attribut src dans l'iframe
  const srcMatch = iframeHtml.match(/src=["']([^"']+)["']/i);
  if (srcMatch && srcMatch[1]) {
    return srcMatch[1];
  }
  
  return null;
}

/**
 * Normaliser une entrée HelloAsso (URL ou snippet iframe)
 * @param {string} rawInput - Valeur collée par l'utilisateur
 * @returns {string|null} - URL normalisée
 */
export function normalizeHelloAssoInput(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null;

  let value = rawInput.trim();
  if (!value) return null;

  // Retirer les guillemets collés autour d'une URL
  value = value.replace(/^['"]+|['"]+$/g, '');

  // Si l'utilisateur colle le code iframe complet, extraire l'URL src.
  if (value.includes('<iframe')) {
    const extracted = extractUrlFromIframe(value);
    if (!extracted) return null;
    value = extracted.trim();
  }

  // Si le protocole est absent, l'ajouter automatiquement.
  if (!/^https?:\/\//i.test(value) && /helloasso\.com/i.test(value)) {
    value = `https://${value.replace(/^\/+/, '')}`;
  }

  // Si du texte entoure l'URL, extraire la première URL HelloAsso détectée.
  const fullUrlMatch = value.match(/https?:\/\/[^\s"'<>]+helloasso\.com[^\s"'<>]*/i);
  if (fullUrlMatch?.[0]) {
    value = fullUrlMatch[0];
  } else {
    const noProtocolMatch = value.match(/helloasso\.com[^\s"'<>]*/i);
    if (noProtocolMatch?.[0]) {
      value = `https://${noProtocolMatch[0].replace(/^\/+/, '')}`;
    }
  }

  // Décodage HTML basique (&amp; -> &)
  value = value.replace(/&amp;/g, '&');

  return value;
}

function isGenericHelloAssoTitle(title) {
  if (!title) return true;
  const t = title.trim().toLowerCase();
  return t === 'helloasso' || t.startsWith('helloasso ') || t.includes('la page demand') || t.includes('not found');
}

function toIsoDate(dateValue) {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function toIsoTime(dateValue) {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function extractEventFromJsonLd(doc) {
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  const nodes = [];

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent || '{}');
      if (Array.isArray(parsed)) {
        nodes.push(...parsed);
      } else if (parsed?.['@graph'] && Array.isArray(parsed['@graph'])) {
        nodes.push(...parsed['@graph']);
      } else {
        nodes.push(parsed);
      }
    } catch {
      // Ignorer JSON-LD invalide.
    }
  }

  const eventNode = nodes.find((node) => {
    const type = node?.['@type'];
    if (Array.isArray(type)) return type.includes('Event');
    return type === 'Event';
  });

  if (!eventNode) return null;

  const locationName = typeof eventNode.location === 'string'
    ? eventNode.location
    : eventNode.location?.name || eventNode.location?.address?.streetAddress || '';

  const offer = Array.isArray(eventNode.offers) ? eventNode.offers[0] : eventNode.offers;
  const offerPrice = offer?.price ? Number(offer.price) : null;

  return {
    title: eventNode.name || '',
    description: eventNode.description || '',
    date: toIsoDate(eventNode.startDate),
    time: toIsoTime(eventNode.startDate),
    location: locationName || '',
    price: Number.isFinite(offerPrice) ? offerPrice : null,
  };
}

function extractMetadataFromPlainText(text) {
  if (!text) return {};

  let title = '';
  let date = null;
  let time = null;
  let location = '';
  let price = null;

  const titleMatch = text.match(/#\s+([^\n]+)\n\s*##\s+par\s+/i);
  if (titleMatch?.[1]) {
    title = titleMatch[1].trim();
  }

  const dateTimeMatch = text.match(/Le\s+(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4}),\s+de\s+(\d{1,2})h\s+à\s+(\d{1,2})h/i);
  if (dateTimeMatch) {
    const months = {
      'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
      'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
      'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
    };
    const day = dateTimeMatch[1].padStart(2, '0');
    const month = months[dateTimeMatch[2].toLowerCase()];
    const year = dateTimeMatch[3];
    date = `${year}-${month}-${day}`;
    time = `${String(dateTimeMatch[4]).padStart(2, '0')}:00`;
  }

  const locationMatch = text.match(/\n\s*([^\n]{3,80})\n\s*France\b/i);
  if (locationMatch?.[1]) {
    const candidate = locationMatch[1].trim();
    const blocked = ['helloasso', 'paiement sécurisé', 'pourquoi soutenir', 'contactez l\'association'];
    if (!blocked.some((x) => candidate.toLowerCase().includes(x))) {
      location = candidate;
    }
  }

  const priceMatch = text.match(/(?:\n|\s)(\d+)(?:,\d+)?€(?:\n|\s)/);
  if (priceMatch?.[1]) {
    price = Number(priceMatch[1]);
  }

  return { title, date, time, location, price };
}

/**
 * Parser l'URL HelloAsso pour extraire les informations de base
 * @param {string} url - URL HelloAsso (ex: https://www.helloasso.com/associations/association-retrobus-essonne/evenements/le-retrobus-de-noel/widget)
 * @returns {object} - Données extraites { associationSlug, eventSlug, eventName }
 */
export function parseHelloAssoUrl(url) {
  if (!url) return null;
  
  try {
    const normalizedBase = normalizeHelloAssoInput(url);
    if (!normalizedBase) return null;

    // Uniformiser les URLs d'intégration (widget-bouton -> widget)
    const normalizedInput = normalizedBase.replace('/widget-bouton', '/widget');
    const urlObj = new URL(normalizedInput);
    const pathname = urlObj.pathname;
    
    // Pattern: /associations/{association}/evenements|evenement|collectes|boutiques/{slug}/...
    const match = pathname.match(/\/associations\/([^\/]+)\/(?:evenements|evenement|collectes|boutiques)\/([^\/]+)/i);
    
    if (match) {
      const associationSlug = match[1];
      const eventSlug = match[2];
      
      // Convertir le slug en titre lisible
      const eventName = eventSlug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      return {
        associationSlug,
        eventSlug,
        eventName,
        originalUrl: normalizedInput,
        widgetUrl: normalizedInput.includes('/widget') ? normalizedInput : `${normalizedInput}/widget`
      };
    }
  } catch (error) {
    console.error('❌ Erreur parsing URL HelloAsso:', error);
  }
  
  return null;
}

/**
 * Récupérer les métadonnées de l'événement HelloAsso via scraping
 * Note: HelloAsso ne fournit pas d'API publique, donc on fait du scraping léger
 * @param {string} url - URL HelloAsso
 * @returns {Promise<object>} - Métadonnées extraites
 */
export async function fetchHelloAssoMetadata(url) {
  try {
    // Retirer /widget de l'URL pour accéder à la page publique
    const publicUrl = url.replace('/widget', '');
    
    console.log('🔍 Récupération métadonnées HelloAsso:', publicUrl);
    
    let response;
    try {
      // Requête directe (peut échouer en CORS selon navigateur/environnement)
      response = await fetch(publicUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
    } catch (directError) {
      // Ignore et passe au proxy.
      response = null;
    }

    // Fallback proxy public en dev si CORS bloque la requête directe
    if (!response || !response.ok) {
      const proxiedUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(publicUrl)}`;
      response = await fetch(proxiedUrl);
    }
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Parser le HTML pour extraire les métadonnées
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extraire d'abord les données structurées Event (source la plus fiable)
    const structuredEvent = extractEventFromJsonLd(doc);
    const pageText = doc.body?.textContent || '';

    // Extraire les balises meta OpenGraph en fallback
    let title = doc.querySelector('meta[property="og:title"]')?.content || 
          doc.querySelector('title')?.textContent || '';
    let description = doc.querySelector('meta[property="og:description"]')?.content || 
              doc.querySelector('meta[name="description"]')?.content || '';
    const image = doc.querySelector('meta[property="og:image"]')?.content || '';
    
    // Extraire les prix (fallback regex)
    const priceMatch = html.match(/(\d+)(?:,\d+)?\s*€/);
    let price = priceMatch ? parseFloat(priceMatch[1]) : null;
    
    // Extraire la date (pattern français)
    const dateMatch = html.match(/(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/i);
    let eventDate = null;
    
    if (dateMatch) {
      const months = {
        'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
        'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
        'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
      };
      const day = dateMatch[1].padStart(2, '0');
      const month = months[dateMatch[2].toLowerCase()];
      const year = dateMatch[3];
      eventDate = `${year}-${month}-${day}`;
    }
    
    // Extraire l'heure (formats HH:MM ou 18h00)
    const timeMatch = html.match(/(\d{1,2})[:h](\d{2})/i);
    let eventTime = timeMatch
      ? `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}`
      : null;

    // Fallback texte explicite HelloAsso: "Le 24 décembre 2026, de 18h à 20h"
    const textDateTimeMatch = pageText.match(/Le\s+(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4}),?\s*(?:de\s+(\d{1,2})[h:](\d{2}))?/i);
    if (textDateTimeMatch) {
      const months = {
        'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
        'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
        'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
      };
      const day = textDateTimeMatch[1].padStart(2, '0');
      const month = months[textDateTimeMatch[2].toLowerCase()];
      const year = textDateTimeMatch[3];
      if (!eventDate) {
        eventDate = `${year}-${month}-${day}`;
      }
      if (!eventTime && textDateTimeMatch[4] && textDateTimeMatch[5]) {
        eventTime = `${String(textDateTimeMatch[4]).padStart(2, '0')}:${textDateTimeMatch[5]}`;
      }
    }

    // Extraire le lieu (fallback conservateur)
    const locationMeta = doc.querySelector('meta[property="event:location"]')?.content || '';
    let location = locationMeta;

    // Fallback lieu sur texte (ex: "Gare de Corbeil-Essonnes" suivi de "France")
    if (!location) {
      const locationTextMatch = pageText.match(/\n\s*([^\n]{4,80})\s*\n\s*France\b/i);
      if (locationTextMatch?.[1]) {
        const candidate = locationTextMatch[1].trim();
        const blocked = ['helloasso', 'association', 'paiement sécurisé', 'pourquoi soutenir'];
        if (!blocked.some((x) => candidate.toLowerCase().includes(x))) {
          location = candidate;
        }
      }
    }

    // Priorité aux données structurées si disponibles
    if (structuredEvent) {
      title = structuredEvent.title || title;
      description = structuredEvent.description || description;
      eventDate = structuredEvent.date || eventDate;
      eventTime = structuredEvent.time || eventTime;
      location = structuredEvent.location || location;
      price = structuredEvent.price ?? price;
    }

    // Nettoyage des champs parasites
    if (isGenericHelloAssoTitle(title)) {
      title = '';
    }
    if (description && description.toLowerCase().includes('la page demand')) {
      description = '';
    }
    if (location && location.toLowerCase().includes('la page demand')) {
      location = '';
    }

    // Fallback final via r.jina.ai si des champs critiques sont manquants
    if (!eventDate || !eventTime || !location || !title) {
      try {
        const jinaUrl = `https://r.jina.ai/http://${publicUrl.replace(/^https?:\/\//, '')}`;
        const jinaResponse = await fetch(jinaUrl);
        if (jinaResponse.ok) {
          const plainText = await jinaResponse.text();
          const textMeta = extractMetadataFromPlainText(plainText);

          title = !title && textMeta.title ? textMeta.title : title;
          eventDate = !eventDate && textMeta.date ? textMeta.date : eventDate;
          eventTime = !eventTime && textMeta.time ? textMeta.time : eventTime;
          location = !location && textMeta.location ? textMeta.location : location;
          price = (price === null || price === undefined) && textMeta.price !== null && textMeta.price !== undefined
            ? textMeta.price
            : price;
        }
      } catch {
        // Pas bloquant: on garde les valeurs déjà extraites.
      }
    }
    
    return {
      title: title.trim(),
      description: description.trim(),
      image,
      price,
      date: eventDate,
      time: eventTime,
      location: location || 'Non spécifié',
      url: publicUrl
    };
    
  } catch (error) {
    console.error('❌ Erreur récupération métadonnées HelloAsso:', error);
    
    // Retourner des données minimales en cas d'erreur
    return {
      title: '',
      description: '',
      image: '',
      price: null,
      date: null,
      time: null,
      location: '',
      url: url,
      error: error.message
    };
  }
}

/**
 * Importer un événement HelloAsso (processus complet)
 * @param {string} input - URL HelloAsso ou code HTML iframe
 * @returns {Promise<object>} - Données de l'événement formatées pour l'API
 */
export async function importHelloAssoEvent(input) {
  try {
    console.log('📥 Import HelloAsso démarré');

    let ticketUrl = '';
    let integrationUrl = '';

    // Support legacy (string) + nouveau format ({ ticketUrl, integrationUrl })
    if (typeof input === 'string') {
      ticketUrl = input;
      integrationUrl = input;
    } else {
      ticketUrl = input?.ticketUrl || '';
      integrationUrl = input?.integrationUrl || '';
    }

    if (!ticketUrl || !integrationUrl) {
      throw new Error('Les liens billetterie et intégration sont obligatoires');
    }

    const normalizedIntegrationUrl = normalizeHelloAssoInput(integrationUrl)?.replace('/widget-bouton', '/widget');
    const normalizedTicketUrl = normalizeHelloAssoInput(ticketUrl)
      ?.replace('/widget', '')
      .replace('/widget-bouton', '');

    if (!normalizedIntegrationUrl || !normalizedTicketUrl) {
      throw new Error('Liens HelloAsso invalides: vérifiez le format des deux URLs');
    }
    
    // Étape 2 : Parser l'URL
    const urlData = parseHelloAssoUrl(normalizedIntegrationUrl || normalizedTicketUrl);
    if (!urlData) {
      throw new Error('URL HelloAsso invalide');
    }
    console.log('✅ URL parsée:', urlData);

    // Étape 3 : Récupérer les métadonnées pour pré-remplir le formulaire
    let metadata = null;

    // 3a. Priorité au backend interne (évite CORS + plus stable)
    try {
      const API_BASE_URL = (import.meta?.env?.VITE_API_URL || '').replace(/\/+$/, '');
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        ticketUrl: normalizedTicketUrl,
        integrationUrl: normalizedIntegrationUrl,
      });

      const backendRes = await fetch(`${API_BASE_URL}/api/helloasso/metadata?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (backendRes.ok) {
        const backendData = await backendRes.json();
        if (backendData?.metadata) {
          metadata = {
            title: backendData.metadata.title || '',
            description: '',
            image: '',
            price: backendData.metadata.adultPrice ?? null,
            date: backendData.metadata.date || null,
            time: backendData.metadata.time || null,
            location: backendData.metadata.location || '',
            url: normalizedTicketUrl,
          };
        }
      }
    } catch {
      // On garde le fallback frontend ci-dessous.
    }

    // 3b. Fallback frontend si backend indisponible
    if (!metadata) {
      metadata = await fetchHelloAssoMetadata(normalizedTicketUrl);
    }
    console.log('✅ Métadonnées récupérées:', metadata);

    const importedTitle = !isGenericHelloAssoTitle(metadata?.title) ? metadata?.title : urlData.eventName;
    const importedDescription = metadata?.description || `Événement importé depuis HelloAsso: ${urlData.eventName}`;
    const importedDate = metadata?.date || '';
    const importedTime = metadata?.time || '';
    const importedLocation = metadata?.location && metadata.location !== 'Non spécifié' ? metadata.location : '';
    const importedAdultPrice = metadata?.price ?? null;
    
    // Retourner les données formatées pour le formulaire
    return {
      title: importedTitle,
      description: importedDescription,
      date: importedDate,
      time: importedTime,
      location: importedLocation,
      adultPrice: importedAdultPrice,
      childPrice: null,
      helloAssoUrl: urlData.widgetUrl,
      registrationMethod: 'helloasso',
      isFree: false,
      isVisible: true,
      allowPublicRegistration: true,
      requiresRegistration: true,
      status: 'DRAFT',
      // Métadonnées d'import
      importSource: 'helloasso',
      importUrl: normalizedTicketUrl,
      importWidgetUrl: normalizedIntegrationUrl,
      importDate: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Erreur import HelloAsso:', error);
    throw error;
  }
}
