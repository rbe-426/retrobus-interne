import { useEffect, useRef, useState } from 'react';
import {
  Box, Input, InputGroup, InputRightElement, IconButton, Spinner, Text, HStack, Badge, VStack,
  Popover, PopoverTrigger, PopoverContent, PopoverBody, PopoverArrow, Button, useDisclosure, useToast
} from '@chakra-ui/react';
import { FiBookmark, FiTrash2 } from 'react-icons/fi';
import { searchPlaces, rememberPlace } from '../lib/routeCalc.js';
import { saveAddress, removeAddress, findBookEntry } from '../lib/addressBook.js';

/**
 * Champ d'adresse avec auto-complétion (carnet d'adresses, BAN, OpenStreetMap)
 * et enregistrement de l'adresse saisie dans le carnet.
 */
export default function AddressInput({ value, onChange, placeholder = 'Adresse', size = 'sm', ...rest }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [bookName, setBookName] = useState('');
  const timer = useRef(null);
  const requestId = useRef(0);
  const pickedRef = useRef(null);
  const save = useDisclosure();
  const toast = useToast();

  useEffect(() => () => clearTimeout(timer.current), []);

  const search = (text) => {
    clearTimeout(timer.current);
    const id = ++requestId.current;
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchPlaces(text);
        if (id === requestId.current) setSuggestions(results);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 350);
  };

  const handleChange = (text) => {
    pickedRef.current = null;
    onChange(text);
    setOpen(true);
    search(text);
  };

  const pick = (place) => {
    pickedRef.current = place;
    rememberPlace(place.label, place);
    onChange(place.label);
    setSuggestions([]);
    setOpen(false);
  };

  const handleRemove = async (event, place) => {
    event.stopPropagation();
    try {
      await removeAddress(place.id);
      search(value);
    } catch (e) {
      toast({ title: e.message, status: 'error', duration: 3000 });
    }
  };

  const handleSave = async () => {
    const picked = pickedRef.current;
    try {
      await saveAddress({ name: bookName, address: value, lat: picked?.lat, lng: picked?.lng });
      toast({ title: 'Adresse ajoutée au carnet partagé', status: 'success', duration: 2000 });
      setBookName('');
      save.onClose();
    } catch (e) {
      toast({ title: e.message, status: 'error', duration: 3000 });
    }
  };

  const canSave = Boolean(String(value || '').trim()) && !findBookEntry(value);

  return (
    <Box position="relative" flex="1" {...rest}>
      <InputGroup size={size}>
        <Input
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { setOpen(true); search(value); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        <InputRightElement width="auto" pr={1}>
          {loading && <Spinner size="xs" mr={1} />}
          <Popover isOpen={save.isOpen} onClose={save.onClose} placement="bottom-end">
            <PopoverTrigger>
              <IconButton
                size="xs" variant="ghost" icon={<FiBookmark />} aria-label="Ajouter au carnet d'adresses"
                title="Ajouter au carnet d'adresses partagé" isDisabled={!canSave}
                onClick={() => { setBookName(''); save.onToggle(); }}
              />
            </PopoverTrigger>
            <PopoverContent w="260px">
              <PopoverArrow />
              <PopoverBody>
                <VStack align="stretch" spacing={2}>
                  <Text fontSize="xs" color="gray.600">Nom du lieu dans le carnet</Text>
                  <Input size="sm" autoFocus value={bookName} placeholder="Ex : Dépôt, Musée…" onChange={(e) => setBookName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && bookName.trim()) handleSave(); }} />
                  <Button size="sm" colorScheme="blue" isDisabled={!bookName.trim()} onClick={handleSave}>Enregistrer</Button>
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </InputRightElement>
      </InputGroup>

      {open && suggestions.length > 0 && (
        <Box
          position="absolute" top="100%" left={0} right={0} mt={1} zIndex={20}
          bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" shadow="md"
          maxH="260px" overflowY="auto"
        >
          {suggestions.map((s, i) => (
            <HStack
              key={`${s.source}-${s.lat}-${s.lng}-${i}`} px={3} py={2} cursor="pointer" _hover={{ bg: 'blue.50' }}
              borderBottomWidth={i < suggestions.length - 1 ? '1px' : 0} borderColor="gray.100" align="start"
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
            >
              <Box flex="1" minW={0}>
                <Text fontSize="sm" fontWeight="medium" color="gray.800" noOfLines={1}>{s.name}</Text>
                {s.detail && s.detail !== s.name && <Text fontSize="xs" color="gray.600" noOfLines={1}>{s.detail}</Text>}
              </Box>
              {s.source === 'carnet' && <Badge colorScheme="purple">Carnet</Badge>}
              {s.source === 'carnet' && (
                <IconButton
                  size="xs" variant="ghost" colorScheme="red" icon={<FiTrash2 />} aria-label="Retirer du carnet"
                  onMouseDown={(e) => handleRemove(e, s)}
                />
              )}
            </HStack>
          ))}
        </Box>
      )}
    </Box>
  );
}
