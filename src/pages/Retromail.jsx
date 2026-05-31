/**
 * RétroMail - Interface mail intégrée avec connexion Infomaniak
 * Design cohérent avec le thème RBE/Trilogy
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Flex, Heading, Text, Input, Spinner, Center, VStack, HStack, Button,
  SimpleGrid, Card, CardHeader, CardBody, IconButton, Badge, useToast, 
  Divider, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, 
  ModalFooter, ModalCloseButton, FormControl, FormLabel, Textarea,
  useDisclosure, Avatar, Menu, MenuButton, MenuList, MenuItem,
  useColorModeValue
} from "@chakra-ui/react";
import { 
  FiMail, FiSend, FiTrash2, FiRefreshCw, FiSettings, 
  FiChevronLeft, FiPaperclip, FiEdit, FiInbox
} from "react-icons/fi";
import { useUser } from "../context/UserContext.jsx";
import { fetchWithCSRF } from "../lib/csrfClient";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function RetroMail() {
  const { user, matricule } = useUser();
  const toast = useToast();
  const { isOpen: isComposeOpen, onOpen: onComposeOpen, onClose: onComposeClose } = useDisclosure();
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const selectedBg = useColorModeValue('rbe.50', 'rbe.900');

  // États
  const [isConnected, setIsConnected] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(true);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState("INBOX");
  const [showAutoConnectSuggest, setShowAutoConnectSuggest] = useState(false);

  // Formulaire de connexion Infomaniak
  const [emailAccount, setEmailAccount] = useState("");
  const [password, setPassword] = useState("");
  
  // Détecter et construire l'email automatiquement
  const deducedEmail = useMemo(() => {
    // Si déjà un email complet, utiliser tel quel
    if (emailAccount.includes('@')) return emailAccount;
    
    // Si user.email existe, l'utiliser
    if (user?.email && user.email.includes('@')) return user.email;
    
    // Sinon, construire depuis le username/matricule
    const username = user?.username || user?.email || matricule || '';
    if (!username) return '';
    
    // Si le username contient déjà @, c'est un email
    if (username.includes('@')) return username;
    
    // Sinon, ajouter le domaine par défaut
    return `${username}@association-rbe.fr`;
  }, [user, matricule, emailAccount]);

  // Formulaire de composition
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  
  // Paramètres mail
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('mail_displayName') || user?.nom + ' ' + user?.prenom || '');
  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem('mail_profilePhoto') || '');
  const [signature, setSignature] = useState(() => localStorage.getItem('mail_signature') || '');
  const [mailFont, setMailFont] = useState(() => localStorage.getItem('mail_font') || 'Arial');
  const [signatureImage, setSignatureImage] = useState(() => localStorage.getItem('mail_signatureImage') || '');

  // Auto-remplir l'email au montage
  useEffect(() => {
    if (deducedEmail && !emailAccount) {
      setEmailAccount(deducedEmail);
    }
  }, [deducedEmail]);

  // Vérifier la connexion au montage
  useEffect(() => {
    checkConnection();
  }, []);
  
  // Suggérer la connexion auto si l'utilisateur a un email valide
  useEffect(() => {
    if (!isConnected && !connectionLoading && deducedEmail && deducedEmail.includes('@')) {
      // Afficher la suggestion après 1 seconde
      const timer = setTimeout(() => {
        setShowAutoConnectSuggest(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, connectionLoading, deducedEmail]);

  const checkConnection = async () => {
    setConnectionLoading(true);
    try {
      const res = await fetch(`${API}/api/mail/status`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setIsConnected(data.connected);
        if (data.connected && data.email) {
          setEmailAccount(data.email);
        }
      }
    } catch (e) {
      console.warn("Vérification connexion mail échouée:", e);
    } finally {
      setConnectionLoading(false);
    }
  };

  // Charger les emails
  const loadEmails = useCallback(async () => {
    if (!isConnected) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/mail/list?folder=${activeFolder}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de charger les emails",
          status: "error",
          duration: 3000
        });
      }
    } catch (e) {
      console.error("Erreur chargement emails:", e);
      toast({
        title: "Erreur",
        description: e.message,
        status: "error",
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  }, [isConnected, activeFolder, toast]);

  useEffect(() => {
    if (isConnected) {
      loadEmails();
    }
  }, [isConnected, activeFolder, loadEmails]);

  // Connexion à Infomaniak
  const handleConnect = async () => {
    const finalEmail = emailAccount.includes('@') ? emailAccount : deducedEmail;
    
    if (!finalEmail.trim() || !password.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez renseigner votre mot de passe",
        status: "warning",
        duration: 3000
      });
      return;
    }
    
    setShowAutoConnectSuggest(false);

    setLoading(true);
    try {
      const res = await fetchWithCSRF(`${API}/api/mail/connect`, {
        method: 'POST',
        body: JSON.stringify({
          email: finalEmail,
          password: password
        })
      });

      if (res.ok) {
        setIsConnected(true);
        setEmailAccount(finalEmail); // Mémoriser l'email utilisé
        // Note: on garde le mot de passe pour permettre l'autocomplete navigateur
        toast({
          title: "Connecté ! 📧",
          description: `Connecté à ${finalEmail}`,
          status: "success",
          duration: 3000
        });
        await loadEmails();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Échec de connexion");
      }
    } catch (e) {
      console.error("Erreur connexion:", e);
      toast({
        title: "Erreur de connexion",
        description: e.message,
        status: "error",
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  // Déconnexion
  const handleDisconnect = async () => {
    try {
      await fetchWithCSRF(`${API}/api/mail/disconnect`, {
        method: 'POST'
      });
      
      setIsConnected(false);
      setEmails([]);
      setSelectedEmail(null);
      setEmailAccount("");
      
      toast({
        title: "Déconnecté",
        description: "Votre compte mail a été déconnecté",
        status: "info",
        duration: 2000
      });
    } catch (e) {
      console.error("Erreur déconnexion:", e);
    }
  };

  // Envoyer un email
  const handleSendEmail = async () => {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs",
        status: "warning",
        duration: 3000
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithCSRF(`${API}/api/mail/send`, {
        method: 'POST',
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          body: composeBody
        })
      });

      if (res.ok) {
        toast({
          title: "Email envoyé ! 📨",
          description: `Message envoyé à ${composeTo}`,
          status: "success",
          duration: 3000
        });
        
        // Réinitialiser le formulaire
        setComposeTo("");
        setComposeSubject("");
        setComposeBody("");
        onComposeClose();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Échec d'envoi");
      }
    } catch (e) {
      console.error("Erreur envoi:", e);
      toast({
        title: "Erreur d'envoi",
        description: e.message,
        status: "error",
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  // Supprimer un email
  const handleDeleteEmail = async (emailId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet email ?")) return;

    try {
      const res = await fetchWithCSRF(`${API}/api/mail/delete/${emailId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setEmails(emails.filter(e => e.id !== emailId));
        if (selectedEmail?.id === emailId) {
          setSelectedEmail(null);
        }
        toast({
          title: "Email supprimé",
          status: "success",
          duration: 2000
        });
      }
    } catch (e) {
      console.error("Erreur suppression:", e);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'email",
        status: "error",
        duration: 3000
      });
    }
  };

  // Lire un email complet
  const handleReadEmail = async (email) => {
    setSelectedEmail(email); // Afficher immédiatement pour UX
    
    try {
      const res = await fetch(`${API}/api/mail/read/${email.id}?folder=${activeFolder}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setSelectedEmail(data.email); // Mettre à jour avec contenu complet
        
        // Mettre à jour le statut "lu" dans la liste
        setEmails(prev => prev.map(e => 
          e.id === email.id ? { ...e, read: true } : e
        ));
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de charger l'email",
          status: "error",
          duration: 3000
        });
      }
    } catch (e) {
      console.error("Erreur lecture email:", e);
    }
  };

  // Filtrer les emails par recherche
  const filteredEmails = emails.filter(email => {
    const q = searchQuery.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(q) ||
      email.from?.toLowerCase().includes(q) ||
      email.body?.toLowerCase().includes(q)
    );
  });

  // Écran de chargement initial
  if (connectionLoading) {
    return (
      <Box p={6}>
        <Center minH="60vh">
          <VStack spacing={4}>
            <Spinner size="xl" color="rbe.500" />
            <Text color="gray.600">Vérification de la connexion...</Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  // Écran de connexion
  if (!isConnected) {
    return (
      <Box p={6}>
        <Heading size="lg" mb={6}>📧 RétroMail</Heading>
        
        <Center minH="50vh">
          <Card maxW="500px" w="100%" bg={cardBg}>
            <CardHeader>
              <Heading size="md">📧 RétroMail</Heading>
              <Text fontSize="sm" color="gray.600" mt={2}>
                Accédez à vos emails Infomaniak
              </Text>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                {/* Suggestion intelligente */}
                {showAutoConnectSuggest && deducedEmail && (
                  <Card bg="rbe.50" borderColor="rbe.500" borderWidth="1px">
                    <CardBody>
                      <VStack spacing={3} align="stretch">
                        <HStack>
                          <FiMail color="var(--chakra-colors-rbe-500)" />
                          <Text fontWeight="600" fontSize="sm">Connexion rapide détectée</Text>
                        </HStack>
                        <Text fontSize="sm" color="gray.700">
                          Votre login correspond à l'adresse email :<br />
                          <strong>{deducedEmail}</strong>
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          Entrez simplement votre mot de passe Infomaniak pour vous connecter
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                <FormControl>
                  <FormLabel>Adresse email</FormLabel>
                  <Input 
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="login ou email@association-rbe.fr"
                    value={emailAccount}
                    onChange={(e) => {
                      setEmailAccount(e.target.value);
                      setShowAutoConnectSuggest(false);
                    }}
                  />
                  {deducedEmail && deducedEmail !== emailAccount && !emailAccount.includes('@') && (
                    <Text fontSize="xs" color="rbe.600" mt={1}>
                      💡 Sera complété automatiquement en : {deducedEmail}
                    </Text>
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel>Mot de passe Infomaniak</FormLabel>
                  <Input 
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={password}
                    autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleConnect();
                    }}
                  />
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    🔐 Votre mot de passe est chiffré et sécurisé
                  </Text>
                </FormControl>

                <Button 
                  colorScheme="rbe" 
                  onClick={handleConnect}
                  isLoading={loading}
                  leftIcon={<FiMail />}
                  size="lg"
                >
                  Se connecter
                </Button>

                <Divider />

                <Text fontSize="xs" color="gray.500" textAlign="center">
                  ℹ️ Connexion sécurisée IMAP/SMTP avec Infomaniak<br />
                  Votre navigateur peut enregistrer vos identifiants
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </Center>
      </Box>
    );
  }

  // Interface mail principale
  return (
    <Box p={6}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">📧 RétroMail</Heading>
        <HStack spacing={3}>
          <Text fontSize="sm" color="gray.600">
            Connecté : <Badge colorScheme="green">{emailAccount}</Badge>
          </Text>
          <Button 
            leftIcon={<FiRefreshCw />} 
            size="sm" 
            variant="outline"
            onClick={loadEmails}
            isLoading={loading}
          >
            Actualiser
          </Button>
          <Button 
            leftIcon={<FiEdit />}
            colorScheme="rbe"
            size="sm"
            onClick={onComposeOpen}
          >
            Nouveau message
          </Button>
          <Menu>
            <MenuButton as={IconButton} icon={<FiSettings />} size="sm" variant="ghost" />
            <MenuList>
              <MenuItem onClick={onSettingsOpen}>Paramètres</MenuItem>
              <MenuItem onClick={handleDisconnect} color="red.500">
                Déconnecter
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>

      {/* Layout principal */}
      <Flex gap={4} align="stretch" minH="70vh">
        {/* Sidebar - Dossiers */}
        <Box 
          w="200px" 
          borderWidth="1px" 
          borderColor={borderColor}
          borderRadius="md" 
          p={3} 
          bg={cardBg}
        >
          <VStack align="stretch" spacing={2}>
            <Button
              variant={activeFolder === 'INBOX' ? 'solid' : 'ghost'}
              colorScheme={activeFolder === 'INBOX' ? 'rbe' : 'gray'}
              justifyContent="flex-start"
              leftIcon={<FiInbox />}
              onClick={() => setActiveFolder('INBOX')}
            >
              Boîte de réception
            </Button>
            <Button
              variant={activeFolder === 'SENT' ? 'solid' : 'ghost'}
              colorScheme={activeFolder === 'SENT' ? 'rbe' : 'gray'}
              justifyContent="flex-start"
              leftIcon={<FiSend />}
              onClick={() => setActiveFolder('SENT')}
            >
              Envoyés
            </Button>
            <Button
              variant={activeFolder === 'TRASH' ? 'solid' : 'ghost'}
              colorScheme={activeFolder === 'TRASH' ? 'rbe' : 'gray'}
              justifyContent="flex-start"
              leftIcon={<FiTrash2 />}
              onClick={() => setActiveFolder('TRASH')}
            >
              Corbeille
            </Button>
          </VStack>
        </Box>

        {/* Liste des emails */}
        <Box 
          w="350px" 
          borderWidth="1px" 
          borderColor={borderColor}
          borderRadius="md" 
          p={3} 
          bg={cardBg}
          overflowY="auto"
          maxH="70vh"
        >
          <Input 
            placeholder="Rechercher..." 
            mb={3}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {loading ? (
            <Center p={6}>
              <Spinner color="rbe.500" />
            </Center>
          ) : filteredEmails.length === 0 ? (
            <Center p={6}>
              <Text color="gray.600">Aucun email</Text>
            </Center>
          ) : (
            <VStack align="stretch" spacing={2}>
              {filteredEmails.map((email) => (
                <Card
                  key={email.id}
                  size="sm"
                  cursor="pointer"
                  onClick={() => handleReadEmail(email)}
                  bg={selectedEmail?.id === email.id ? selectedBg : cardBg}
                  borderWidth="1px"
                  borderColor={selectedEmail?.id === email.id ? 'rbe.500' : borderColor}
                  _hover={{ borderColor: 'rbe.300' }}
                >
                  <CardBody>
                    <Flex justify="space-between" align="start" mb={1}>
                      <HStack spacing={2} flex="1" minW="0">
                        <Avatar size="xs" name={email.fromName || email.from} />
                        <Text fontWeight={email.read ? '400' : '700'} fontSize="sm" noOfLines={1} flex="1">
                          {email.fromName || email.from || "Inconnu"}
                        </Text>
                      </HStack>
                      {!email.read && <Badge colorScheme="rbe" fontSize="xs">Nouveau</Badge>}
                    </Flex>
                    <Text fontWeight="600" fontSize="sm" noOfLines={1} mb={1}>
                      {email.subject || "(Sans objet)"}
                    </Text>
                    <Text fontSize="xs" color="gray.600" noOfLines={2}>
                      {email.preview || email.body?.substring(0, 80) || ""}
                    </Text>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      {email.date ? new Date(email.date).toLocaleString('fr-FR') : ''}
                    </Text>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          )}
        </Box>

        {/* Lecteur d'email */}
        <Box 
          flex="1" 
          borderWidth="1px" 
          borderColor={borderColor}
          borderRadius="md" 
          p={4} 
          bg={cardBg}
          overflowY="auto"
          maxH="70vh"
        >
          {!selectedEmail ? (
            <Center h="100%">
              <VStack spacing={3}>
                <FiMail size={48} color="gray" />
                <Text color="gray.600">Sélectionnez un email pour le lire</Text>
              </VStack>
            </Center>
          ) : (
            <VStack align="stretch" spacing={4}>
              <Flex justify="space-between" align="start">
                <Box flex="1">
                  <Heading size="md" mb={2}>{selectedEmail.subject || "(Sans objet)"}</Heading>
                  <HStack spacing={2} mb={2}>
                    <Avatar size="sm" name={selectedEmail.from} />
                    <Box>
                      <Text fontWeight="600" fontSize="sm">{selectedEmail.from}</Text>
                      <Text fontSize="xs" color="gray.600">
                        {selectedEmail.date ? new Date(selectedEmail.date).toLocaleString('fr-FR') : ''}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
                <HStack>
                  <IconButton
                    icon={<FiTrash2 />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => handleDeleteEmail(selectedEmail.id)}
                  />
                </HStack>
              </Flex>

              <Divider />

              <Box>
                <Text whiteSpace="pre-wrap">
                  {selectedEmail.body || "(Contenu vide)"}
                </Text>
              </Box>

              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Text fontWeight="600" mb={2}>
                      <FiPaperclip style={{ display: 'inline', marginRight: '8px' }} />
                      Pièces jointes ({selectedEmail.attachments.length})
                    </Text>
                    <VStack align="stretch" spacing={2}>
                      {selectedEmail.attachments.map((att, idx) => (
                        <Card key={idx} size="sm">
                          <CardBody>
                            <Flex justify="space-between" align="center">
                              <Text fontSize="sm">{att.filename}</Text>
                              <Button size="xs" as="a" href={att.url} download>
                                Télécharger
                              </Button>
                            </Flex>
                          </CardBody>
                        </Card>
                      ))}
                    </VStack>
                  </Box>
                </>
              )}

              <Divider />

              <HStack>
                <Button
                  leftIcon={<FiChevronLeft />}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setComposeTo(selectedEmail.from);
                    setComposeSubject(`Re: ${selectedEmail.subject}`);
                    setComposeBody(`\n\n--- Message original ---\n${selectedEmail.body}`);
                    onComposeOpen();
                  }}
                >
                  Répondre
                </Button>
              </HStack>
            </VStack>
          )}
        </Box>
      </Flex>

      {/* Modal - Composer un email */}
      <Modal isOpen={isComposeOpen} onClose={onComposeClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Nouveau message</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Destinataire</FormLabel>
                <Input 
                  type="email"
                  placeholder="email@example.com"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Objet</FormLabel>
                <Input 
                  placeholder="Objet du message"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Message</FormLabel>
                <Textarea 
                  placeholder="Votre message..."
                  rows={10}
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onComposeClose}>
              Annuler
            </Button>
            <Button 
              colorScheme="rbe" 
              leftIcon={<FiSend />}
              onClick={handleSendEmail}
              isLoading={loading}
            >
              Envoyer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal - Paramètres */}
      <Modal isOpen={isSettingsOpen} onClose={onSettingsClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Paramètres RétroMail</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Box>
                <Text fontWeight="600" mb={2}>Compte connecté</Text>
                <Badge colorScheme="green" fontSize="md">{emailAccount}</Badge>
              </Box>

              <Divider />

              <Box>
                <Text fontWeight="600" mb={2}>Informations</Text>
                <Text fontSize="sm" color="gray.600">
                  • Serveur : Infomaniak IMAP/SMTP
                  <br />
                  • Connexion sécurisée : SSL/TLS
                  <br />
                  • Synchronisation automatique
                </Text>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onSettingsClose}>Fermer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
