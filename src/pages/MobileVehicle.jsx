import {
  Box, Heading, Text, Button, Stack, Input, Textarea, VStack, HStack,
  Spinner, Center, useToast, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter, FormControl, FormLabel, Card, CardBody,
  Badge, Divider, SimpleGrid, Container
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { API_BASE_URL } from "../api/config";

// Build API URLs that always include the /api prefix and support same-origin when no base is set
const BASE = (API_BASE_URL || (import.meta.env.VITE_API_URL || "")).replace(/\/+$/, "");
const PREFIX = (import.meta.env.VITE_API_PREFIX || localStorage.getItem('rbe_api_prefix') || "api").replace(/^\/+|\/+$/g, "");
const getVehiclesPath = () => (localStorage.getItem('rbe_api_vehicles_path') || `${PREFIX}/vehicles`).replace(/^\/+/, '').replace(/\/+$/, '');
const getOrigin = () => (localStorage.getItem('rbe_api_origin') || BASE).replace(/\/+$/, '');

const buildCandidates = (resourcePath) => {
  const path = String(resourcePath || '').replace(/^\/+/, '');
  const origin = getOrigin();
  const rel = `/${path}`; // relative (same-origin via dev proxy)
  const abs = origin ? `${origin}/${path}` : null;
  const list = [rel];
  if (abs) list.push(abs);
  return list;
};

const fetchJsonFirst = async (urls, init) => {
  let lastErr = null;
  for (const url of urls) {
    try {
      const r = await fetch(url, init);
      if (!r.ok) { lastErr = new Error(`HTTP ${r.status}`); continue; }
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      if (!ct.includes('application/json')) { lastErr = new Error('non-json'); continue; }
      return await r.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('fetch failed');
};

/**
 * Page mobile d'accès via QR
 * - URL expected: /mobile/v/:parc?t=<token>
 * - If token valid, we fetch vehicle and allow anonymous writes via token header.
 * - If token invalid or absent, user must authenticate (matricule) via UserContext.
 */
export default function MobileVehicle() {
  const { parc } = useParams();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const nav = useNavigate();

  const tokenFromUrl = searchParams.get("t") || "";
  const { matricule, setMatricule, token: authToken } = useUser();

  const [token, setToken] = useState(tokenFromUrl || "");
  const [veh, setVeh] = useState(null);
  const [events, setEvents] = useState([]);
  const [usages, setUsages] = useState([]);
  const [loading, setLoading] = useState(true);

  // modals
  const [showAnomaly, setShowAnomaly] = useState(false);
  const [showPassage, setShowPassage] = useState(false);
  const [finishMode, setFinishMode] = useState(false);
  const [showEvent, setShowEvent] = useState(false);

  // auth form (matricule) for fallback
  const [inputMatricule, setInputMatricule] = useState(matricule || "");
  const [authLoading, setAuthLoading] = useState(false);

  // members for passage modal
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  // arrival/departure & actions
  const [arrDate, setArrDate] = useState("");
  const [arrTime, setArrTime] = useState("");
  const [depDate, setDepDate] = useState("");
  const [depTime, setDepTime] = useState("");
  const [actionsText, setActionsText] = useState("");
  const [arrLoc, setArrLoc] = useState(null);
  const [depLoc, setDepLoc] = useState(null);

  // Ongoing pointage tracking
  const currentUsageKey = `rbe_current_usage_${parc}`;
  const [currentUsageId, setCurrentUsageId] = useState(() => {
    const raw = localStorage.getItem(currentUsageKey);
    return raw ? JSON.parse(raw) : null;
  });

  const setCurrentUsage = (idOrNull) => {
    setCurrentUsageId(idOrNull);
    if (idOrNull) localStorage.setItem(currentUsageKey, JSON.stringify(idOrNull));
    else localStorage.removeItem(currentUsageKey);
  };

  // Helper: geolocation
  const getGeo = () => new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });

  // When opening the passage modal, prefill arrival time and ask location
  useEffect(() => {
    if (showPassage && !finishMode) {
      const now = new Date();
      setArrDate(now.toISOString().slice(0,10));
      setArrTime(now.toTimeString().slice(0,5));
      getGeo().then(setArrLoc);
    }
    if (showPassage && finishMode) {
      const now = new Date();
      setDepDate(now.toISOString().slice(0,10));
      setDepTime(now.toTimeString().slice(0,5));
      getGeo().then(setDepLoc);
    }
    if (!showPassage) {
      setFinishMode(false);
    }
  }, [showPassage, finishMode]);

  const loadMembers = async () => {
    if (!authToken) return; // need JWT
    try {
      setMembersLoading(true);
      const urls = buildCandidates(`${(import.meta.env.VITE_API_PREFIX || localStorage.getItem('rbe_api_prefix') || 'api').replace(/^\/+/,'')}/members?limit=500`);
      const data = await fetchJsonFirst(urls, { headers: { Authorization: `Bearer ${authToken}` } });
      setMembers(Array.isArray(data?.members) ? data.members : []);
    } catch (e) {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  // headers to use for API calls (token preferred)
  const headersFor = (t = token, useMatricule = matricule) => {
    const h = { "Content-Type": "application/json" };
    if (t) h["x-qr-token"] = t;
    else if (useMatricule) h["x-user-matricule"] = useMatricule;
    // If user is logged in with standard credentials, include JWT too
    if (authToken) h["Authorization"] = `Bearer ${authToken}`;
    return h;
  };

  // fetch vehicle + related data
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        setLoading(true);
        const h = headersFor(token);
        const basePath = getVehiclesPath();
        const vehUrls = buildCandidates(`${basePath}/${encodeURIComponent(parc)}`);
  // Server expects "reports" for vehicle-specific events
  const evUrls = buildCandidates(`${basePath}/${encodeURIComponent(parc)}/reports`);
        const usUrls = buildCandidates(`${basePath}/${encodeURIComponent(parc)}/usages`);
        const [rv, re, ru] = await Promise.all([
          fetchJsonFirst(vehUrls, { headers: h }),
          fetchJsonFirst(evUrls, { headers: h }).catch(() => []),
          fetchJsonFirst(usUrls, { headers: h }).catch(() => []),
        ]);
        if (stop) return;
        setVeh(rv);
        // Normalize report objects into UI-friendly event items
        const normalizedEvents = Array.isArray(re) ? re.map(r => ({
          id: r.id,
          type: r.type || 'Rapport',
          date: r.createdAt || r.date || new Date().toISOString(),
          note: r.description || r.note || '',
          createdBy: r.createdBy || r.author || '—',
        })) : [];
        setEvents(normalizedEvents);
        setUsages(Array.isArray(ru) ? ru : []);
      } catch (err) {
        // token invalid or other error — clear vehicle so user must auth
        console.warn("fetch vehicle failed:", err);
        setVeh(null);
        setEvents([]);
        setUsages([]);
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => { stop = true; };
  }, [parc, token]);

  const onAuthenticate = async (e) => {
    e?.preventDefault?.();
    if (!inputMatricule?.trim()) return toast({ status: "warning", title: "Matricule requis" });
    try {
      setAuthLoading(true);
      // simulate auth — here simply store matricule in context
      // if you have server auth, replace this by an API call
      setMatricule(inputMatricule.trim());
      toast({ status: "success", title: "Connecté", description: inputMatricule.trim() });
      // re-fetch using matricule header
      setToken(""); // ensure using matricule
      setTimeout(() => {
        // small delay to let header propagate
        (async () => {
          try {
            setLoading(true);
            const h = headersFor('', inputMatricule.trim());
            const basePath = getVehiclesPath();
            const vehUrls = buildCandidates(`${basePath}/${encodeURIComponent(parc)}`);
            const evUrls = buildCandidates(`${basePath}/${encodeURIComponent(parc)}/reports`);
            const usUrls = buildCandidates(`${basePath}/${encodeURIComponent(parc)}/usages`);
            const [rv, re, ru] = await Promise.all([
              fetchJsonFirst(vehUrls, { headers: h }),
              fetchJsonFirst(evUrls, { headers: h }).catch(() => []),
              fetchJsonFirst(usUrls, { headers: h }).catch(() => []),
            ]);
            setVeh(rv);
            const normalizedEvents = Array.isArray(re) ? re.map(r => ({
              id: r.id,
              type: r.type || 'Rapport',
              date: r.createdAt || r.date || new Date().toISOString(),
              note: r.description || r.note || '',
              createdBy: r.createdBy || r.author || '—',
            })) : [];
            setEvents(normalizedEvents);
            setUsages(Array.isArray(ru) ? ru : []);
          } catch (err) {
            toast({ status: "error", title: "Accès refusé" });
          } finally {
            setLoading(false);
          }
        })();
      }, 250);
    } finally {
      setAuthLoading(false);
    }
  };

  // submit helpers
  const postEvent = async (payload) => {
    try {
      const basePath = getVehiclesPath();
      const urls = buildCandidates(`${basePath}/${encodeURIComponent(parc)}/reports`);
      const r = await fetch(urls[0], {
        method: "POST",
        headers: headersFor(),
        // backend expects { description, usageId?, filesMeta? }
        body: JSON.stringify({ description: payload?.note ? `${payload.type || 'Événement'}: ${payload.note}` : (payload?.type || 'Événement') }),
      });
      if (!r.ok) {
        const err = await r.json().catch(()=>({error:'err'}));
        throw new Error(err?.error || r.statusText || "Erreur");
      }
      const j = await r.json();
      const ev = {
        id: j.id,
        type: 'Rapport',
        date: j.createdAt || new Date().toISOString(),
        note: j.description || '',
        createdBy: j.createdBy || '—',
      };
      setEvents(prev => [ev, ...prev]);
      toast({ status: "success", title: "Événement ajouté" });
      return j;
    } catch (e) {
      console.error(e);
      toast({ status: "error", title: "Impossible d'ajouter l'événement", description: String(e.message) });
      throw e;
    }
  };

  const postUsage = async (payload) => {
    try {
      const basePath = getVehiclesPath();
      const urls = buildCandidates(`${basePath}/${encodeURIComponent(parc)}/usages`);
      const r = await fetch(urls[0], {
        method: "POST",
        headers: headersFor(),
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(()=>({error:'err'}));
        throw new Error(err?.error || r.statusText || "Erreur");
      }
      const j = await r.json();
      setUsages(prev => [j, ...prev]);
      return j;
    } catch (e) {
      console.error(e);
      toast({ status: "error", title: "Impossible d'ajouter l'usage", description: String(e.message) });
      throw e;
    }
  };

  const updateUsage = async (id, payload) => {
    try {
      const urls = buildCandidates(`usages/${encodeURIComponent(id)}`);
      const r = await fetch(urls[0], {
        method: "PUT",
        headers: headersFor(),
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(()=>({error:'err'}));
        throw new Error(err?.error || r.statusText || "Erreur");
      }
      const j = await r.json();
      setUsages(prev => prev.map(u => u.id === j.id ? j : u));
      return j;
    } catch (e) {
      console.error(e);
      toast({ status: "error", title: "Impossible de mettre à jour l'usage", description: String(e.message) });
      throw e;
    }
  };

  // If loading show spinner, if no vehicle and no token -> show authentication form (matricule)
  if (loading) return <Center minH="100vh"><Spinner size="lg" color="blue.500" /></Center>;

  return (
    <Box bg="gray.50" minH="100vh" pb={8}>
      {(!veh) ? (
        <Container maxW="md" py={8}>
          <Box textAlign="center" py={8}>
            <Heading size="lg" mb={4}>🔐 Accès restreint</Heading>
            <Text fontSize="sm" opacity={0.8} mb={8}>
              Ce carnet est accessible uniquement via le QR code du véhicule ou après authentification.
            </Text>

            <Box as="form" onSubmit={onAuthenticate} bg="white" p={6} borderRadius="lg" boxShadow="sm">
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel fontWeight="bold">Votre matricule</FormLabel>
                  <Input 
                    size="lg"
                    value={inputMatricule} 
                    onChange={e => setInputMatricule(e.target.value)} 
                    placeholder="ex: w.belaidi"
                    autoFocus
                  />
                </FormControl>
                <Button 
                  colorScheme="blue" 
                  onClick={onAuthenticate} 
                  isLoading={authLoading}
                  w="full"
                  size="lg"
                >
                  Se connecter
                </Button>
                <Button variant="ghost" onClick={() => nav(-1)} w="full">
                  Retour
                </Button>
              </VStack>
            </Box>

            <Text mt={6} fontSize="xs" opacity={0.6}>
              💡 Astuce : scannez le QR code sur le véhicule pour accéder sans authentification.
            </Text>
          </Box>
        </Container>
      ) : (
        // Main mobile dashboard
        <Container maxW="md" py={4}>
          {/* En-tête du véhicule */}
          <Card mb={6} bg="white" boxShadow="md">
            <CardBody>
              <VStack align="start" spacing={2}>
                <HStack w="full" justify="space-between" align="flex-start">
                  <VStack align="start" spacing={1} flex={1}>
                    <Heading size="lg">{veh.modele || `Parc ${veh.parc}`}</Heading>
                    <Text fontSize="sm" color="gray.600">
                      {veh.immat ? `${veh.immat}` : ''}
                    </Text>
                  </VStack>
                  <Badge colorScheme="blue" fontSize="md" px={3} py={2}>
                    {veh.parc}
                  </Badge>
                </HStack>
                {veh.etat && (
                  <Badge colorScheme="green" fontSize="sm">
                    État: {veh.etat}
                  </Badge>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Actions principales */}
          <VStack spacing={3} mb={6}>
            {!currentUsageId ? (
              <Button 
                colorScheme="orange" 
                size="lg"
                w="full"
                onClick={() => { setFinishMode(false); setShowPassage(true); }}
                fontSize="md"
                py={6}
              >
                🚗 Démarrer un pointage
              </Button>
            ) : (
              <Button 
                colorScheme="green" 
                size="lg"
                w="full"
                onClick={() => { setFinishMode(true); setShowPassage(true); }}
                fontSize="md"
                py={6}
              >
                ✓ Terminer le pointage
              </Button>
            )}
            
            <Button 
              colorScheme="red" 
              variant="outline"
              size="lg"
              w="full"
              onClick={() => setShowAnomaly(true)}
              fontSize="md"
              py={6}
            >
              ⚠️ Signaler une anomalie
            </Button>
            
            <Button 
              colorScheme="blue" 
              variant="outline"
              size="lg"
              w="full"
              onClick={() => setShowEvent(true)}
              fontSize="md"
              py={6}
            >
              📝 Ajouter un événement
            </Button>
          </VStack>

          {/* Derniers événements */}
          <Card mb={6} bg="white" boxShadow="sm">
            <CardBody>
              <Heading size="sm" mb={4}>📋 Derniers événements</Heading>
              <Divider mb={4} />
              <VStack spacing={3} align="stretch">
                {events.length === 0 ? (
                  <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                    Aucun événement
                  </Text>
                ) : (
                  events.slice(0, 5).map(ev => (
                    <Box key={ev.id} p={3} bg="gray.50" borderRadius="md" borderLeft="4px solid #3182ce">
                      <HStack justify="space-between" mb={1}>
                        <Text fontWeight="bold" fontSize="sm">{ev.type}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {new Date(ev.date).toLocaleDateString()}
                        </Text>
                      </HStack>
                      {ev.note && <Text fontSize="sm" mt={2}>{ev.note}</Text>}
                      <Text fontSize="xs" color="gray.600" mt={2}>
                        Par {ev.createdBy || '—'}
                      </Text>
                    </Box>
                  ))
                )}
                {events.length > 5 && (
                  <Text fontSize="xs" color="gray.500" textAlign="center" pt={2}>
                    +{events.length - 5} autre(s) événement(s)
                  </Text>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Derniers passages */}
          <Card bg="white" boxShadow="sm">
            <CardBody>
              <Heading size="sm" mb={4}>🚦 Derniers passages</Heading>
              <Divider mb={4} />
              <VStack spacing={3} align="stretch">
                {usages.length === 0 ? (
                  <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                    Aucun passage
                  </Text>
                ) : (
                  usages.slice(0, 5).map(u => (
                    <Box key={u.id} p={3} bg="gray.50" borderRadius="md" borderLeft="4px solid #ed8936">
                      <HStack justify="space-between" mb={1}>
                        <Text fontWeight="bold" fontSize="sm">{u.conducteur || 'Conducteur'}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {u.startedAt ? new Date(u.startedAt).toLocaleDateString() : '—'}
                        </Text>
                      </HStack>
                      {u.participants && (
                        <Text fontSize="xs" color="gray.600" mt={1}>
                          👥 {u.participants}
                        </Text>
                      )}
                      {u.note && <Text fontSize="xs" mt={2} color="gray.700">{u.note}</Text>}
                    </Box>
                  ))
                )}
                {usages.length > 5 && (
                  <Text fontSize="xs" color="gray.500" textAlign="center" pt={2}>
                    +{usages.length - 5} autre(s) passage(s)
                  </Text>
                )}
              </VStack>
            </CardBody>
          </Card>
        </Container>
      )}

      {/* Modals */}

      {/* Anomaly modal */}
      <Modal isOpen={showAnomaly} onClose={() => setShowAnomaly(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Signaler une anomalie</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <Text fontSize="sm" opacity={0.8}>
                Véhicule : <b>{veh?.parc}</b> {veh?.immat ? `· ${veh.immat}` : ""}
              </Text>
              <FormControl>
                <FormLabel>Type d'anomalie</FormLabel>
                <Input id="anom-type" placeholder="ex: Frein / Porte / Moteur" />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea id="anom-note" placeholder="Décris l'anomalie..." />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowAnomaly(false)}>Annuler</Button>
            <Button colorScheme="red" onClick={async () => {
              const type = document.getElementById("anom-type")?.value || "Anomalie";
              const note = document.getElementById("anom-note")?.value || "";
              try {
                await postEvent({ type: `Anomalie: ${type}`, note });
                setShowAnomaly(false);
              } catch {}
            }}>Signaler</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Passage modal */}
      <Modal isOpen={showPassage} onClose={() => setShowPassage(false)} isCentered onOverlayClick={() => {}}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{finishMode ? 'Terminer le pointage' : 'Démarrer un pointage'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <Text fontSize="sm" opacity={0.8}>Véhicule : <b>{veh?.parc}</b> {veh?.immat ? `· ${veh.immat}` : ""}</Text>
              <FormControl>
                <FormLabel>Conducteur</FormLabel>
                <Input id="pass-conducteur" placeholder="Nom ou matricule" />
              </FormControl>
              {!finishMode && (
                <>
                  <HStack>
                    <FormControl>
                      <FormLabel>Date d'arrivée</FormLabel>
                      <Input type="date" value={arrDate} onChange={(e)=>setArrDate(e.target.value)} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Heure d'arrivée</FormLabel>
                      <Input type="time" value={arrTime} onChange={(e)=>setArrTime(e.target.value)} />
                    </FormControl>
                  </HStack>
                  {arrLoc && <Text fontSize="sm" color="gray.600">📍 Arrivée GPS: {arrLoc.lat.toFixed(5)},{arrLoc.lng.toFixed(5)} (±{Math.round(arrLoc.accuracy)}m)</Text>}
                </>
              )}
              {finishMode && (
                <>
                  <HStack>
                    <FormControl>
                      <FormLabel>Date de sortie</FormLabel>
                      <Input type="date" value={depDate} onChange={(e)=>setDepDate(e.target.value)} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Heure de sortie</FormLabel>
                      <Input type="time" value={depTime} onChange={(e)=>setDepTime(e.target.value)} />
                    </FormControl>
                  </HStack>
                  {depLoc && <Text fontSize="sm" color="gray.600">📍 Sortie GPS: {depLoc.lat.toFixed(5)},{depLoc.lng.toFixed(5)} (±{Math.round(depLoc.accuracy)}m)</Text>}
                </>
              )}
              <FormControl>
                <FormLabel>Membres présents</FormLabel>
                <Input
                  placeholder="Rechercher un adhérent (nom, prénom, n°)"
                  value={memberSearch}
                  onChange={(e)=>setMemberSearch(e.target.value)}
                  onFocus={() => { if (members.length===0) loadMembers(); }}
                />
                <Box mt={2} maxH="180px" overflowY="auto" border="1px solid #eee" borderRadius="md" p={2}>
                  {membersLoading && <Center py={3}><Spinner size="sm"/></Center>}
                  {!membersLoading && members
                    .filter(m => {
                      if (!memberSearch.trim()) return true;
                      const q = memberSearch.toLowerCase();
                      return [m.firstName, m.lastName, m.memberNumber, m.email]
                        .filter(Boolean)
                        .some(v => String(v).toLowerCase().includes(q));
                    })
                    .slice(0, 50)
                    .map(m => {
                      const id = m.id;
                      const checked = selectedMemberIds.includes(id);
                      const label = `${m.lastName?.toUpperCase() || ''} ${m.firstName || ''}${m.memberNumber ? ` · ${m.memberNumber}` : ''}`.trim();
                      return (
                        <HStack key={id} py={1} spacing={3}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e)=>{
                              setSelectedMemberIds(prev => e.target.checked ? [...prev, id] : prev.filter(x=>x!==id));
                            }}
                          />
                          <Text fontSize="sm">{label}</Text>
                        </HStack>
                      );
                    })}
                  {!membersLoading && members.length===0 && (
                    <Text fontSize="sm" opacity={0.7}>Aucun adhérent chargé. Connectez-vous pour voir la liste.</Text>
                  )}
                </Box>
              </FormControl>
              <HStack>
                <FormControl>
                  <FormLabel>Invité - Prénom</FormLabel>
                  <Input value={guestFirstName} onChange={(e)=>setGuestFirstName(e.target.value)} placeholder="Prénom invité" />
                </FormControl>
                <FormControl>
                  <FormLabel>Invité - Nom</FormLabel>
                  <Input value={guestLastName} onChange={(e)=>setGuestLastName(e.target.value)} placeholder="Nom invité" />
                </FormControl>
              </HStack>
              {finishMode && (
                <FormControl>
                  <FormLabel>Actions réalisées</FormLabel>
                  <Textarea value={actionsText} onChange={(e)=>setActionsText(e.target.value)} placeholder="Détaillez les actions réalisées pendant le passage" rows={4} />
                </FormControl>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowPassage(false)}>Annuler</Button>
            <Button colorScheme={finishMode ? 'green' : 'orange'} onClick={async () => {
              const conducteur = document.getElementById("pass-conducteur")?.value || "";
              // Build participants string from selected members + guest
              const selectedMembers = members.filter(m => selectedMemberIds.includes(m.id));
              const memberNames = selectedMembers.map(m => `${m.firstName || ''} ${m.lastName || ''}`.trim()).filter(Boolean);
              const guestName = (guestFirstName || guestLastName) ? `Invité: ${[guestFirstName, guestLastName].filter(Boolean).join(' ')}` : '';
              const participantsStr = [
                conducteur ? `Conducteur: ${conducteur}` : '',
                ...memberNames,
                guestName
              ].filter(Boolean).join('; ');
              const toISO = (d, t) => {
                if (!d && !t) return null;
                const date = d || new Date().toISOString().split('T')[0];
                const time = t || new Date().toTimeString().slice(0,5);
                // Build local datetime then convert to ISO
                const [yy,mm,dd] = date.split('-').map(Number);
                const [HH,MM] = time.split(':').map(Number);
                const dt = new Date(yy, (mm-1), dd, HH, MM, 0);
                return dt.toISOString();
              };
              const startedAtISO = toISO(arrDate, arrTime);
              const endedAtISO = depDate || depTime ? toISO(depDate, depTime) : null;
              try {
                if (!finishMode) {
                  // Start pointage
                  const arrivalNote = arrLoc ? `\nArrivée GPS: ${arrLoc.lat?.toFixed(5)},${arrLoc.lng?.toFixed(5)} (±${Math.round(arrLoc.accuracy||0)}m)` : '';
                  const created = await postUsage({
                    startedAt: startedAtISO || new Date().toISOString(),
                    conducteur: conducteur || null,
                    participants: participantsStr || null,
                    note: arrivalNote || ''
                  });
                  setCurrentUsage(created?.id || null);
                  toast({ status: 'success', title: 'Pointage démarré' });
                } else {
                  // Finish pointage
                  if (!currentUsageId) throw new Error('Aucun pointage en cours');
                  const exitNote = depLoc ? `\nSortie GPS: ${depLoc.lat?.toFixed(5)},${depLoc.lng?.toFixed(5)} (±${Math.round(depLoc.accuracy||0)}m)` : '';
                  const actionsNote = actionsText ? `\nActions:\n${actionsText}` : '';
                  await updateUsage(currentUsageId, {
                    endedAt: endedAtISO || new Date().toISOString(),
                    conducteur: conducteur || null,
                    participants: participantsStr || null,
                    note: `${actionsNote}${exitNote}`.trim()
                  });
                  setCurrentUsage(null);
                  toast({ status: 'success', title: 'Pointage terminé' });
                }
                setShowPassage(false);
                setSelectedMemberIds([]); setGuestFirstName(''); setGuestLastName(''); setMemberSearch('');
                setArrDate(''); setArrTime(''); setDepDate(''); setDepTime(''); setActionsText(''); setArrLoc(null); setDepLoc(null);
              } catch {}
            }}>Signaler</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Generic event modal */}
      <Modal isOpen={showEvent} onClose={() => setShowEvent(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Ajouter un événement</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <Text fontSize="sm" opacity={0.8}>Véhicule : <b>{veh?.parc}</b></Text>
              <FormControl>
                <FormLabel>Type</FormLabel>
                <Input id="evt-type" placeholder="ex: Révision" />
              </FormControl>
              <FormControl>
                <FormLabel>Note</FormLabel>
                <Textarea id="evt-note" placeholder="Détails..." />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowEvent(false)}>Annuler</Button>
            <Button colorScheme="blue" onClick={async () => {
              const type = document.getElementById("evt-type")?.value || "Événement";
              const note = document.getElementById("evt-note")?.value || "";
              try {
                await postEvent({ type, note });
                setShowEvent(false);
              } catch {}
            }}>Ajouter</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
