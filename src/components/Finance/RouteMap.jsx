import React, { useEffect, useRef } from 'react';
import { Box } from '@chakra-ui/react';
import L from 'leaflet';
import '../../leaflet-custom.css';

const DEFAULT_CENTER = [48.6, 2.3];

const markerIcon = (color) => L.icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

const startIcon = markerIcon('green');
const endIcon = markerIcon('red');
const stepIcon = markerIcon('blue');

export default function RouteMap({ route, height = '300px' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    mapRef.current = L.map(containerRef.current, { center: DEFAULT_CENTER, zoom: 8, scrollWheelZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapRef.current);
    const timer = setTimeout(() => mapRef.current?.invalidateSize(), 120);
    return () => {
      clearTimeout(timer);
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layerRef.current?.remove();
    const layer = L.layerGroup().addTo(map);
    layerRef.current = layer;

    const points = route?.points || [];
    if (route?.geometry?.length) {
      L.polyline(route.geometry, { color: '#3b82f6', weight: 5, opacity: 0.9 }).addTo(layer);
    }
    points.forEach((p, i) => {
      const isStart = i === 0;
      const isEnd = i === points.length - 1;
      L.marker([p.lat, p.lng], { icon: isStart ? startIcon : isEnd ? endIcon : stepIcon })
        .bindPopup(`${isStart ? 'Départ' : isEnd ? 'Arrivée' : `Arrêt ${i}`}<br/>${String(p.label || '').replace(/</g, '&lt;')}`)
        .addTo(layer);
    });

    const bounds = route?.geometry?.length ? route.geometry : points.map(p => [p.lat, p.lng]);
    if (bounds.length >= 2) map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] });
    else if (bounds.length === 1) map.setView(bounds[0], 11);
    setTimeout(() => map.invalidateSize(), 120);
  }, [route]);

  return (
    <Box h={height} borderRadius="lg" overflow="hidden" border="1px solid" borderColor="gray.200">
      <Box ref={containerRef} h="100%" w="100%" />
    </Box>
  );
}
