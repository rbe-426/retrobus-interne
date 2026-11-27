import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Badge, Box, Center, HStack, Spinner, Text, VStack } from '@chakra-ui/react';
import { analyzeStops, computeBusRoute, vehicleKey } from '../lib/busRouting';
import '../leaflet-custom.css';

const pinIcon = (number, kind, active) => L.divIcon({
  className: 'rbe-stop-icon',
  html: `<div class="rbe-stop-pin rbe-stop-pin--${kind}${active ? ' rbe-stop-pin--active' : ''}"><span>${number}</span></div>`,
  iconSize: active ? [38, 38] : [28, 28],
  iconAnchor: active ? [19, 19] : [14, 14],
  popupAnchor: [0, -16],
});

// Ajuste la vue quand l'ensemble des points change (pas à chaque rendu)
function FitBounds({ waypoints, fitKey }) {
  const map = useMap();
  useEffect(() => {
    if (waypoints.length > 0) {
      map.fitBounds(L.latLngBounds(waypoints.map((wp) => [wp.lat, wp.lng])), { padding: [50, 50] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, map]);
  return null;
}

// Recentre doucement la carte sur l'arrêt mis en surbrillance s'il est hors champ
function FocusHighlighted({ waypoint }) {
  const map = useMap();
  useEffect(() => {
    if (waypoint && !map.getBounds().pad(-0.1).contains([waypoint.lat, waypoint.lng])) {
      map.panTo([waypoint.lat, waypoint.lng], { animate: true });
    }
  }, [waypoint, map]);
  return null;
}

const ENGINE_LABELS = {
  bus: { color: 'green', text: 'Tracé bus sur route (voies bus autorisées, sens interdits respectés)' },
  car: { color: 'orange', text: 'Tracé voiture (moteur bus indisponible) : à vérifier' },
  straight: { color: 'red', text: 'Vol d’oiseau : calcul routier indisponible' },
};

/**
 * RouteMap - itinéraire sur carte avec routage réel pour autobus.
 * Props optionnelles : height, highlightedIndex (formIndex ou rang du point), onHighlight(index),
 * analyze (propose des optimisations), onRouteComputed({ ...tracé, suggestions }).
 */
export default function RouteMap({ route, height = '500px', highlightedIndex = null, onHighlight, analyze = false, onRouteComputed }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const callbackRef = useRef(onRouteComputed);
  callbackRef.current = onRouteComputed;

  const waypoints = useMemo(
    () => [...(route?.waypoints || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [route?.waypoints]
  );
  const vehicle = useMemo(
    () => ({ heightM: route?.maxHeight, widthM: route?.maxWidth, lengthM: route?.maxLength, weightT: route?.maxWeight }),
    [route?.maxHeight, route?.maxWidth, route?.maxLength, route?.maxWeight]
  );
  const waypointKey = waypoints.map((wp) => `${wp.lat},${wp.lng}`).join('|');
  const routingKey = `${waypointKey}#${vehicleKey(vehicle)}#${analyze}`;

  useEffect(() => {
    if (waypoints.length < 2) {
      setResult(null);
      callbackRef.current?.(null);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const computed = await computeBusRoute(waypoints, vehicle, controller.signal);
        let suggestions = [];
        if (analyze && computed.engine === 'bus') {
          try {
            suggestions = await analyzeStops(waypoints, vehicle, controller.signal);
          } catch (error) {
            if (error?.name === 'AbortError') return;
          }
        }
        const full = { ...computed, suggestions };
        setResult(full);
        callbackRef.current?.(full);
      } catch (error) {
        if (error?.name !== 'AbortError') console.error('Route calculation error:', error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routingKey]);

  if (waypoints.length === 0) {
    return (
      <Box p={4} bg="gray.50" borderRadius="md" textAlign="center" color="gray.500">
        Pas de waypoints à afficher
      </Box>
    );
  }

  const refOf = (wp, index) => wp.formIndex ?? index;
  const highlightedPoint = highlightedIndex == null ? null : waypoints.find((wp, index) => refOf(wp, index) === highlightedIndex) || null;
  const engine = result ? ENGINE_LABELS[result.engine] : null;
  const failedLegs = new Set(result?.failedLegs || []);

  return (
    <Box borderRadius="md" overflow="hidden" boxShadow="md" h={height} position="relative">
      {loading && (
        <Center position="absolute" top={0} left={0} right={0} bottom={0} bg="rgba(255,255,255,0.7)" zIndex={1000}>
          <VStack spacing={2}>
            <Spinner color="purple.500" size="lg" />
            <Text fontSize="sm" color="gray.600">Calcul de l'itinéraire bus…</Text>
          </VStack>
        </Center>
      )}

      {engine && !loading && (
        <HStack position="absolute" top={2} right={2} zIndex={1000} bg="white" px={2} py={1} borderRadius="md" boxShadow="sm" maxW="70%">
          <Badge colorScheme={engine.color} whiteSpace="normal">{engine.text}</Badge>
          {result.totalKm > 0 && result.engine !== 'straight' && <Text fontSize="xs" color="gray.600" whiteSpace="nowrap">{result.totalKm.toFixed(1)} km · {Math.round(result.totalTimeS / 60)} min</Text>}
        </HStack>
      )}

      <MapContainer
        center={[waypoints[0].lat, waypoints[0].lng]}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {result?.legs.map((leg, index) => (
          failedLegs.has(index) ? (
            <Polyline key={`leg-${index}`} positions={leg.coords} color="red" weight={3} opacity={0.8} dashArray="6, 8" />
          ) : (
            <Polyline key={`leg-${index}`} positions={leg.coords} color="purple" weight={5} opacity={0.9} />
          )
        ))}

        {result?.heavyConflicts?.map((conflict, index) => (
          <Polyline key={`heavy-${index}`} positions={conflict.coords} color="#f97316" weight={8} opacity={0.75}>
            <Popup>Tronçon à vérifier : emprunté par le bus mais écarté par le calcul poids lourd (voie réservée bus, tonnage ou gabarit).</Popup>
          </Polyline>
        ))}

        {!result && waypoints.length > 1 && (
          <Polyline positions={waypoints.map((wp) => [wp.lat, wp.lng])} color="gray" weight={2} opacity={0.5} dashArray="4, 6" />
        )}

        {highlightedPoint && (
          <CircleMarker center={[highlightedPoint.lat, highlightedPoint.lng]} radius={26} pathOptions={{ color: '#f59e0b', weight: 3, fillColor: '#fde68a', fillOpacity: 0.35 }} className="rbe-stop-halo" />
        )}

        {waypoints.map((wp, idx) => {
          const ref = refOf(wp, idx);
          const active = ref === highlightedIndex;
          const kind = idx === 0 ? 'start' : idx === waypoints.length - 1 ? 'end' : 'mid';
          return (
            <Marker
              key={`${wp.order}-${wp.lat}-${wp.lng}`}
              position={[wp.lat, wp.lng]}
              icon={pinIcon(idx + 1, kind, active)}
              zIndexOffset={active ? 1000 : 0}
              eventHandlers={{ click: () => onHighlight?.(ref) }}
            >
              <Popup>
                <div style={{ fontSize: '12px', minWidth: '180px' }}>
                  <strong>{wp.name || wp.label}</strong><br />
                  Lat: {wp.lat.toFixed(4)}, Lng: {wp.lng.toFixed(4)}<br />
                  {wp.stopTime > 0 && <span>Arrêt: {wp.stopTime} min<br /></span>}
                  <small>Point {idx + 1}/{waypoints.length}</small>
                  {route.maxLength && <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #ccc' }}>
                    <strong>Restrictions:</strong><br />
                    {route.vehicleType && <small>Type: {route.vehicleType}<br /></small>}
                    {route.maxSpeedKmh && <small>Vmax: {route.maxSpeedKmh} km/h<br /></small>}
                    {route.maxLength && <small>Long: {route.maxLength}m</small>}
                    {route.maxWidth && <small> | Larg: {route.maxWidth}m</small>}
                    {route.maxHeight && <small> | H: {route.maxHeight}m</small>}
                    {route.maxWeight && <small> | P: {route.maxWeight}t</small>}
                  </div>}
                </div>
              </Popup>
            </Marker>
          );
        })}

        <FitBounds waypoints={waypoints} fitKey={waypointKey} />
        <FocusHighlighted waypoint={highlightedPoint} />
      </MapContainer>
    </Box>
  );
}
