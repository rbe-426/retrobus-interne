import { API_BASE_URL } from '../api/config';

// Plan d'un véhicule vu de dessus (avant à droite) : largeur = PLAN_ASPECT x hauteur. Mêmes valeurs que l'API et le logiciel UC.
export const PLAN_ASPECT = 2.5;

export const SCREEN_PLACES = [
  { value: 'FRONT_DESTINATION', label: 'Girouette avant', x: 78, y: 4, widthPct: 18, widthPx: 1920, heightPx: 300 },
  { value: 'SIDE_DESTINATION', label: 'Girouette latérale', x: 52, y: 4, widthPct: 14, widthPx: 1280, heightPx: 300 },
  { value: 'REAR_DESTINATION', label: 'Girouette arrière', x: 4, y: 4, widthPct: 14, widthPx: 1280, heightPx: 300 },
  { value: 'INSIDE_FRONT', label: 'Intérieur avant', x: 72, y: 38, widthPct: 16, widthPx: 1280, heightPx: 720 },
  { value: 'INSIDE_MIDDLE', label: 'Intérieur milieu', x: 42, y: 38, widthPct: 16, widthPx: 1280, heightPx: 720 },
  { value: 'INSIDE_REAR', label: 'Intérieur arrière', x: 12, y: 38, widthPct: 16, widthPx: 1280, heightPx: 720 },
  { value: 'CUSTOM', label: 'Emplacement libre', x: 40, y: 64, widthPct: 16, widthPx: 1280, heightPx: 720 },
];

export const RESOLUTIONS = [
  { label: 'Full HD 1920 × 1080', widthPx: 1920, heightPx: 1080 },
  { label: 'HD 1280 × 720', widthPx: 1280, heightPx: 720 },
  { label: '1024 × 600', widthPx: 1024, heightPx: 600 },
  { label: '800 × 480', widthPx: 800, heightPx: 480 },
  { label: 'Bandeau 1920 × 300', widthPx: 1920, heightPx: 300 },
  { label: 'Bandeau 1280 × 300', widthPx: 1280, heightPx: 300 },
  { label: 'Bandeau 640 × 160', widthPx: 640, heightPx: 160 },
];

export const placeLabel = (value) => SCREEN_PLACES.find((place) => place.value === value)?.label || 'Emplacement libre';
export const screenHeightPct = (screen) => screen.widthPct * PLAN_ASPECT * (screen.heightPx / screen.widthPx);
export const mediaUrl = (id) => (id ? `${API_BASE_URL}/api/ineo-rbe-desktop/media/${id}` : null);

let screenKey = 0;
export const withKey = (screen) => ({ ...screen, key: screen.id || `new-${screenKey += 1}` });

export const newScreenForPlace = (placeValue, existingCount = 0) => {
  const place = SCREEN_PLACES.find((item) => item.value === placeValue) || SCREEN_PLACES[SCREEN_PLACES.length - 1];
  return withKey({
    name: `${place.label}${existingCount ? ` ${existingCount + 1}` : ''}`,
    place: place.value, x: place.x, y: place.y, widthPct: place.widthPct, widthPx: place.widthPx, heightPx: place.heightPx,
    offlineMediaId: null, onlineMediaId: null,
  });
};

export const clampPosition = (screen, x, y) => ({
  x: Math.min(Math.max(0, 100 - screen.widthPct), Math.max(0, x)),
  y: Math.min(Math.max(0, 100 - screenHeightPct(screen)), Math.max(0, y)),
});

export const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
  reader.readAsDataURL(file);
});

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
