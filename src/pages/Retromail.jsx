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
  useColorModeValue, useBreakpointValue, Drawer, DrawerOverlay,
  DrawerContent, DrawerHeader, DrawerBody, DrawerCloseButton
} from "@chakra-ui/react";
import { 
  FiMail, FiSend, FiTrash2, FiRefreshCw, FiSettings, 
  FiChevronLeft, FiPaperclip, FiEdit, FiInbox, FiArchive, 
  FiFolder, FiCornerUpRight, FiCornerUpLeft, FiEye, FiDownload, FiShare2, FiX, FiFileText
} from "react-icons/fi";
import { useUser } from "../context/UserContext.jsx";
import { fetchWithCSRF } from "../lib/csrfClient";
import ComposeModal from "../components/ComposeModal.jsx";
import ImageCropper from "../components/ImageCropper.jsx";
import TemplateEditor from "../components/TemplateEditor.jsx";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const parseMailRecipients = (value) => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => parseMailRecipients(item))
      .filter(Boolean);
  }

  return String(value || '')
    .split(/[;,\n\r]+/)
    .map((recipient) => recipient.trim())
    .filter(Boolean);
};

export default function Retromail() {
  const { user, matricule } = useUser();
  const toast = useToast();
  const { isOpen: isComposeOpen, onOpen: onComposeOpen, onClose: onComposeClose } = useDisclosure();
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();
  const { isOpen: isPreviewOpen, onOpen: onPreviewOpen, onClose: onPreviewClose } = useDisclosure();
  const { isOpen: isTemplatesOpen, onOpen: onTemplatesOpen, onClose: onTemplatesClose } = useDisclosure();
  const { isOpen: isTemplatePreviewOpen, onOpen: onTemplatePreviewOpen, onClose: onTemplatePreviewClose } = useDisclosure();
  const { isOpen: isProfilePhotoCropOpen, onOpen: onProfilePhotoCropOpen, onClose: onProfilePhotoCropClose } = useDisclosure();
  const { isOpen: isSignatureCropOpen, onOpen: onSignatureCropOpen, onClose: onSignatureCropClose } = useDisclosure();
  const { isOpen: isTemplateEditorOpen, onOpen: onTemplateEditorOpen, onClose: onTemplateEditorClose } = useDisclosure();
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const selectedBg = useColorModeValue('rbe.50', 'rbe.900');
  const readerActionBg = useColorModeValue('gray.50', 'gray.700');
  const mobileSurfaceBg = useColorModeValue('gray.50', 'gray.900');
  const isMobile = useBreakpointValue({ base: true, md: false }) || false;

  // États
  const [isConnected, setIsConnected] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(true);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState("INBOX");
  const [mobileFoldersOpen, setMobileFoldersOpen] = useState(false);
  const [showAutoConnectSuggest, setShowAutoConnectSuggest] = useState(false);
  const [drafts, setDrafts] = useState(() => {
    // Charger les brouillons depuis localStorage
    try {
      const saved = localStorage.getItem('mail_drafts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentDraftId, setCurrentDraftId] = useState(null);

  const folderOptions = useMemo(() => ([
    { key: 'INBOX', label: 'Boite de reception', icon: FiInbox },
    { key: 'SENT', label: 'Envoyes', icon: FiSend },
    { key: 'DRAFTS', label: 'Brouillons', icon: FiEdit },
    { key: 'TRASH', label: 'Corbeille', icon: FiTrash2 }
  ]), []);

  const activeFolderLabel = useMemo(() => {
    return folderOptions.find((f) => f.key === activeFolder)?.label || activeFolder;
  }, [activeFolder, folderOptions]);

  const changeFolder = useCallback((folderKey) => {
    setActiveFolder(folderKey);
    setSelectedEmail(null);
    setSearchQuery('');
  }, []);

  // Formulaire de connexion Infomaniak
  const [emailAccount, setEmailAccount] = useState("");
  const [password, setPassword] = useState("");
  
  // Détecter et construire l'email automatiquement
  const deducedEmail = useMemo(() => {
    const typedLogin = String(emailAccount || '').trim().toLowerCase();

    // Si déjà un email complet dans le champ, utiliser tel quel
    if (typedLogin.includes('@')) return typedLogin;
    
    // Identifier l'identifiant de connexion (username)
    let username = '';
    
    // Priorité 1: saisie manuelle du login (ex: w.belaidi)
    if (typedLogin) {
      username = typedLogin;
    }
    // Priorité 2: matricule interne (ex: w.belaidi)
    else if (matricule && !String(matricule).includes('@')) {
      username = String(matricule).trim().toLowerCase();
    }
    // Priorité 3: user.username (ex: w.belaidi)
    else if (user?.username && !user.username.includes('@')) {
      username = String(user.username).trim().toLowerCase();
    }
    // Priorité 4: Si user.email est un email externe, extraire la partie avant @
    else if (user?.email && user.email.includes('@')) {
      const userEmail = String(user.email).trim().toLowerCase();
      if (userEmail.endsWith('@association-rbe.fr')) {
        // Déjà le bon format
        return userEmail;
      } else {
        // Email externe : extraire la partie avant @
        username = userEmail.split('@')[0];
      }
    }
    
    if (!username) return '';
    
    // Construire l'email RBE : <identifiant>@association-rbe.fr
    return `${username}@association-rbe.fr`;
  }, [user, matricule, emailAccount]);

  // Formulaire de composition
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeBcc, setComposeBcc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeAttachments, setComposeAttachments] = useState([]);
  
  // Handlers mémorisés pour éviter les re-renders
  const handleComposeToChange = useCallback((e) => {
    setComposeTo(e.target.value);
  }, []);
  
  const handleComposeCcChange = useCallback((e) => {
    setComposeCc(e.target.value);
  }, []);
  
  const handleComposeBccChange = useCallback((e) => {
    setComposeBcc(e.target.value);
  }, []);
  
  const handleComposeSubjectChange = useCallback((e) => {
    setComposeSubject(e.target.value);
  }, []);
  
  const handleComposeBodyChange = useCallback((e) => {
    setComposeBody(e.target.value);
  }, []);
  
  // Prévisualisation de pièce jointe
  const [previewAttachment, setPreviewAttachment] = useState(null);
  
  // Templates d'emails
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState('ALL');
  const [previewingTemplate, setPreviewingTemplate] = useState(null);
  
  // Paramètres mail
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('mail_displayName') || user?.nom + ' ' + user?.prenom || '');
  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem('mail_profilePhoto') || '');
  const [signature, setSignature] = useState(() => localStorage.getItem('mail_signature') || '');
  const [mailFont, setMailFont] = useState(() => localStorage.getItem('mail_font') || 'Arial');
  const [signatureImage, setSignatureImage] = useState(() => localStorage.getItem('mail_signatureImage') || '');

  // Détecter si connecté avec NoReply
  const isNoReplyAccount = useMemo(() => {
    return emailAccount.toLowerCase().includes('noreply@association-rbe.fr');
  }, [emailAccount]);

  // Sauvegarder les brouillons dans localStorage
  const saveDraftsToStorage = useCallback((draftsArray) => {
    try {
      localStorage.setItem('mail_drafts', JSON.stringify(draftsArray));
    } catch (error) {
      console.error('Erreur sauvegarde brouillons:', error);
    }
  }, []);

  // Sauvegarder le brouillon actuel
  const saveDraft = useCallback(() => {
    // Ne sauvegarder que si au moins un champ est rempli
    if (!composeTo.trim() && !composeSubject.trim() && !composeBody.trim() && composeAttachments.length === 0) {
      return;
    }

    const draft = {
      id: currentDraftId || Date.now().toString(),
      to: composeTo,
      subject: composeSubject,
      body: composeBody,
      attachments: composeAttachments,
      savedAt: new Date().toISOString()
    };

    setDrafts(prev => {
      const existingIndex = prev.findIndex(d => d.id === draft.id);
      let newDrafts;
      
      if (existingIndex >= 0) {
        // Mettre à jour le brouillon existant
        newDrafts = [...prev];
        newDrafts[existingIndex] = draft;
      } else {
        // Ajouter un nouveau brouillon
        newDrafts = [draft, ...prev];
      }
      
      saveDraftsToStorage(newDrafts);
      return newDrafts;
    });

    if (!currentDraftId) {
      setCurrentDraftId(draft.id);
    }

    console.log('💾 Brouillon sauvegardé:', draft.id);
  }, [composeTo, composeSubject, composeBody, composeAttachments, currentDraftId, saveDraftsToStorage]);

  // Debounced autosave - sauvegarde 1 seconde après la dernière modification
  useEffect(() => {
    if (!isComposeOpen) return;
    
    const timeoutId = setTimeout(() => {
      saveDraft();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [composeTo, composeSubject, composeBody, composeAttachments, isComposeOpen, saveDraft]);

  // Charger un brouillon
  const loadDraft = useCallback((draft) => {
    setComposeTo(draft.to || '');
    setComposeSubject(draft.subject || '');
    setComposeBody(draft.body || '');
    setComposeAttachments(draft.attachments || []);
    setCurrentDraftId(draft.id);
    
    onComposeOpen();
    setActiveFolder('INBOX'); // Retourner à la boîte de réception
    
    toast({
      title: "Brouillon chargé",
      description: "Vous pouvez continuer votre message",
      status: "info",
      duration: 2000
    });
  }, [onComposeOpen, toast]);

  // Supprimer un brouillon
  const deleteDraft = useCallback((draftId) => {
    setDrafts(prev => {
      const newDrafts = prev.filter(d => d.id !== draftId);
      saveDraftsToStorage(newDrafts);
      return newDrafts;
    });
    
    if (currentDraftId === draftId) {
      setCurrentDraftId(null);
    }
    
    toast({
      title: "Brouillon supprimé",
      status: "success",
      duration: 2000
    });
  }, [currentDraftId, saveDraftsToStorage, toast]);

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
    
    // DRAFTS est géré localement, pas besoin de charger depuis l'API
    if (activeFolder === 'DRAFTS') {
      setEmails([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetchWithCSRF(`${API}/api/mail/list?folder=${activeFolder}`, {
        method: 'GET'
      });
      
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Erreur chargement emails:', errorData);
        toast({
          title: "Erreur",
          description: errorData.error || "Impossible de charger les emails",
          status: "error",
          duration: 3000
        });
        setEmails([]);
      }
    } catch (e) {
      console.error("Erreur chargement emails:", e);
      toast({
        title: "Erreur",
        description: e.message || "Erreur de connexion",
        status: "error",
        duration: 3000
      });
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [isConnected, activeFolder, toast, API]);

  useEffect(() => {
    if (isConnected) {
      loadEmails();
    }
  }, [isConnected, activeFolder, loadEmails]);

  // Connexion à Infomaniak
  const handleConnect = async () => {
    const normalizeMailLogin = (rawEmail) => {
      const normalized = String(rawEmail || '').trim().toLowerCase();

      // Corrige faute de frappe frequente observee en production
      if (normalized.endsWith('@ssociation-rbe.fr')) {
        return normalized.replace('@ssociation-rbe.fr', '@association-rbe.fr');
      }

      return normalized;
    };

    const finalEmail = normalizeMailLogin(emailAccount.includes('@') ? emailAccount : deducedEmail);
    
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

  // Minifier le HTML pour éviter le clipping Gmail (contenu abrégé)
  const minifyHtml = useCallback((html) => {
    if (!html) return html;
    
    // Si petit (< 50KB), pas besoin de minifier
    if (html.length < 50 * 1024) {
      console.log(`📦 HTML petit (${(html.length / 1024).toFixed(1)}KB) - Pas de minification`);
      return html;
    }
    
    // Gmail clippe les emails > 102KB, on doit donc optimiser
    const minified = html
      // Supprimer les commentaires HTML
      .replace(/<!--[\s\S]*?-->/g, '')
      // Supprimer les espaces multiples (en une seule passe)
      .replace(/\s\s+/g, ' ')
      // Supprimer les espaces avant/après les balises
      .replace(/>\s+</g, '><')
      .trim();
    
    const originalSize = (html.length / 1024).toFixed(1);
    const minifiedSize = (minified.length / 1024).toFixed(1);
    const savings = ((1 - minified.length / html.length) * 100).toFixed(0);
    
    console.log(`📦 HTML minifié: ${originalSize}KB → ${minifiedSize}KB (${savings}% réduit)`);
    
    // Si toujours > 102KB après minification, avertir
    if (minified.length > 102 * 1024) {
      console.warn(`⚠️ Email volumineux (${minifiedSize}KB) - Risque de clipping Gmail`);
    }
    
    return minified;
  }, []);

  // Compresser une image si nécessaire
  const compressImage = useCallback(async (file) => {
    return new Promise((resolve) => {
      // Ne compresser que si > 500 KB
      if (file.size <= 500 * 1024 || !file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Réduire si trop grande (max 1920px)
          const maxDimension = 1920;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compresser en JPEG qualité 0.8
          canvas.toBlob(
            (blob) => {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              console.log(`🗜️ Image compressée: ${(file.size/1024).toFixed(0)}KB → ${(compressedFile.size/1024).toFixed(0)}KB`);
              resolve(compressedFile);
            },
            'image/jpeg',
            0.8
          );
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Gérer l'upload de pièces jointes
  const handleFileUpload = useCallback(async (e) => {
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

    // Afficher un toast pour les gros fichiers
    if (totalSize > 2 * 1024 * 1024) {
      toast({
        title: "⏳ Traitement en cours...",
        description: `Compression des images (${(totalSize/1024/1024).toFixed(1)} MB)`,
        status: "info",
        duration: 2000
      });
    }

    try {
      // Compresser les images d'abord
      const processedFiles = await Promise.all(
        files.map(file => compressImage(file))
      );

      const attachmentsData = await Promise.all(
        processedFiles.map(file => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              // Extraire le base64 pur (sans le préfixe data:xxx;base64,)
              const dataUrl = reader.result;
              const base64Match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
              
              if (!base64Match) {
                reject(new Error('Format base64 invalide'));
                return;
              }
              
              // Nettoyer le base64 : supprimer tous les espaces/retours à la ligne
              const base64Clean = base64Match[1].replace(/\s+/g, '');
              
              // Valider que c'est bien du base64
              if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Clean)) {
                reject(new Error('Base64 contient des caractères invalides'));
                return;
              }
              
              resolve({
                filename: file.name,
                contentType: file.type || 'application/octet-stream',
                size: file.size,
                content: base64Clean
              });
            };
            reader.onerror = (error) => {
              console.error('Erreur lecture fichier:', error);
              reject(error);
            };
            reader.readAsDataURL(file);
          });
        })
      );

      setComposeAttachments(prev => [...prev, ...attachmentsData]);
      
      const newTotalSize = attachmentsData.reduce((sum, a) => sum + a.size, 0);
      toast({
        title: "Fichiers ajoutés",
        description: `${files.length} fichier(s) - ${(newTotalSize/1024).toFixed(0)} KB`,
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
  }, [toast]);

  // Retirer une pièce jointe
  const handleRemoveAttachment = useCallback((index) => {
    setComposeAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Prévisualiser une pièce jointe
  const handlePreviewAttachment = (attachment) => {
    setPreviewAttachment(attachment);
    onPreviewOpen();
  };

  // Transférer une pièce jointe (l'ajouter au formulaire de composition)
  const handleForwardAttachment = (attachment) => {
    setComposeAttachments(prev => [...prev, attachment]);
    toast({
      title: "Pièce jointe ajoutée",
      description: `${attachment.filename} ajouté à la composition`,
      status: "success",
      duration: 2000
    });
    onComposeOpen();
  };

  // Déterminer si un fichier est prévisualisable
  const isPreviewable = (contentType) => {
    if (!contentType) return false;
    return (
      contentType.startsWith('image/') ||
      contentType === 'application/pdf' ||
      contentType.startsWith('text/') ||
      contentType === 'application/json'
    );
  };

  // Charger les templates d'emails depuis l'API
  const loadEmailTemplates = useCallback(async () => {
    if (!isNoReplyAccount) return;
    
    setTemplatesLoading(true);
    try {
      const res = await fetchWithCSRF(`${API}/api/email-templates`, {
        method: 'GET'
      });

      if (res.ok) {
        const data = await res.json();
        setEmailTemplates(data.templates || []);
        console.log(`📧 ${data.templates?.length || 0} templates chargés`);
      } else {
        throw new Error('Erreur lors du chargement des templates');
      }
    } catch (error) {
      console.error('Erreur chargement templates:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les templates",
        status: "error",
        duration: 3000
      });
    } finally {
      setTemplatesLoading(false);
    }
  }, [isNoReplyAccount, toast]);

  // Appliquer un template au formulaire de composition
  const applyTemplate = (template) => {
    setComposeSubject(template.subject || '');
    setComposeBody(template.body || '');
    
    toast({
      title: "Template chargé",
      description: `Template "${template.name}" appliqué. Vous pouvez maintenant le modifier.`,
      status: "success",
      duration: 3000
    });
    
    onTemplatesClose();
    onComposeOpen();
  };

  // Prévisualiser un template avant de l'appliquer
  const previewTemplate = useCallback((template, e) => {
    e?.stopPropagation();
    setPreviewingTemplate(template);
    onTemplatePreviewOpen();
  }, [onTemplatePreviewOpen]);

  // Charger les templates quand on se connecte avec NoReply
  useEffect(() => {
    if (isConnected && isNoReplyAccount) {
      loadEmailTemplates();
    }
  }, [isConnected, isNoReplyAccount, loadEmailTemplates]);

  // Envoyer un email
  const handleSendEmail = useCallback(async () => {
    const toRecipients = parseMailRecipients(composeTo);
    const ccRecipients = parseMailRecipients(composeCc);
    const bccRecipients = parseMailRecipients(composeBcc);

    if (toRecipients.length === 0 || !composeSubject.trim() || !composeBody.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs",
        status: "warning",
        duration: 3000
      });
      return;
    }

    // Calculer la taille totale des pièces jointes
    const totalAttachmentSize = composeAttachments.reduce((sum, a) => sum + a.size, 0);
    const isLargeAttachment = totalAttachmentSize > 2 * 1024 * 1024;

    if (isLargeAttachment) {
      toast({
        title: "📤 Envoi en cours...",
        description: `Transmission de ${(totalAttachmentSize/1024/1024).toFixed(1)} MB, patientez...`,
        status: "info",
        duration: 5000,
        isClosable: true
      });
    }

    setIsSending(true);
    try {
      // Construire le corps - composeBody contient déjà le HTML de l'éditeur WYSIWYG
      let finalBody = composeBody;
      
      // Détecter si le contenu est déjà du HTML complet
      const isFullHtml = finalBody.trim().startsWith('<!DOCTYPE') || 
                         finalBody.trim().startsWith('<html') ||
                         finalBody.includes('</html>');
      
      let htmlBody;
      
      if (isFullHtml) {
        // HTML complet (template) - utiliser tel quel sans traitement lourd
        console.log('📄 Template HTML complet - envoi direct');
        htmlBody = finalBody;
      } else {
        // Détecter du vrai HTML formaté (pas juste des <br> de sauts de ligne)
        const hasHtmlTags = /<(div|p|table|h[1-6]|ul|ol|li|span|strong|b|em|i|u|a|img)[>\s]/i.test(finalBody);
        
        if (hasHtmlTags) {
          // HTML partiel (édité avec la barre d'outils WYSIWYG) - wrapper simple
          console.log('🎨 HTML partiel détecté - wrapper simple');
          htmlBody = `<div style="font-family: ${mailFont || 'Arial, sans-serif'}; font-size: 14px; line-height: 1.6; color: #333;">${finalBody}</div>`;
        } else {
          // Texte brut (ou texte avec juste des <br>) - convertir en HTML
          console.log('📝 Texte brut détecté - conversion HTML');
          
          // Si le contenu contient des <br> (générés par l'éditeur), les remplacer par des sauts de ligne
          let textContent = finalBody.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
          
          const convertToHtml = (text) => {
            const lines = text.split('\n');
            let html = `<div style="font-family: ${mailFont || 'Arial, sans-serif'}; font-size: 14px; line-height: 1.6; color: #333;">`;
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
        
        htmlBody = convertToHtml(textContent);
        }
      }
      
      // Traitement rapide pour templates vs emails normaux
      let finalHtml;
      
      if (isFullHtml) {
        // Template complet : traitement minimal
        console.log('⚡ Template complet - traitement rapide');
        finalHtml = htmlBody; // Pas de signature, pas de minification lourde
        
        // Juste ajouter un ID unique pour Gmail
        const uniqueId = Date.now() + Math.random().toString(36).substring(2, 9);
        finalHtml = finalHtml.replace(
          '</body>',
          `<span style="display:none;">${uniqueId}</span></body>`
        );
      } else {
        // Email normal : ajouter signature si nécessaire
        console.log('📧 Email normal - traitement complet');
        
        // Vérifier si la signature est déjà présente dans le contenu
        const signatureHtmlVersion = signature ? signature.split('\n').join('<br>') : '';
        const signatureTextPresent = signature && (
          finalBody.includes(signature) || 
          htmlBody.includes(signature) ||
          htmlBody.includes(signatureHtmlVersion) ||
          (signature.length > 20 && htmlBody.includes(signature.substring(0, 20)))
        );
        const signatureImagePresent = signatureImage && (
          finalBody.includes(signatureImage) || 
          htmlBody.includes(signatureImage)
        );
        
        let signatureHtml = '';
        
        // Ajouter signature texte si elle n'est pas déjà présente
        if (signature && !signatureTextPresent) {
          signatureHtml += '<br><br>' + signatureHtmlVersion;
        }
        
        // Ajouter signature image si elle n'est pas déjà présente
        if (signatureImage && !signatureImagePresent) {
          if (signatureHtml) signatureHtml += '<br>';
          else signatureHtml = '<br><br>';
          signatureHtml += `<img src="${signatureImage}" alt="Signature" style="max-width: 400px; height: auto;" />`;
        }
        
        finalHtml = signatureHtml ? htmlBody + signatureHtml : htmlBody;
        
        // Minifier seulement si nécessaire
        finalHtml = minifyHtml(finalHtml);
      }

      const res = await fetchWithCSRF(`${API}/api/mail/send`, {
        method: 'POST',
        body: JSON.stringify({
          to: toRecipients,
          cc: ccRecipients.length > 0 ? ccRecipients : undefined,
          bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
          subject: composeSubject,
          body: finalBody,  // Texte brut pour fallback
          html: finalHtml,  // Version HTML
          fromName: displayName || undefined,
          attachments: composeAttachments  // Pièces jointes en base64
        })
      });

      if (res.ok) {
        const recipients = [...toRecipients, ...ccRecipients, ...bccRecipients].join(', ');
        toast({
          title: "Email envoyé ! 📨",
          description: `Message envoyé à ${recipients}`,
          status: "success",
          duration: 3000
        });
        
        // Réinitialiser le formulaire
        setComposeTo("");
        setComposeCc("");
        setComposeBcc("");
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
      setIsSending(false);
    }
  }, [composeTo, composeSubject, composeBody, composeAttachments, signature, signatureImage, displayName, mailFont, API, toast, onComposeClose, minifyHtml]);

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
    // Si c'est un brouillon, ouvrir le compositeur avec les données du brouillon
    if (activeFolder === 'DRAFTS') {
      loadDraft(email);
      return;
    }
    
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

  const openReply = useCallback(() => {
    if (!selectedEmail) return;
    setComposeTo(selectedEmail.from);
    setComposeSubject(`Re: ${selectedEmail.subject}`);

    const dateStr = selectedEmail.date ? new Date(selectedEmail.date).toLocaleString('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short'
    }) : '';
    const fromName = selectedEmail.fromName || selectedEmail.from;

    const quotedBody = String(selectedEmail.body || '')
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');

    setComposeBody(`\n\nLe ${dateStr}, ${fromName} a ecrit :\n\n${quotedBody}`);
    onComposeOpen();
  }, [selectedEmail, onComposeOpen]);

  const openForward = useCallback(() => {
    if (!selectedEmail) return;
    setComposeTo('');
    setComposeSubject(`Fwd: ${selectedEmail.subject}`);

    const dateStr = selectedEmail.date ? new Date(selectedEmail.date).toLocaleString('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short'
    }) : '';
    const fromName = selectedEmail.fromName || selectedEmail.from;

    const quotedBody = String(selectedEmail.body || '')
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');

    setComposeBody(`\n\n---------- Message transfere ----------\nDe : ${fromName}\nDate : ${dateStr}\nObjet : ${selectedEmail.subject}\nA : ${selectedEmail.to || ''}\n\n${quotedBody}`);
    onComposeOpen();
  }, [selectedEmail, onComposeOpen]);

  const notifyComingSoon = useCallback((featureName) => {
    toast({
      title: featureName,
      description: 'Fonctionnalite en developpement',
      status: 'info',
      duration: 1800
    });
  }, [toast]);

  // Filtrer les emails par recherche
  const sourceEmails = activeFolder === 'DRAFTS' ? drafts : emails;
  
  const filteredEmails = sourceEmails.filter(email => {
    const q = searchQuery.toLowerCase();
    
    // Pour les brouillons
    if (activeFolder === 'DRAFTS') {
      return (
        email.subject?.toLowerCase().includes(q) ||
        email.to?.toLowerCase().includes(q) ||
        email.body?.toLowerCase().includes(q)
      );
    }
    
    // Pour les emails normaux
    return (
      email.subject?.toLowerCase().includes(q) ||
      email.from?.toLowerCase().includes(q) ||
      email.body?.toLowerCase().includes(q)
    );
  });
  const unreadCount = activeFolder === 'DRAFTS' ? 0 : emails.filter((email) => !email.read).length;
  const folderCount = activeFolder === 'DRAFTS' ? drafts.length : emails.length;
  const listHeight = selectedEmail ? 'calc(100dvh - 180px)' : 'calc(100dvh - 210px)';

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
    <Box p={{ base: 2, md: 4, lg: 6 }} bg={{ base: mobileSurfaceBg, md: 'transparent' }} minH="100%">
      {/* Header */}
      <Flex 
        direction={{ base: 'column', md: 'row' }}
        justify="space-between" 
        align={{ base: 'stretch', md: 'center' }} 
        mb={{ base: 4, md: 6 }}
        gap={{ base: 3, md: 0 }}
      >
        <VStack align="start" spacing={1}>
          <Heading size={{ base: "md", md: "lg" }}>📧 RétroMail</Heading>
          <HStack display={{ base: 'flex', md: 'none' }} spacing={2} color="gray.600" fontSize="xs">
            <Badge colorScheme="green" fontSize="2xs" maxW="180px" overflow="hidden" textOverflow="ellipsis">
              {emailAccount}
            </Badge>
            <Text>{folderCount} message(s)</Text>
            {unreadCount > 0 && <Badge colorScheme="rbe" fontSize="2xs">{unreadCount} non lu(s)</Badge>}
          </HStack>
        </VStack>
        <HStack spacing={{ base: 2, md: 3 }} flexWrap="wrap" justify={{ base: 'space-between', md: 'flex-end' }}>
          {isMobile && (
            <Button
              leftIcon={<FiFolder />}
              size="sm"
              variant="outline"
              onClick={() => setMobileFoldersOpen(true)}
            >
              {activeFolderLabel}
            </Button>
          )}
          <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" display={{ base: 'none', sm: 'block' }}>
            Connecté : <Badge colorScheme="green" fontSize={{ base: "2xs", md: "xs" }}>{emailAccount}</Badge>
          </Text>
          <Button 
            leftIcon={<FiRefreshCw />} 
            size={{ base: "sm", md: "sm" }}
            variant="outline"
            onClick={loadEmails}
            isLoading={loading}
          >
            Actualiser
          </Button>
          <Button 
            leftIcon={<FiEdit />}
            colorScheme="rbe"
            size={{ base: "sm", md: "sm" }}
            onClick={onComposeOpen}
          >
            Nouveau
          </Button>
          <Menu>
            <MenuButton as={IconButton} icon={<FiSettings />} size={{ base: "sm", md: "sm" }} variant="ghost" aria-label="Parametres RétroMail" />
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
        minH={{ base: 'calc(100vh - 180px)', md: '70vh' }}
        direction={{ base: selectedEmail ? 'column' : 'column', md: 'row' }}
      >
        {/* Sidebar - Dossiers */}
        <Box 
          w={{ base: 'full', md: '220px' }}
          display={{ base: 'none', md: 'block' }}
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
              onClick={() => changeFolder('INBOX')}
              size={{ base: 'sm', md: 'md' }}
            >
              Boîte de réception
            </Button>
            <Button
              variant={activeFolder === 'SENT' ? 'solid' : 'ghost'}
              colorScheme={activeFolder === 'SENT' ? 'rbe' : 'gray'}
              justifyContent="flex-start"
              leftIcon={<FiSend />}
              onClick={() => changeFolder('SENT')}
              size={{ base: 'sm', md: 'md' }}
            >
              Envoyés
            </Button>
            <Button
              variant={activeFolder === 'DRAFTS' ? 'solid' : 'ghost'}
              colorScheme={activeFolder === 'DRAFTS' ? 'rbe' : 'gray'}
              justifyContent="flex-start"
              leftIcon={<FiEdit />}
              onClick={() => changeFolder('DRAFTS')}
              size={{ base: 'sm', md: 'md' }}
              position="relative"
            >
              Brouillons
              {drafts.length > 0 && (
                <Badge
                  ml={2}
                  colorScheme="purple"
                  borderRadius="full"
                  px={2}
                  fontSize="xs"
                >
                  {drafts.length}
                </Badge>
              )}
            </Button>
            <Button
              variant={activeFolder === 'TRASH' ? 'solid' : 'ghost'}
              colorScheme={activeFolder === 'TRASH' ? 'rbe' : 'gray'}
              justifyContent="flex-start"
              leftIcon={<FiTrash2 />}
              onClick={() => changeFolder('TRASH')}
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
          h={{ base: listHeight, md: '70vh' }}
          maxH={{ base: 'none', md: '70vh' }}
        >
          <Box position="sticky" top={0} zIndex={2} bg={cardBg} pb={2}>
            <HStack align="center" mb={1}>
              <Input 
                placeholder="Rechercher..." 
                size={{ base: 'sm', md: 'md' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <IconButton
                  icon={<FiX />}
                  aria-label="Effacer la recherche"
                  size="sm"
                  variant="ghost"
                  onClick={() => setSearchQuery('')}
                />
              )}
            </HStack>
            <HStack justify="space-between" fontSize="xs" color="gray.500">
              <Text>{filteredEmails.length} / {folderCount} message(s)</Text>
              <Text display={{ base: 'block', md: 'none' }}>{activeFolderLabel}</Text>
            </HStack>
          </Box>

          {loading ? (
            <Center p={6}>
              <Spinner color="rbe.500" />
            </Center>
          ) : filteredEmails.length === 0 ? (
            <Center p={6}>
              <VStack spacing={2}>
                <Text color="gray.600">
                  {activeFolder === 'DRAFTS' ? 'Aucun brouillon' : 
                   activeFolder === 'SENT' ? 'Aucun email envoyé' :
                   activeFolder === 'TRASH' ? 'Corbeille vide' : 
                   'Aucun email'}
                </Text>
                {activeFolder === 'DRAFTS' && (
                  <Text fontSize="xs" color="gray.500">
                    Les brouillons sont sauvegardés automatiquement
                  </Text>
                )}
              </VStack>
            </Center>
          ) : (
            <VStack align="stretch" spacing={2}>
              {filteredEmails.map((email) => {
                // Adapter l'affichage selon le type (brouillon ou email normal)
                const isDraft = activeFolder === 'DRAFTS';
                const displayName = isDraft ? email.to : (email.fromName || email.from || "Inconnu");
                const displaySubName = isDraft ? null : (email.fromName && email.fromName !== email.from ? email.from : null);
                
                return (
                <Card
                  key={email.id}
                  size="sm"
                  cursor="pointer"
                  onClick={() => handleReadEmail(email)}
                  bg={selectedEmail?.id === email.id ? selectedBg : cardBg}
                  borderWidth="1px"
                  borderColor={selectedEmail?.id === email.id ? 'rbe.500' : borderColor}
                  _hover={{ borderColor: 'rbe.300' }}
                  borderRadius="md"
                >
                  <CardBody py={{ base: 3, md: 2 }} px={{ base: 3, md: 3 }}>
                    <Flex justify="space-between" align="start" mb={1}>
                      <HStack spacing={2} flex="1" minW="0">
                        <Avatar size="xs" name={displayName} />
                        <VStack align="start" spacing={0} flex="1" minW="0">
                          <Text fontWeight={email.read ? '400' : '700'} fontSize="sm" noOfLines={1}>
                            {isDraft ? `À: ${displayName}` : displayName}
                          </Text>
                          {displaySubName && (
                            <Text fontSize="xs" color="gray.500" noOfLines={1}>
                              {displaySubName}
                            </Text>
                          )}
                        </VStack>
                      </HStack>
                      {!email.read && !isDraft && <Badge colorScheme="rbe" fontSize="2xs">Nouveau</Badge>}
                      {isDraft && <Badge colorScheme="purple" fontSize="2xs">Brouillon</Badge>}
                    </Flex>
                    <Text fontWeight="600" fontSize="sm" noOfLines={1} mb={1}>
                      {email.subject || "(Sans objet)"}
                    </Text>
                    <Text fontSize="xs" color="gray.600" noOfLines={2}>
                      {email.preview || email.body?.substring(0, 80) || ""}
                    </Text>
                    <HStack justify="space-between" mt={1} color="gray.500">
                    <Text fontSize="xs" noOfLines={1}>
                      {email.date ? new Date(email.date).toLocaleString('fr-FR') : (email.savedAt ? new Date(email.savedAt).toLocaleString('fr-FR') : '')}
                    </Text>
                    {email.attachments?.length > 0 && (
                      <HStack spacing={1} fontSize="xs">
                        <FiPaperclip />
                        <Text>{email.attachments.length}</Text>
                      </HStack>
                    )}
                    </HStack>
                  </CardBody>
                </Card>
                );
              })}
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
          h={{ base: 'calc(100dvh - 150px)', md: '70vh' }}
          maxH={{ base: 'none', md: '70vh' }}
          sx={{ overscrollBehavior: 'contain' }}
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
              {/* En-tête de l'email */}
              <Box position={{ base: 'sticky', md: 'static' }} top={0} zIndex={2} bg={cardBg} pb={{ base: 2, md: 0 }}>
                <Flex justify="space-between" align="start" mb={3} gap={2}>
                  <IconButton
                    display={{ base: 'inline-flex', md: 'none' }}
                    icon={<FiChevronLeft />}
                    size="sm"
                    variant="ghost"
                    aria-label="Retour a la liste"
                    onClick={() => setSelectedEmail(null)}
                  />
                  <Heading size={{ base: "sm", md: "md" }} flex="1" noOfLines={{ base: 2, md: 3 }}>{selectedEmail.subject || "(Sans objet)"}</Heading>
                </Flex>
                <HStack spacing={2} align="start">
                  <Avatar size="sm" name={selectedEmail.fromName || selectedEmail.from} />
                  <Box flex="1" minW="0">
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
                bg={readerActionBg} 
                borderRadius="md"
                wrap="wrap"
                position={{ base: 'sticky', md: 'static' }}
                bottom={{ base: 0, md: 'auto' }}
                zIndex={3}
                borderWidth={{ base: '1px', md: 0 }}
                borderColor={borderColor}
                justify={{ base: 'space-between', md: 'flex-start' }}
              >
                {isMobile ? (
                  <>
                    <Button
                      leftIcon={<FiCornerUpLeft />}
                      size="sm"
                      variant="outline"
                      colorScheme="rbe"
                      onClick={openReply}
                      flex="1"
                    >
                      Repondre
                    </Button>
                    <Button
                      leftIcon={<FiCornerUpRight />}
                      size="sm"
                      variant="outline"
                      onClick={openForward}
                      flex="1"
                    >
                      Transferer
                    </Button>
                    <Menu>
                      <MenuButton as={Button} size="sm" variant="ghost" leftIcon={<FiSettings />}>
                        Plus
                      </MenuButton>
                      <MenuList>
                        <MenuItem icon={<FiArchive />} onClick={() => notifyComingSoon('Archivage')}>Archiver</MenuItem>
                        <MenuItem icon={<FiFolder />} onClick={() => notifyComingSoon('Classement')}>Classer</MenuItem>
                        <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => handleDeleteEmail(selectedEmail.id)}>Supprimer</MenuItem>
                      </MenuList>
                    </Menu>
                  </>
                ) : (
                  <>
                <Button
                  leftIcon={<FiChevronLeft />}
                  size={{ base: "xs", md: "sm" }}
                  variant="outline"
                  colorScheme="rbe"
                  onClick={openReply}
                >
                  Répondre
                </Button>
                <Button
                  leftIcon={<FiArchive />}
                  size="sm"
                  variant="outline"
                  onClick={() => notifyComingSoon('Archivage')}
                >
                  Archiver
                </Button>
                <Button
                  leftIcon={<FiFolder />}
                  size="sm"
                  variant="outline"
                  onClick={() => notifyComingSoon('Classement')}
                >
                  Classer
                </Button>
                <Button
                  leftIcon={<FiCornerUpRight />}
                  size="sm"
                  variant="outline"
                  onClick={openForward}
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
                  </>
                )}
              </Flex>

              <Divider />

              <Box>
                {selectedEmail.html ? (
                  <iframe
                    sandbox="allow-same-origin"
                    srcDoc={selectedEmail.html}
                    style={{
                      width: '100%',
                      minHeight: isMobile ? '58dvh' : '400px',
                      border: 'none',
                      backgroundColor: 'white',
                      borderRadius: '8px'
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
                  <Text whiteSpace="pre-wrap" fontSize={{ base: 'sm', md: 'md' }} lineHeight="1.7">
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
                        const canPreview = isPreviewable(att.contentType);
                        
                        return (
                          <Card key={idx} size="sm" bg={cardBg}>
                            <CardBody>
                              <Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} gap={3} direction={{ base: 'column', md: 'row' }}>
                                <HStack spacing={2} flex={1} minW="0">
                                  <FiPaperclip />
                                  <VStack align="start" spacing={0} minW="0">
                                    <Text fontSize="sm" fontWeight="500" noOfLines={1}>{att.filename}</Text>
                                    <Text fontSize="xs" color="gray.500">
                                      {att.contentType} • {(att.size / 1024).toFixed(1)} KB
                                    </Text>
                                  </VStack>
                                </HStack>
                                <HStack spacing={1} justify={{ base: 'flex-end', md: 'flex-start' }}>
                                  {canPreview && (
                                    <IconButton
                                      icon={<FiEye />}
                                      size="xs"
                                      colorScheme="blue"
                                      variant="ghost"
                                      onClick={() => handlePreviewAttachment(att)}
                                      aria-label="Aperçu"
                                      title="Aperçu"
                                    />
                                  )}
                                  <IconButton
                                    icon={<FiShare2 />}
                                    size="xs"
                                    colorScheme="green"
                                    variant="ghost"
                                    onClick={() => handleForwardAttachment(att)}
                                    aria-label="Transférer"
                                    title="Transférer"
                                  />
                                  {downloadUrl && (
                                    <Button 
                                      size="xs" 
                                      colorScheme="rbe"
                                      leftIcon={<FiDownload />}
                                      as="a" 
                                      href={downloadUrl} 
                                      download={att.filename}
                                    >
                                      Télécharger
                                    </Button>
                                  )}
                                </HStack>
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
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={onComposeClose}
        composeTo={composeTo}
        composeCc={composeCc}
        composeBcc={composeBcc}
        composeSubject={composeSubject}
        composeBody={composeBody}
        onComposeToChange={handleComposeToChange}
        onComposeCcChange={handleComposeCcChange}
        onComposeBccChange={handleComposeBccChange}
        onComposeSubjectChange={handleComposeSubjectChange}
        onComposeBodyChange={handleComposeBodyChange}
        composeAttachments={composeAttachments}
        onFileUpload={handleFileUpload}
        onRemoveAttachment={handleRemoveAttachment}
        onSendEmail={handleSendEmail}
        isSending={isSending}
        mailFont={mailFont}
        signature={signature}
        signatureImage={signatureImage}
        isNoReplyAccount={isNoReplyAccount}
        onOpenTemplates={onTemplatesOpen}
        onOpenTemplateEditor={onTemplateEditorOpen}
      />

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
                    <FormLabel fontSize="sm">Photo de profil</FormLabel>
                    <VStack align="stretch" spacing={2}>
                      {profilePhoto ? (
                        <Flex gap={3} align="center">
                          <Avatar src={profilePhoto} size="lg" />
                          <VStack align="start" spacing={1} flex={1}>
                            <Text fontSize="xs" color="gray.600">Photo enregistrée</Text>
                            <HStack>
                              <Button
                                size="xs"
                                leftIcon={<FiEdit />}
                                onClick={onProfilePhotoCropOpen}
                              >
                                Modifier
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => {
                                  setProfilePhoto('');
                                  localStorage.removeItem('mail_profilePhoto');
                                  toast({
                                    title: "Photo supprimée",
                                    status: "success",
                                    duration: 2000
                                  });
                                }}
                              >
                                Supprimer
                              </Button>
                            </HStack>
                          </VStack>
                        </Flex>
                      ) : (
                        <Button
                          leftIcon={<FiPaperclip />}
                          onClick={onProfilePhotoCropOpen}
                          variant="outline"
                        >
                          📸 Ajouter une photo de profil
                        </Button>
                      )}
                      <Text fontSize="xs" color="gray.500">
                        💡 Comme Gmail : la photo s'affichera dans les clients mail des destinataires
                      </Text>
                    </VStack>
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
                    <FormLabel fontSize="sm">Image de signature</FormLabel>
                    <VStack align="stretch" spacing={2}>
                      {signatureImage ? (
                        <VStack align="stretch" spacing={2}>
                          <Box p={2} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                            <img src={signatureImage} alt="Signature" style={{ maxWidth: '100%', maxHeight: '120px' }} />
                          </Box>
                          <HStack>
                            <Button
                              size="xs"
                              leftIcon={<FiEdit />}
                              onClick={onSignatureCropOpen}
                            >
                              Modifier
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => {
                                setSignatureImage('');
                                localStorage.removeItem('mail_signatureImage');
                                toast({
                                  title: "Signature supprimée",
                                  status: "success",
                                  duration: 2000
                                });
                              }}
                            >
                              Supprimer
                            </Button>
                          </HStack>
                        </VStack>
                      ) : (
                        <Button
                          leftIcon={<FiPaperclip />}
                          onClick={onSignatureCropOpen}
                          variant="outline"
                        >
                          ✍️ Ajouter une signature image
                        </Button>
                      )}
                      <Text fontSize="xs" color="gray.500">
                        📸 Comme Gmail : créez votre signature graphique et importez-la
                      </Text>
                    </VStack>
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

      {/* Modal - Prévisualisation de pièce jointe */}
      <Modal isOpen={isPreviewOpen} onClose={onPreviewClose} size="6xl">
        <ModalOverlay />
        <ModalContent maxH="90vh">
          <ModalHeader>
            <Flex justify="space-between" align="center">
              <HStack spacing={3}>
                <FiEye />
                <VStack align="start" spacing={0}>
                  <Text>{previewAttachment?.filename || 'Aperçu'}</Text>
                  <Text fontSize="xs" fontWeight="normal" color="gray.500">
                    {previewAttachment?.contentType} • {previewAttachment ? (previewAttachment.size / 1024).toFixed(1) : 0} KB
                  </Text>
                </VStack>
              </HStack>
              <HStack>
                {previewAttachment?.content && (
                  <>
                    <Button
                      size="sm"
                      leftIcon={<FiShare2 />}
                      colorScheme="green"
                      variant="ghost"
                      onClick={() => {
                        handleForwardAttachment(previewAttachment);
                        onPreviewClose();
                      }}
                    >
                      Transférer
                    </Button>
                    <Button
                      size="sm"
                      leftIcon={<FiDownload />}
                      colorScheme="rbe"
                      as="a"
                      href={createDownloadUrl(previewAttachment.content, previewAttachment.contentType)}
                      download={previewAttachment.filename}
                    >
                      Télécharger
                    </Button>
                  </>
                )}
              </HStack>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto">
            {previewAttachment && previewAttachment.content ? (
              <Box>
                {/* Images */}
                {previewAttachment.contentType?.startsWith('image/') && (
                  <Center>
                    <img
                      src={`data:${previewAttachment.contentType};base64,${previewAttachment.content}`}
                      alt={previewAttachment.filename}
                      style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                    />
                  </Center>
                )}

                {/* PDFs */}
                {previewAttachment.contentType === 'application/pdf' && (
                  <Box w="100%" h="70vh">
                    <iframe
                      src={`data:application/pdf;base64,${previewAttachment.content}`}
                      width="100%"
                      height="100%"
                      style={{ border: 'none' }}
                      title={previewAttachment.filename}
                    />
                  </Box>
                )}

                {/* Texte / JSON */}
                {(previewAttachment.contentType?.startsWith('text/') || 
                  previewAttachment.contentType === 'application/json') && (
                  <Box
                    as="pre"
                    p={4}
                    bg="gray.50"
                    borderRadius="md"
                    fontSize="sm"
                    fontFamily="monospace"
                    overflowX="auto"
                    maxH="70vh"
                    overflowY="auto"
                  >
                    {(() => {
                      try {
                        const decoded = atob(previewAttachment.content);
                        return decoded;
                      } catch (e) {
                        return 'Erreur de décodage du contenu';
                      }
                    })()}
                  </Box>
                )}

                {/* Type non prévisualisable */}
                {!isPreviewable(previewAttachment.contentType) && (
                  <Center h="300px">
                    <VStack spacing={4}>
                      <FiPaperclip size={48} color="gray" />
                      <Text color="gray.500">Aperçu non disponible pour ce type de fichier</Text>
                      <Button
                        colorScheme="rbe"
                        leftIcon={<FiDownload />}
                        as="a"
                        href={createDownloadUrl(previewAttachment.content, previewAttachment.contentType)}
                        download={previewAttachment.filename}
                      >
                        Télécharger pour ouvrir
                      </Button>
                    </VStack>
                  </Center>
                )}
              </Box>
            ) : (
              <Center h="300px">
                <Text color="gray.500">Aucun contenu à afficher</Text>
              </Center>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Modal - Sélection de templates d'emails */}
      <Modal isOpen={isTemplatesOpen} onClose={onTemplatesClose} size="4xl">
        <ModalOverlay />
        <ModalContent maxH="80vh">
          <ModalHeader>
            <Flex justify="space-between" align="center">
              <HStack spacing={3}>
                <FiFileText size={24} />
                <VStack align="start" spacing={0}>
                  <Text>Templates d'emails</Text>
                  <Text fontSize="sm" fontWeight="normal" color="gray.500">
                    Sélectionnez un template pour le modifier et l'envoyer
                  </Text>
                </VStack>
              </HStack>
              {templatesLoading && <Spinner size="sm" />}
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto">
            {templatesLoading ? (
              <Center py={10}>
                <VStack spacing={3}>
                  <Spinner size="xl" color="purple.500" />
                  <Text color="gray.500">Chargement des templates...</Text>
                </VStack>
              </Center>
            ) : emailTemplates.length === 0 ? (
              <Center py={10}>
                <VStack spacing={3}>
                  <FiFileText size={48} color="gray.400" />
                  <Text color="gray.500">Aucun template disponible</Text>
                  <Text fontSize="sm" color="gray.400">
                    Créez des templates depuis l'espace Administration
                  </Text>
                </VStack>
              </Center>
            ) : (
              <VStack spacing={4} align="stretch">
                {/* Filtre par catégorie */}
                <Flex gap={2} flexWrap="wrap">
                  <Button
                    size="sm"
                    variant={selectedTemplateFilter === 'ALL' ? 'solid' : 'outline'}
                    colorScheme="purple"
                    onClick={() => setSelectedTemplateFilter('ALL')}
                  >
                    Tous ({emailTemplates.length})
                  </Button>
                  {['WELCOME', 'TICKETS', 'EVENTS', 'FINANCE', 'MEMBERSHIP', 'VEHICLES', 'ADMIN', 'CUSTOM'].map(cat => {
                    const count = emailTemplates.filter(t => t.category === cat).length;
                    if (count === 0) return null;
                    return (
                      <Button
                        key={cat}
                        size="sm"
                        variant={selectedTemplateFilter === cat ? 'solid' : 'outline'}
                        colorScheme="purple"
                        onClick={() => setSelectedTemplateFilter(cat)}
                      >
                        {cat} ({count})
                      </Button>
                    );
                  })}
                </Flex>

                {/* Liste des templates */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  {emailTemplates
                    .filter(t => selectedTemplateFilter === 'ALL' || t.category === selectedTemplateFilter)
                    .map(template => (
                      <Card 
                        key={template.id} 
                        variant="outline" 
                        cursor="pointer"
                        _hover={{ borderColor: 'purple.500', shadow: 'md', transform: 'translateY(-2px)' }}
                        transition="all 0.2s"
                        onClick={() => applyTemplate(template)}
                      >
                        <CardBody>
                          <VStack align="start" spacing={3}>
                            <Flex justify="space-between" w="100%" align="start">
                              <VStack align="start" spacing={1} flex={1}>
                                <Text fontWeight="600" fontSize="md">
                                  {template.name}
                                </Text>
                                {template.description && (
                                  <Text fontSize="sm" color="gray.600" noOfLines={2}>
                                    {template.description}
                                  </Text>
                                )}
                              </VStack>
                              <Badge colorScheme="purple" fontSize="xs">
                                {template.category}
                              </Badge>
                            </Flex>
                            
                            <Divider />
                            
                            <VStack align="start" spacing={1} w="100%">
                              <Text fontSize="xs" fontWeight="600" color="gray.500">
                                Objet :
                              </Text>
                              <Text fontSize="sm" noOfLines={1} color="gray.700" fontWeight="500">
                                {template.subject || '(Aucun objet)'}
                              </Text>
                            </VStack>

                            {/* Aperçu HTML rendu */}
                            <VStack align="start" spacing={1} w="100%">
                              <Text fontSize="xs" fontWeight="600" color="gray.500">
                                Aperçu du rendu :
                              </Text>
                              <Box
                                w="100%"
                                maxH="120px"
                                overflowY="auto"
                                p={2}
                                bg="gray.50"
                                borderRadius="md"
                                border="1px solid"
                                borderColor="gray.200"
                                fontSize="xs"
                                dangerouslySetInnerHTML={{ __html: template.body || '<p style="color: gray;">Corps vide</p>' }}
                                sx={{
                                  '& h1, & h2, & h3': { fontSize: '0.9em', fontWeight: 'bold', marginBottom: '0.3em' },
                                  '& p': { marginBottom: '0.5em', fontSize: '0.85em' },
                                  '& ul, & ol': { marginLeft: '1em', marginBottom: '0.5em', fontSize: '0.85em' },
                                  '& img': { maxWidth: '100%', height: 'auto' },
                                  '& a': { color: 'blue.500' }
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </VStack>

                            <HStack w="100%" spacing={2}>
                              <Button
                                size="sm"
                                colorScheme="blue"
                                variant="ghost"
                                flex={1}
                                leftIcon={<FiEye />}
                                onClick={(e) => previewTemplate(template, e)}
                              >
                                Aperçu complet
                              </Button>
                              <Button
                                size="sm"
                                colorScheme="purple"
                                variant="solid"
                                flex={1}
                                leftIcon={<FiEdit />}
                              >
                                Utiliser
                              </Button>
                            </HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                </SimpleGrid>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onTemplatesClose}>
              Fermer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal - Prévisualisation détaillée d'un template */}
      <Modal isOpen={isTemplatePreviewOpen} onClose={onTemplatePreviewClose} size="6xl">
        <ModalOverlay />
        <ModalContent maxH="90vh">
          <ModalHeader>
            <Flex justify="space-between" align="center">
              <HStack spacing={3}>
                <FiEye size={24} />
                <VStack align="start" spacing={0}>
                  <Text>{previewingTemplate?.name || 'Template'}</Text>
                  <Text fontSize="sm" fontWeight="normal" color="gray.500">
                    Aperçu du rendu final - Cliquez sur "Utiliser" pour l'éditer
                  </Text>
                </VStack>
              </HStack>
              <Badge colorScheme="purple" fontSize="sm">
                {previewingTemplate?.category}
              </Badge>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto">
            {previewingTemplate && (
              <VStack spacing={4} align="stretch">
                {/* Métadonnées du template */}
                <Card variant="outline" bg="purple.50">
                  <CardBody>
                    <VStack align="start" spacing={2}>
                      <HStack spacing={4} w="100%">
                        <VStack align="start" spacing={1} flex={1}>
                          <Text fontSize="xs" fontWeight="600" color="gray.600">
                            📧 Objet de l'email
                          </Text>
                          <Text fontSize="md" fontWeight="600">
                            {previewingTemplate.subject || '(Aucun objet)'}
                          </Text>
                        </VStack>
                        {previewingTemplate.description && (
                          <VStack align="start" spacing={1} flex={1}>
                            <Text fontSize="xs" fontWeight="600" color="gray.600">
                              📝 Description
                            </Text>
                            <Text fontSize="sm" color="gray.700">
                              {previewingTemplate.description}
                            </Text>
                          </VStack>
                        )}
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>

                {/* Rendu HTML complet */}
                <Card variant="outline">
                  <CardHeader>
                    <HStack>
                      <Text fontSize="sm" fontWeight="600">
                        👁️ Aperçu du rendu HTML
                      </Text>
                      <Badge colorScheme="green" fontSize="xs">RENDU FINAL</Badge>
                    </HStack>
                  </CardHeader>
                  <CardBody>
                    <Box
                      p={6}
                      bg="white"
                      border="2px solid"
                      borderColor="gray.200"
                      borderRadius="lg"
                      minH="400px"
                      maxH="60vh"
                      overflowY="auto"
                      dangerouslySetInnerHTML={{ __html: previewingTemplate.body || '<p style="color: gray;">Corps vide</p>' }}
                      sx={{
                        '& h1': { fontSize: '2em', fontWeight: 'bold', marginBottom: '0.5em', color: '#2D3748' },
                        '& h2': { fontSize: '1.5em', fontWeight: 'bold', marginBottom: '0.5em', color: '#2D3748' },
                        '& h3': { fontSize: '1.2em', fontWeight: 'bold', marginBottom: '0.5em', color: '#2D3748' },
                        '& p': { marginBottom: '1em', lineHeight: '1.6', color: '#4A5568' },
                        '& ul, & ol': { marginLeft: '1.5em', marginBottom: '1em', lineHeight: '1.6' },
                        '& li': { marginBottom: '0.5em' },
                        '& strong, & b': { fontWeight: 'bold', color: '#1A202C' },
                        '& em, & i': { fontStyle: 'italic' },
                        '& code': { 
                          bg: '#EDF2F7', 
                          px: 2, 
                          py: 1, 
                          borderRadius: 'sm',
                          fontFamily: 'monospace',
                          fontSize: '0.9em'
                        },
                        '& img': { maxWidth: '100%', height: 'auto', borderRadius: 'md', marginBottom: '1em' },
                        '& a': { color: '#3182CE', textDecoration: 'underline' },
                        '& blockquote': {
                          borderLeft: '4px solid #CBD5E0',
                          paddingLeft: '1em',
                          marginLeft: 0,
                          marginBottom: '1em',
                          color: '#718096',
                          fontStyle: 'italic'
                        },
                        '& table': {
                          width: '100%',
                          borderCollapse: 'collapse',
                          marginBottom: '1em'
                        },
                        '& th, & td': {
                          border: '1px solid #E2E8F0',
                          padding: '0.5em',
                          textAlign: 'left'
                        },
                        '& th': {
                          backgroundColor: '#EDF2F7',
                          fontWeight: 'bold'
                        }
                      }}
                    />
                  </CardBody>
                </Card>

                {/* Instructions */}
                <Card variant="outline" bg="blue.50">
                  <CardBody>
                    <HStack spacing={2}>
                      <Text fontSize="sm">
                        💡 <strong>Astuce :</strong> Cliquez sur "Utiliser ce template" pour l'importer dans l'éditeur 
                        et modifier son contenu selon vos besoins.
                      </Text>
                    </HStack>
                  </CardBody>
                </Card>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter borderTop="1px solid" borderColor="gray.200">
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onTemplatePreviewClose}>
                Fermer
              </Button>
              <Button 
                colorScheme="purple"
                leftIcon={<FiEdit />}
                onClick={() => {
                  applyTemplate(previewingTemplate);
                  onTemplatePreviewClose();
                }}
              >
                Utiliser ce template
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ImageCropper pour photo de profil */}
      <ImageCropper
        isOpen={isProfilePhotoCropOpen}
        onClose={onProfilePhotoCropClose}
        onImageCropped={(base64Image) => {
          setProfilePhoto(base64Image);
          localStorage.setItem('mail_profilePhoto', base64Image);
          toast({
            title: "Photo de profil enregistrée",
            description: "Elle sera visible par vos destinataires",
            status: "success",
            duration: 3000
          });
        }}
        title="Photo de profil"
        aspectRatio={1}
        maxWidth={200}
        maxHeight={200}
        outputFormat="jpeg"
        quality={0.9}
      />

      {/* ImageCropper pour signature */}
      <ImageCropper
        isOpen={isSignatureCropOpen}
        onClose={onSignatureCropClose}
        onImageCropped={(base64Image) => {
          setSignatureImage(base64Image);
          localStorage.setItem('mail_signatureImage', base64Image);
          toast({
            title: "Signature enregistrée",
            description: "Elle sera ajoutée automatiquement à vos emails",
            status: "success",
            duration: 3000
          });
        }}
        title="Signature image"
        aspectRatio={4}
        maxWidth={600}
        maxHeight={150}
        outputFormat="png"
        quality={0.95}
      />

      {/* Éditeur de template HTML avec interface graphique */}
      <TemplateEditor
        isOpen={isTemplateEditorOpen}
        onClose={onTemplateEditorClose}
        templateHtml={composeBody}
        onSave={(editedHtml) => {
          setComposeBody(editedHtml);
          toast({
            title: "Template personnalisé",
            description: "Vos modifications ont été appliquées",
            status: "success",
            duration: 3000
          });
        }}
      />

      <Drawer isOpen={mobileFoldersOpen} placement="left" onClose={() => setMobileFoldersOpen(false)} size="xs">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Mes dossiers</DrawerHeader>
          <DrawerBody>
            <VStack align="stretch" spacing={2}>
              {folderOptions.map((folder) => (
                <Button
                  key={folder.key}
                  variant={activeFolder === folder.key ? 'solid' : 'ghost'}
                  colorScheme={activeFolder === folder.key ? 'rbe' : 'gray'}
                  justifyContent="flex-start"
                  leftIcon={<folder.icon />}
                  onClick={() => {
                    changeFolder(folder.key);
                    setMobileFoldersOpen(false);
                  }}
                >
                  {folder.label}
                  {folder.key === 'DRAFTS' && drafts.length > 0 && (
                    <Badge ml={2} colorScheme="purple" borderRadius="full" px={2} fontSize="xs">
                      {drafts.length}
                    </Badge>
                  )}
                </Button>
              ))}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
