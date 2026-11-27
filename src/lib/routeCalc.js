/**
 * Utilitaires de géocodage / calcul d'itinéraire (Nominatim + OSRM)
 * Mêmes services que la modale « frais kilométriques » des notes de frais.
 */

import { ensureAddressBook, findBookEntry, searchAddressBook } from './addressBook.js';

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const normalizeSearchText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const expandAddressKeywords = (address) => {
  const trimmed = address.trim();
  const expanded = trimmed
    .replace(/\bevry\b/gi, 'Évry-Courcouronnes')
    .replace(/\bevry courcouronnes\b/gi, 'Évry-Courcouronnes');
  return Array.from(new Set([trimmed, expanded, `${expanded}, France`].filter(Boolean)));
};

const scoreGeocodeResult = (result, query) => {
  const haystack = normalizeSearchText([
    result.display_name, result.name, result.type, result.class, result.category
  ].filter(Boolean).join(' '));
  const tokens = normalizeSearchText(query).split(/\s+/).filter(token => token.length > 1);
  const tokenScore = tokens.reduce((score, token) => score + (haystack.includes(token) ? 4 : 0), 0);
  const importanceScore = Number(result.importance || 0) * 10;
  const poiScore = ['amenity', 'shop', 'tourism', 'office', 'leisure'].includes(result.class) ? 3 : 0;
  return tokenScore + importanceScore + poiScore;
};

const nominatimGeocode = async (address, retryCount = 0) => {
  const queries = expandAddressKeywords(address);
  const results = [];

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    if (i > 0) await sleep(300);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=8&addressdetails=1&countrycodes=fr&q=${encodeURIComponent(query)}`,
        { headers: { Accept: 'application/json', 'Accept-Language': 'fr' } }
      );

      if (response.status === 429) {
        if (retryCount < 2) {
          await sleep(1000 * (retryCount + 1));
          return nominatimGeocode(address, retryCount + 1);
        }
        throw new Error('Service de géocodage temporairement indisponible (trop de requêtes).');
      }
      if (!response.ok) continue;

      const queryResults = await response.json();
      results.push(...queryResults.map(result => ({ ...result, query })));
    } catch (error) {
      if (error.message.includes('Service de géocodage')) throw error;
    }
  }

  if (!results.length) {
    throw new Error(`Adresse introuvable : « ${address} ». Essayez une adresse plus précise.`);
  }

  const unique = Array.from(new Map(results.map(r => [`${r.lat},${r.lon}`, r])).values());
  const best = unique.sort((a, b) => scoreGeocodeResult(b, b.query) - scoreGeocodeResult(a, a.query))[0];

  return { label: best.display_name, lat: Number(best.lat), lng: Number(best.lon) };
};

// Biais de recherche : centre de l'Essonne, pour départager les homonymes
const BIAS = { lat: 48.63, lng: 2.35 };
const FRANCE_BBOX = '-5.5,41.2,9.8,51.2';

const fetchJson = async (url, timeoutMs = 6000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

// Base Adresse Nationale (Géoplateforme IGN) : la référence pour les adresses postales en France
const searchBan = async (query, limit) => {
  const data = await fetchJson(
    `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(query)}&limit=${limit}&lat=${BIAS.lat}&lon=${BIAS.lng}`
  );
  return (data?.features || []).map(f => ({
    label: f.properties.label,
    name: f.properties.name || f.properties.label,
    detail: [f.properties.postcode, f.properties.city].filter(Boolean).join(' '),
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    source: 'BAN',
    score: Number(f.properties.score || 0) + 0.2
  }));
};

// Photon (OpenStreetMap) : tolérant aux fautes de frappe et aux lieux/commerces
const searchPhoton = async (query, limit) => {
  const data = await fetchJson(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=${limit}&lang=fr&lat=${BIAS.lat}&lon=${BIAS.lng}&bbox=${FRANCE_BBOX}`
  );
  return (data?.features || []).map(f => {
    const p = f.properties || {};
    const street = [p.housenumber, p.street].filter(Boolean).join(' ');
    const city = [p.postcode, p.city || p.town || p.village || p.county].filter(Boolean).join(' ');
    const label = [p.name !== p.street ? p.name : null, street, city].filter(Boolean).join(', ');
    return {
      label, name: p.name || street || city, detail: [street, city].filter(Boolean).join(', '),
      lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], source: 'OSM', score: p.name ? 0.3 : 0.1
    };
  }).filter(r => r.label);
};

const placeCache = new Map();
export const rememberPlace = (label, place) => {
  if (label && Number.isFinite(place?.lat)) placeCache.set(normalizeSearchText(label), { label, lat: place.lat, lng: place.lng });
};

