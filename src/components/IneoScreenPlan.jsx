import React, { useRef } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { PLAN_ASPECT, clampPosition, mediaUrl, screenHeightPct } from '../utils/ineoScreens';

const TEST_COLORS = ['#d7194b', '#005a9e', '#2f855a', '#b7791f', '#6b46c1', '#2c7a7b', '#c05621'];

// Plan du véhicule (vue de dessus, avant à droite) : affiche les écrans à leur place et à leur taille.
// En mode édition, chaque écran se déplace au glisser-déposer.
export default function IneoScreenPlan({ screens, selectedKey, onSelect, onMove, online = true, testMode = false }) {
  const planRef = useRef(null);
  const drag = useRef(null);

  const startDrag = (event, screen) => {
    onSelect?.(screen.key);
    if (!onMove) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { key: screen.key, startX: event.clientX, startY: event.clientY, originX: screen.x, originY: screen.y };
  };

  const moveDrag = (event, screen) => {
    const current = drag.current;
    if (!current || current.key !== screen.key || !planRef.current) return;
    const rect = planRef.current.getBoundingClientRect();
    const dx = ((event.clientX - current.startX) / rect.width) * 100;
    const dy = ((event.clientY - current.startY) / rect.height) * 100;
    const next = clampPosition(screen, current.originX + dx, current.originY + dy);
    onMove(screen.key, { x: Math.round(next.x * 10) / 10, y: Math.round(next.y * 10) / 10 });
  };

  const endDrag = () => { drag.current = null; };

  return <Box position="relative" w="full" pb={`${100 / PLAN_ASPECT}%`} userSelect="none" ref={planRef} bg="#eef3f6" border="1px solid #b7c4cd" borderRadius="2px" overflow="hidden">
    <Box position="absolute" inset="0">
      <Box position="absolute" left="1%" right="1%" top="3%" bottom="3%" border="3px solid #9fb2bf" borderRadius="28px" bg="white" />
      <Box position="absolute" right="1%" top="22%" bottom="22%" w="2.5%" bg="#d7e3ea" borderRadius="0 20px 20px 0" />
      <Text position="absolute" right="4%" bottom="5%" fontSize="10px" color="#7a8a96" fontWeight="700">AVANT ▶</Text>
      <Text position="absolute" left="4%" bottom="5%" fontSize="10px" color="#7a8a96" fontWeight="700">◀ ARRIÈRE</Text>
      {screens.map((screen, index) => {
        const imageId = online ? screen.onlineMediaId : screen.offlineMediaId;
        const image = mediaUrl(imageId);
        const selected = selectedKey === screen.key;
        const testColor = TEST_COLORS[index % TEST_COLORS.length];
        return <Box
          key={screen.key}
          position="absolute"
          left={`${screen.x}%`} top={`${screen.y}%`} w={`${screen.widthPct}%`} h={`${screenHeightPct(screen)}%`}
          bg={testMode ? testColor : image ? 'black' : '#2b3a45'}
          border="2px solid" borderColor={selected ? '#ffb000' : '#17364d'}
          boxShadow={selected ? '0 0 0 2px rgba(255,176,0,0.5)' : 'none'}
          cursor={onMove ? 'grab' : 'default'} touchAction="none" overflow="hidden" zIndex={selected ? 2 : 1}
          onPointerDown={(event) => startDrag(event, screen)} onPointerMove={(event) => moveDrag(event, screen)} onPointerUp={endDrag} onPointerCancel={endDrag}
        >
          {!testMode && image && <Box as="img" src={image} alt="" w="full" h="full" objectFit="cover" draggable={false} pointerEvents="none" />}
          <Box position="absolute" inset="0" display="flex" flexDirection="column" alignItems="center" justifyContent="center" color="white" textShadow="0 1px 2px rgba(0,0,0,0.8)" px={1} pointerEvents="none">
            {(testMode || !image) && <Text fontSize="10px" fontWeight="700" noOfLines={1}>{testMode ? 'TEST' : online ? 'Aucune image' : 'Aucune image (hors connexion)'}</Text>}
            <Text fontSize="10px" noOfLines={1}>{screen.name}</Text>
            <Text fontSize="9px" opacity={0.85}>{screen.widthPx}×{screen.heightPx}</Text>
          </Box>
        </Box>;
      })}
    </Box>
  </Box>;
}
