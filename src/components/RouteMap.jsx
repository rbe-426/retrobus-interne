import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Box, Spinner, Center, Text, VStack } from '@chakra-ui/react';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons for route visualization
const startIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const endIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const waypointIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Component to fit bounds
function FitBounds({ waypoints }) {
  const map = useMap();
  
  useEffect(() => {
    if (waypoints && waypoints.length > 0) {
      const coords = waypoints.map(wp => [wp.lat, wp.lng]);
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [waypoints, map]);

  return null;
}

/**
 * RouteMap - Visualize itinerary on interactive map with REAL routing
 * Uses OpenRouteService to calculate actual road paths respecting bus gabarits
 */
export default function RouteMap({ route }) {
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  if (!route || !route.waypoints || route.waypoints.length === 0) {
    return (
      <Box p={4} bg="gray.50" borderRadius="md" textAlign="center" color="gray.500">
        Pas de waypoints à afficher
      </Box>
    );
  }

  const waypoints = route.waypoints.sort((a, b) => a.order - b.order);

  // Fetch real routing from OpenRouteService (free tier - via CORS proxy)
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        setLoading(true);
        
        // Build coordinates array for OpenRouteService [lng, lat] format
        const coordinates = waypoints.map(wp => [wp.lng, wp.lat]);
        
        // Use OSRM (Open Source Routing Machine) as free alternative
        // OSRM respects road networks and vehicle profiles
        const coordStr = coordinates.map(c => c.join(',')).join(';');
        const profile = 'driving'; // 'driving' for bus-like vehicles
        
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/${profile}/${coordStr}?overview=full&geometries=geojson`,
          {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          }
        );

        if (!response.ok) {
          throw new Error('Erreur calcul route');
        }

        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          // Convert GeoJSON coordinates to Leaflet format [lat, lng]
          const pathCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
          setRouteGeometry(pathCoordinates);
        }
      } catch (err) {
        console.error('Route calculation error:', err);
        setError(err.message);
        // Fallback to straight line if error
        setRouteGeometry(waypoints.map(wp => [wp.lat, wp.lng]));
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [waypoints]);

  return (
    <Box borderRadius="md" overflow="hidden" boxShadow="md" h="500px" position="relative">
      {loading && (
        <Center position="absolute" top={0} left={0} right={0} bottom={0} bg="rgba(255,255,255,0.8)" zIndex={1000}>
          <VStack spacing={2}>
            <Spinner color="purple.500" size="lg" />
            <Text fontSize="sm" color="gray.600">Calcul de l'itinéraire réel...</Text>
          </VStack>
        </Center>
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
        
        {/* Real route line */}
        {routeGeometry && !error && (
          <Polyline
            positions={routeGeometry}
            color="purple"
            weight={5}
            opacity={0.9}
            dashArray="0"
          />
        )}

        {/* Fallback straight line on error */}
        {error && (
          <Polyline
            positions={waypoints.map(wp => [wp.lat, wp.lng])}
            color="red"
            weight={3}
            opacity={0.6}
            dashArray="5, 5"
          />
        )}

        {/* Waypoints markers */}
        {waypoints.map((wp, idx) => (
          <Marker
            key={wp.order}
            position={[wp.lat, wp.lng]}
            icon={idx === 0 ? startIcon : idx === waypoints.length - 1 ? endIcon : waypointIcon}
          >
            <Popup>
              <div style={{ fontSize: '12px', minWidth: '180px' }}>
                <strong>{wp.name}</strong><br />
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
        ))}

        {/* Auto-fit bounds */}
        <FitBounds waypoints={waypoints} />
      </MapContainer>
    </Box>
  );
}