/** Suggestions pour l'auto-complétion : carnet d'adresses puis BAN + Photon fusionnés. */
export const searchPlaces = async (query, { limit = 6 } = {}) => {
  const q = String(query || '').trim();
  await ensureAddressBook();
  const book = searchAddressBook(q, 4).map(e => ({
    id: e.id, label: e.address, name: e.name, detail: e.address, lat: e.lat, lng: e.lng, source: 'carnet'
  }));
  if (q.length < 3) return book;

  const [ban, photon] = await Promise.all([searchBan(q, limit), searchPhoton(q, limit)]);
  const seen = new Set();
  const merged = [...ban, ...photon]
    .sort((a, b) => b.score - a.score)
    .filter(r => {
      const key = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
  return [...book, ...merged];
};

/** Géocode une saisie : carnet / lieu déjà choisi (instantané), sinon BAN + Photon, sinon Nominatim. */
export const geocodeAddress = async (address) => {
  await ensureAddressBook();
  const entry = findBookEntry(address);
  if (entry && Number.isFinite(entry.lat)) return { label: entry.address, lat: entry.lat, lng: entry.lng };
  const cached = placeCache.get(normalizeSearchText(address));
  if (cached) return cached;

  const query = entry ? entry.address : address;
  const [ban, photon] = await Promise.all([searchBan(query, 3), searchPhoton(query, 3)]);
  const best = [...ban, ...photon].sort((a, b) => b.score - a.score)[0];
  if (best) return { label: best.label, lat: best.lat, lng: best.lng };
  return nominatimGeocode(query);
};

const straightLineKm = (start, end) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(end.lat - start.lat);
  const dLng = toRad(end.lng - start.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(start.lat)) * Math.cos(toRad(end.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const straightLineRouteKm = (points) => points.slice(1)
  .reduce((sum, point, index) => sum + straightLineKm(points[index], point), 0);

export const fetchRoadRoute = async (points) => {
  const coordStr = points.map(point => `${point.lng},${point.lat}`).join(';');
  let response;
  try {
    response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`
    );
  } catch {
    throw new Error("Erreur réseau lors du calcul d'itinéraire");
  }
  if (!response.ok) throw new Error(`Service de routage indisponible (${response.status})`);

  const data = await response.json();
  const route = data.routes?.[0];
  if (!route) throw new Error('Aucun itinéraire routier trouvé entre ces points');

  return {
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
  };
};

/**
 * Calcule un trajet complet à partir d'une liste d'adresses (départ, arrêts, arrivée).
 * `roundTrip` ajoute le retour au départ. Retombe sur une distance à vol d'oiseau si OSRM échoue.
 */
/**
 * Produit en croix carburant : litres = km × conso / 100, coût = litres × prix du litre.
 * Le tarif au km vaut soit la saisie manuelle, soit coût carburant/km + majoration (usure, frais…).
 */
export const fuelStats = (trip = {}) => {
  const price = Number(trip.fuelPrice) || 0;
  const consumption = Number(trip.consumption) || 0;
  const tank = Number(trip.tankCapacity) || 0;
  const km = Number(trip.distanceKm) || 0;
  const costPerKm = (consumption / 100) * price;
  const liters = (km * consumption) / 100;
  const cost = liters * price;
  // Dès que prix du litre et consommation sont renseignés, le tarif au km est imposé par le calcul
  const locked = costPerKm > 0;
  const kmRate = locked ? costPerKm + (Number(trip.extraPerKm) || 0) : Number(trip.kmRate) || 0;
  return {
    costPerKm, liters, cost, kmRate, locked,
    tankFills: tank > 0 ? liters / tank : null,
    autonomyKm: consumption > 0 && tank > 0 ? (tank / consumption) * 100 : null
  };
};

export const computeRoute = async (addresses, { roundTrip = false } = {}) => {
  const cleaned = addresses.map(a => String(a || '').trim()).filter(Boolean);
  if (cleaned.length < 2) throw new Error('Saisissez au moins un départ et une arrivée');

  const points = [];
  for (let i = 0; i < cleaned.length; i++) {
    if (i > 0) await sleep(400);
    points.push(await geocodeAddress(cleaned[i]));
  }

  const routePoints = roundTrip ? [...points, points[0]] : points;

  try {
    const road = await fetchRoadRoute(routePoints);
    return { points, ...road, source: 'OSRM', roundTrip, warning: null };
  } catch (error) {
    return {
      points,
      geometry: routePoints.map(p => [p.lat, p.lng]),
      distanceKm: straightLineRouteKm(routePoints),
      durationMin: null,
      source: 'ligne droite',
      roundTrip,
      warning: `${error.message}. Distance indicative à vol d'oiseau.`
    };
  }
};
