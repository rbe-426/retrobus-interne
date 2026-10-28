/**
 * Utilitaires de géocodage / calcul d'itinéraire (Nominatim + OSRM)
 * Mêmes services que la modale « frais kilométriques » des notes de frais.
 */

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

export const geocodeAddress = async (address, retryCount = 0) => {
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
          return geocodeAddress(address, retryCount + 1);
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
