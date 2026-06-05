/**
 * RétroMail - Interface mail intégrée avec connexion Infomaniak
 * Design cohérent avec le thème RBE/Trilogy
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Flex, Heading, Text, Input, Spinner, Center, VStack, HStack, Button,
  SimpleGrid, Card, CardHeader, CardBody, IconButton, Badge, useToast, 
  Divider, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, 
  ModalFooter, ModalCloseButton, FormControl, FormLabel, Textarea, Select,
  useDisclosure, Avatar, Menu, MenuButton, MenuList, MenuItem,
  useColorModeValue
} from "@chakra-ui/react";
import { 
  FiMail, FiSend, FiTrash2, FiRefreshCw, FiSettings, 
  FiChevronLeft, FiPaperclip, FiEdit, FiInbox, FiArchive, 
  FiFolder, FiCornerUpRight
} from "react-icons/fi";
import { useUser } from "../context/UserContext.jsx";
import { fetchWithCSRF } from "../lib/csrfClient";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Retromail() {
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
    // Si déjà un email complet dans le champ, utiliser tel quel
    if (emailAccount.includes('@')) return emailAccount;
    
    // Identifier l'identifiant de connexion (username)
    let username = '';
    
    // Priorité 1: user.username (ex: w.belaidi)
    if (user?.username && !user.username.includes('@')) {
      username = user.username;
    }
    // Priorité 2: Si user.email est un email externe, extraire la partie avant @
    else if (user?.email && user.email.includes('@')) {
      if (user.email.endsWith('@association-rbe.fr')) {
        // Déjà le bon format
        return user.email;
      } else {
        // Email externe : extraire la partie avant @
        username = user.email.split('@')[0];
      }
    }
    // Priorité 3: matricule
    else if (matricule) {
      username = matricule;
    }
    
    if (!username) return '';
    
    // Construire l'email RBE : <identifiant>@association-rbe.fr
    return `${username}@association-rbe.fr`;
  }, [user, matricule, emailAccount]);

  // Formulaire de composition
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeAttachments, setComposeAttachments] = useState([]);
  
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

  // Créer une URL de téléchargement depuis base64
  const createDownloadUrl = (base64Content, contentType) => {
    try {
      const binaryString = atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: contentType });
      return URL.createObjectURL(blob);
    } catch (err) {
      console.error("Erreur création URL blob:", err);
      return null;
    }
  };

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
      const res = await fetchWithCSRF(`${API}/api/mail/status`, {
        method: 'GET'
      });
      
      if (res.ok) {
        const data = await res.json();
        setIsConnected(data.connected);
        if (data.connected && data.email) {
          setEmailAccount(data.email);
          // Sauvegarder l'état connecté dans sessionStorage
          sessionStorage.setItem('mail_connected', 'true');
          sessionStorage.setItem('mail_account', data.email);
        } else {
          // Nettoyer si pas connecté
          sessionStorage.removeItem('mail_connected');
          sessionStorage.removeItem('mail_account');
        }
      }
    } catch (e) {
      console.warn("Vérification connexion mail échouée:", e);
      sessionStorage.removeItem('mail_connected');
      sessionStorage.removeItem('mail_account');
    } finally {
      setConnectionLoading(false);
    }
  };

  // Charger les emails
  const loadEmails = useCallback(async () => {
    if (!isConnected) return;
    
    setLoading(true);
    try {
      const res = await fetchWithCSRF(`${API}/api/mail/list?folder=${activeFolder}`, {
        method: 'GET'
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
        // Sauvegarder dans sessionStorage pour persistance
        sessionStorage.setItem('mail_connected', 'true');
        sessionStorage.setItem('mail_account', finalEmail);
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
      
      // Nettoyer sessionStorage
      sessionStorage.removeItem('mail_connected');
      sessionStorage.removeItem('mail_account');
      
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

  // Gérer l'upload de pièces jointes
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Limiter la taille totale à 10 MB
    const maxSize = 10 * 1024 * 1024;
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    
    if (totalSize > maxSize) {
      toast({
        title: "Fichiers trop volumineux",
        description: "La taille totale ne doit pas dépasser 10 MB",
        status: "warning",
        duration: 4000
      });
      return;
    }

    try {
      const attachmentsData = await Promise.all(
        files.map(file => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = reader.result.split(',')[1];
              resolve({
                filename: file.name,
                contentType: file.type || 'application/octet-stream',
                size: file.size,
                content: base64
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );

      setComposeAttachments(prev => [...prev, ...attachmentsData]);
      
      toast({
        title: "Fichiers ajoutés",
        description: `${files.length} fichier(s) ajouté(s)`,
        status: "success",
        duration: 2000
      });
    } catch (err) {
      console.error("Erreur upload:", err);
      toast({
        title: "Erreur",
        description: "Impossible de lire les fichiers",
        status: "error",
        duration: 3000
      });
    }
  };

  // Retirer une pièce jointe
  const handleRemoveAttachment = (index) => {
    setComposeAttachments(prev => prev.filter((_, i) => i !== index));
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
      // Construire le corps avec signature
      let finalBody = composeBody;
      
      // Ajouter signature texte
      if (signature) {
        finalBody += '\n\n--\n' + signature;
      }
      
      // Convertir le texte en HTML pour les citations
      const convertToHtml = (text) => {
        const lines = text.split('\n');
        let html = '<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">';
        let inQuote = false;
        let quoteLines = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          if (line.startsWith('> ')) {
            // Ligne citée
            if (!inQuote) {
              inQuote = true;
              quoteLines = [];
            }
            quoteLines.push(line.substring(2));
          } else {
            // Ligne normale
            if (inQuote) {
              // Fermer la citation précédente
              html += '<blockquote style="border-left: 3px solid #ccc; padding-left: 15px; margin: 15px 0; color: #666; background: #f9f9f9; padding: 10px;">';
              html += quoteLines.join('<br>');
              html += '</blockquote>';
              inQuote = false;
              quoteLines = [];
            }
            
            // Ligne vide ou avec contenu
            if (line.trim() === '') {
              html += '<br>';
            } else if (line.startsWith('---') || line.startsWith('Le ') && line.includes('a écrit :')) {
              // Séparateur ou en-tête de citation
              html += '<div style="color: #666; font-size: 12px; margin: 15px 0; font-style: italic;">' + line + '</div>';
            } else if (line.startsWith('De :') || line.startsWith('Date :') || line.startsWith('Objet :') || line.startsWith('A :')) {
              // Métadonnées d'email
              html += '<div style="color: #666; font-size: 12px; margin: 2px 0;"><strong>' + line.split(':')[0] + ' :</strong>' + line.split(':').slice(1).join(':') + '</div>';
            } else {
              html += '<p style="margin: 5px 0;">' + line + '</p>';
            }
          }
        }
        
        // Fermer la dernière citation si nécessaire
        if (inQuote) {
          html += '<blockquote style="border-left: 3px solid #ccc; padding-left: 15px; margin: 15px 0; color: #666; background: #f9f9f9; padding: 10px;">';
          html += quoteLines.join('<br>');
          html += '</blockquote>';
        }
        
        html += '</div>';
        return html;
      };
      
      const htmlBody = convertToHtml(finalBody);
      
      // Ajouter signature image (en HTML)
      let finalHtml = htmlBody;
      if (signatureImage) {
        finalHtml += `<br><img src="${signatureImage}" alt="Signature" style="max-width: 400px;" />`;
      }

      const res = await fetchWithCSRF(`${API}/api/mail/send`, {
        method: 'POST',
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          body: finalBody,  // Texte brut pour fallback
          html: finalHtml,  // Version HTML
          fromName: displayName || undefined,
          attachments: composeAttachments  // Pièces jointes en base64
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
        setComposeAttachments([]);
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
      const res = await fetchWithCSRF(`${API}/api/mail/read/${email.id}?folder=${activeFolder}`, {
        method: 'GET'
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
      <Box p={{ base: 3, md: 4, lg: 6 }}>
        <Heading size={{ base: "md", md: "lg" }} mb={{ base: 4, md: 6 }}>📧 RétroMail</Heading>
        
        <Center minH="50vh">
          <Card maxW="500px" w="100%" bg={cardBg}>
            <CardHeader>
              <Heading size={{ base: "sm", md: "md" }}>📧 RétroMail</Heading>
              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" mt={2}>
                Accédez à vos emails Infomaniak
              </Text>
            </CardHeader>
            <CardBody>
              <VStack spacing={{ base: 3, md: 4 }} align="stretch">
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
    <Box p={{ base: 3, md: 4, lg: 6 }}>
      {/* Header */}
      <Flex 
        direction={{ base: 'column', md: 'row' }}
        justify="space-between" 
        align={{ base: 'stretch', md: 'center' }} 
        mb={{ base: 4, md: 6 }}
        gap={{ base: 3, md: 0 }}
      >
        <Heading size={{ base: "md", md: "lg" }}>📧 RétroMail</Heading>
        <HStack spacing={{ base: 2, md: 3 }} flexWrap="wrap">
          <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" display={{ base: 'none', sm: 'block' }}>
            Connecté : <Badge colorScheme="green" fontSize={{ base: "2xs", md: "xs" }}>{emailAccount}</Badge>
          </Text>
          <Button 
            leftIcon={<FiRefreshCw />} 
            size={{ base: "xs", md: "sm" }}
            variant="outline"
            onClick={loadEmails}
            isLoading={loading}
          >
            Actualiser
          </Button>
          <Button 
            leftIcon={<FiEdit />}
            colorScheme="rbe"
            size={{ base: "xs", md: "sm" }}
            onClick={onComposeOpen}
          >
            Nouveau
          </Button>
          <Menu>
            <MenuButton as={IconButton} icon={<FiSettings />} size={{ base: "xs", md: "sm" }} variant="ghost" />
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
      <Flex 
        gap={{ base: 2, md: 4 }} 
        align="stretch" 
        minH="70vh"
        direction={{ base: selectedEmail ? 'column' : 'column', md: 'row' }}
      >
        {/* Sidebar - Dossiers */}
        <Box 
          w={{ base: 'full', md: '200px' }}
          display={{ base: selectedEmail ? 'none' : 'block', md: 'block' }}
          borderWidth="1px" 
          borderColor={borderColor}
          borderRadius="md" 
          p={{ base: 2, md: 3 }}
          bg={cardBg}
        >
          <VStack align="stretch" spacing={2}>
            <Button
              variant={activeFolder === 'INBOX' ? 'solid' : 'ghost'}
              colorScheme={activeFolder === 'INBOX' ? 'rbe' : 'gray'}
              justifyContent="flex-start"
              leftIcon={<FiInbox />}
              onClick={() => setActiveFolder('INBOX')}
              size={{ base: 'sm', md: 'md' }}
            >
              Boîte de réception
            </Button>
            <Button
              variant={activeFolder === 'SENT' ? 'solid' : 'ghost'}
              colorScheme={activeFolder === 'SENT' ? 'rbe' : 'gray'}
              justifyContent="flex-start"
              leftIcon={<FiSend />}
              onClick={() => setActiveFolder('SENT')}
              size={{ base: 'sm', md: 'md' }}
            >
              Envoyés
            </Button>
            <Button
              variant={activeFolder === 'TRASH' ? 'solid' : 'ghost'}
              colorScheme={activeFolder === 'TRASH' ? 'rbe' : 'gray'}
              justifyContent="flex-start"
              leftIcon={<FiTrash2 />}
              onClick={() => setActiveFolder('TRASH')}
              size={{ base: 'sm', md: 'md' }}
            >
              Corbeille
            </Button>
          </VStack>
        </Box>

        {/* Liste des emails */}
        <Box 
          w={{ base: 'full', md: '350px', lg: '400px' }}
          display={{ base: selectedEmail ? 'none' : 'block', md: 'block' }}
          borderWidth="1px" 
          borderColor={borderColor}
          borderRadius="md" 
          p={{ base: 2, md: 3 }}
          bg={cardBg}
          overflowY="auto"
          maxH="70vh"
        >
          <Input 
            placeholder="Rechercher..." 
            mb={3}
            size={{ base: 'sm', md: 'md' }}
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
                        <VStack align="start" spacing={0} flex="1" minW="0">
                          <Text fontWeight={email.read ? '400' : '700'} fontSize="sm" noOfLines={1}>
                            {email.fromName && email.fromName !== email.from 
                              ? email.fromName 
                              : email.from || "Inconnu"}
                          </Text>
                          {email.fromName && email.fromName !== email.from && (
                            <Text fontSize="xs" color="gray.500" noOfLines={1}>
                              {email.from}
                            </Text>
                          )}
                        </VStack>
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
          w={{ base: 'full', md: 'auto' }}
          display={{ base: selectedEmail ? 'block' : 'none', md: 'block' }}
          borderWidth="1px" 
          borderColor={borderColor}
          borderRadius="md" 
          p={{ base: 2, md: 4 }}
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
            <VStack align="stretch" spacing={{ base: 2, md: 4 }}>
              {/* Bouton retour mobile */}
              <Button
                display={{ base: 'flex', md: 'none' }}
                leftIcon={<FiChevronLeft />}
                size="sm"
                variant="ghost"
                onClick={() => setSelectedEmail(null)}
                alignSelf="flex-start"
              >
                Retour
              </Button>
              
              {/* En-tête de l'email */}
              <Box>
                <Flex justify="space-between" align="start" mb={3}>
                  <Heading size={{ base: "sm", md: "md" }} flex="1">{selectedEmail.subject || "(Sans objet)"}</Heading>
                </Flex>
                <HStack spacing={2}>
                  <Avatar size="sm" name={selectedEmail.fromName || selectedEmail.from} />
                  <Box flex="1">
                    <Text fontWeight="600" fontSize={{ base: "xs", md: "sm" }}>
                      {selectedEmail.fromName && selectedEmail.fromName !== selectedEmail.from 
                        ? selectedEmail.fromName 
                        : selectedEmail.from}
                    </Text>
                    {selectedEmail.fromName && selectedEmail.fromName !== selectedEmail.from && (
                      <Text fontSize="xs" color="gray.500">
                        {selectedEmail.from}
                      </Text>
                    )}
                    <Text fontSize="xs" color="gray.600">
                      {selectedEmail.date ? new Date(selectedEmail.date).toLocaleString('fr-FR') : ''}
                    </Text>
                  </Box>
                </HStack>
              </Box>

              {/* Barre d'actions */}
              <Flex 
                gap={2} 
                p={2} 
                bg={useColorModeValue('gray.50', 'gray.700')} 
                borderRadius="md"
                wrap="wrap"
              >
                <Button
                  leftIcon={<FiChevronLeft />}
                  size={{ base: "xs", md: "sm" }}
                  variant="outline"
                  colorScheme="rbe"
                  onClick={() => {
                    setComposeTo(selectedEmail.from);
                    setComposeSubject(`Re: ${selectedEmail.subject}`);
                    // Format standard de réponse compatible Gmail/Outlook
                    const dateStr = selectedEmail.date ? new Date(selectedEmail.date).toLocaleString('fr-FR', { 
                      dateStyle: 'long', 
                      timeStyle: 'short' 
                    }) : '';
                    const fromName = selectedEmail.fromName || selectedEmail.from;
                    
                    const quotedBody = selectedEmail.body
                      .split('\n')
                      .map(line => '> ' + line)
                      .join('\n');
                    
                    setComposeBody(`\n\nLe ${dateStr}, ${fromName} a écrit :\n\n${quotedBody}`);
                    onComposeOpen();
                  }}
                >
                  Répondre
                </Button>
                <Button
                  leftIcon={<FiArchive />}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: "Archivage",
                      description: "Fonctionnalité en développement",
                      status: "info",
                      duration: 2000
                    });
                  }}
                >
                  Archiver
                </Button>
                <Button
                  leftIcon={<FiFolder />}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: "Classement",
                      description: "Fonctionnalité en développement",
                      status: "info",
                      duration: 2000
                    });
                  }}
                >
                  Classer
                </Button>
                <Button
                  leftIcon={<FiCornerUpRight />}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setComposeTo("");
                    setComposeSubject(`Fwd: ${selectedEmail.subject}`);
                    // Format standard de transfert compatible Gmail/Outlook
                    const dateStr = selectedEmail.date ? new Date(selectedEmail.date).toLocaleString('fr-FR', { 
                      dateStyle: 'long', 
                      timeStyle: 'short' 
                    }) : '';
                    const fromName = selectedEmail.fromName || selectedEmail.from;
                    
                    const quotedBody = selectedEmail.body
                      .split('\n')
                      .map(line => '> ' + line)
                      .join('\n');
                    
                    setComposeBody(`\n\n---------- Message transféré ----------\nDe : ${fromName}\nDate : ${dateStr}\nObjet : ${selectedEmail.subject}\nA : ${selectedEmail.to || ''}\n\n${quotedBody}`);
                    onComposeOpen();
                  }}
                >
                  Transférer
                </Button>
                <Button
                  leftIcon={<FiTrash2 />}
                  size="sm"
                  variant="outline"
                  colorScheme="red"
                  onClick={() => handleDeleteEmail(selectedEmail.id)}
                >
                  Supprimer
                </Button>
              </Flex>

              <Divider />

              <Box>
                {selectedEmail.html ? (
                  <iframe
                    sandbox="allow-same-origin"
                    srcDoc={selectedEmail.html}
                    style={{
                      width: '100%',
                      minHeight: '400px',
                      border: 'none',
                      backgroundColor: 'white'
                    }}
                    onLoad={(e) => {
                      // Ajuster la hauteur de l'iframe au contenu
                      try {
                        const iframe = e.target;
                        iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
                      } catch (err) {
                        console.warn('Impossible d\'ajuster la hauteur de l\'iframe:', err);
                      }
                    }}
                  />
                ) : (
                  <Text whiteSpace="pre-wrap">
                    {selectedEmail.body || "(Contenu vide)"}
                  </Text>
                )}
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
                      {selectedEmail.attachments.map((att, idx) => {
                        const downloadUrl = att.content 
                          ? createDownloadUrl(att.content, att.contentType)
                          : null;
                        
                        return (
                          <Card key={idx} size="sm">
                            <CardBody>
                              <Flex justify="space-between" align="center">
                                <HStack spacing={2}>
                                  <FiPaperclip />
                                  <VStack align="start" spacing={0}>
                                    <Text fontSize="sm" fontWeight="500">{att.filename}</Text>
                                    <Text fontSize="xs" color="gray.500">
                                      {att.contentType} • {(att.size / 1024).toFixed(1)} KB
                                    </Text>
                                  </VStack>
                                </HStack>
                                {downloadUrl && (
                                  <Button 
                                    size="xs" 
                                    colorScheme="rbe"
                                    as="a" 
                                    href={downloadUrl} 
                                    download={att.filename}
                                  >
                                    Télécharger
                                  </Button>
                                )}
                              </Flex>
                            </CardBody>
                          </Card>
                        );
                      })}
                    </VStack>
                  </Box>
                </>
              )}
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
                  fontFamily={mailFont}
                  fontSize="md"
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Police : {mailFont} • {signature && '✅ Signature activée'} {signatureImage && '📸'}
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>
                  <FiPaperclip style={{ display: 'inline', marginRight: '4px' }} />
                  Pièces jointes
                </FormLabel>
                <Input 
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  accept="*/*"
                  pt={1}
                />
                {composeAttachments.length > 0 && (
                  <VStack align="stretch" spacing={2} mt={3}>
                    {composeAttachments.map((att, idx) => (
                      <Flex 
                        key={idx} 
                        p={2} 
                        bg="gray.50" 
                        borderRadius="md" 
                        align="center" 
                        justify="space-between"
                      >
                        <HStack spacing={2}>
                          <FiPaperclip />
                          <Text fontSize="sm">{att.filename}</Text>
                          <Badge fontSize="xs">{(att.size / 1024).toFixed(1)} KB</Badge>
                        </HStack>
                        <IconButton
                          icon={<FiTrash2 />}
                          size="xs"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => handleRemoveAttachment(idx)}
                          aria-label="Retirer"
                        />
                      </Flex>
                    ))}
                  </VStack>
                )}
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
      <Modal isOpen={isSettingsOpen} onClose={onSettingsClose} size="xl">
        <ModalOverlay />
        <ModalContent maxH="90vh" overflowY="auto">
          <ModalHeader>⚙️ Paramètres RétroMail</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} align="stretch">
              {/* Compte connecté */}
              <Box>
                <Heading size="sm" mb={3}>📧 Compte connecté</Heading>
                <VStack align="stretch" spacing={3}>
                  <Flex align="center" gap={2}>
                    <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                      {emailAccount}
                    </Badge>
                  </Flex>
                  <Button 
                    size="sm" 
                    colorScheme="red" 
                    variant="outline"
                    leftIcon={<FiTrash2 />}
                    onClick={handleDisconnect}
                  >
                    🔌 Dissocier ce compte
                  </Button>
                  <Text fontSize="xs" color="gray.500">
                    ⚠️ Cette action révoquera l'accès à votre compte mail jusqu'à la prochaine connexion
                  </Text>
                </VStack>
              </Box>

              <Divider />

              {/* Identité */}
              <Box>
                <Heading size="sm" mb={3}>👤 Identité</Heading>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel fontSize="sm">Nom d'affichage</FormLabel>
                    <Input 
                      placeholder="Votre nom complet"
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        localStorage.setItem('mail_displayName', e.target.value);
                      }}
                    />
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Apparaîtra comme expéditeur de vos emails
                    </Text>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Photo de profil (URL)</FormLabel>
                    <Input 
                      placeholder="https://example.com/photo.jpg"
                      value={profilePhoto}
                      onChange={(e) => {
                        setProfilePhoto(e.target.value);
                        localStorage.setItem('mail_profilePhoto', e.target.value);
                      }}
                    />
                    {profilePhoto && (
                      <HStack mt={2}>
                        <Avatar src={profilePhoto} size="sm" />
                        <Text fontSize="xs" color="gray.600">Aperçu</Text>
                      </HStack>
                    )}
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      💡 Astuce : Uploadez votre photo sur imgur.com ou utilisez Gravatar
                    </Text>
                  </FormControl>
                </VStack>
              </Box>

              <Divider />

              {/* Signature */}
              <Box>
                <Heading size="sm" mb={3}>✍️ Signature</Heading>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel fontSize="sm">Signature texte</FormLabel>
                    <Textarea 
                      placeholder="Cordialement,&#10;Votre nom&#10;Votre fonction"
                      value={signature}
                      rows={4}
                      onChange={(e) => {
                        setSignature(e.target.value);
                        localStorage.setItem('mail_signature', e.target.value);
                      }}
                    />
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Ajoutée automatiquement à la fin de vos messages
                    </Text>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Image de signature (URL)</FormLabel>
                    <Input 
                      placeholder="https://example.com/signature.png"
                      value={signatureImage}
                      onChange={(e) => {
                        setSignatureImage(e.target.value);
                        localStorage.setItem('mail_signatureImage', e.target.value);
                      }}
                    />
                    {signatureImage && (
                      <Box mt={2} p={2} bg="gray.50" borderRadius="md">
                        <img src={signatureImage} alt="Signature" style={{ maxWidth: '100%', maxHeight: '100px' }} />
                      </Box>
                    )}
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      📸 Comme Gmail : uploadez votre signature sur imgur.com puis collez le lien
                    </Text>
                  </FormControl>
                </VStack>
              </Box>

              <Divider />

              {/* Police d'écriture */}
              <Box>
                <Heading size="sm" mb={3}>🔤 Police d'écriture</Heading>
                <FormControl>
                  <FormLabel fontSize="sm">Police par défaut pour vos emails</FormLabel>
                  <Select 
                    value={mailFont}
                    onChange={(e) => {
                      setMailFont(e.target.value);
                      localStorage.setItem('mail_font', e.target.value);
                    }}
                  >
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Comic Sans MS">Comic Sans MS</option>
                    <option value="Trebuchet MS">Trebuchet MS</option>
                    <option value="Calibri">Calibri</option>
                    <option value="Roboto">Roboto</option>
                  </Select>
                  <Text fontSize="sm" mt={2} fontFamily={mailFont}>
                    Aperçu : Ceci est un exemple de texte
                  </Text>
                </FormControl>
              </Box>

              <Divider />

              {/* Informations serveur */}
              <Box>
                <Heading size="sm" mb={3}>ℹ️ Informations</Heading>
                <Text fontSize="sm" color="gray.600">
                  • <strong>Serveur :</strong> Infomaniak (mail.infomaniak.com)
                  <br />
                  • <strong>Protocoles :</strong> IMAP 993 (SSL) + SMTP 587 (STARTTLS)
                  <br />
                  • <strong>Sécurité :</strong> Mots de passe chiffrés en mémoire
                  <br />
                  • <strong>Synchronisation :</strong> Temps réel
                </Text>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="rbe" onClick={onSettingsClose}>
              Enregistrer et fermer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
