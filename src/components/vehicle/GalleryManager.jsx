import React, { useState, useRef } from 'react';
import { Box, SimpleGrid, Image, HStack, IconButton, Input, useToast, Text } from '@chakra-ui/react';
import { FiTrash2, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { fetchCSRFToken, updateCSRFTokenFromResponse } from '../../lib/csrfClient';

export default function GalleryManager({
  value = [],
  onChange,
  uploadEndpoint,
  deleteEndpoint,
  authHeader
}) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const move = (i, dir) => {
    const copy = [...value];
    const target = i + dir;
    if (target < 0 || target >= copy.length) return;
    [copy[i], copy[target]] = [copy[target], copy[i]];
    onChange(copy);
  };

  const remove = async (img) => {
    if (!deleteEndpoint) {
      onChange(value.filter(v => v !== img));
      return;
    }
    try {
      // Fetch fresh CSRF token before delete
      const apiBaseMatch = deleteEndpoint.match(/^(https?:\/\/[^\/]+)/);
      const apiBase = apiBaseMatch ? apiBaseMatch[1] : '';
      try {
        await fetchCSRFToken(apiBase);
      } catch (csrfError) {
        console.warn(`⚠️ [GALLERY] Could not fetch CSRF token for delete:`, csrfError);
      }
      
      const csrfToken = localStorage.getItem('X-CSRF-Token') || '';
      const res = await fetch(deleteEndpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ image: img })
      });
      updateCSRFTokenFromResponse(res);
      if (!res.ok) throw new Error();
      const j = await res.json();
      onChange(j.gallery || []);
    } catch {
      onChange(value.filter(v => v !== img));
    }
  };

  const upload = async (files) => {
    // IMPORTANT: Convert FileList to Array immediately (FileList is not persisted in async context)
    const filesArray = files ? Array.from(files) : [];
    
    if (!filesArray?.length) {
      console.log(`🔍 [GALLERY] No files to upload`);
      return;
    }
    
    console.log(`\n🔍 [GALLERY] Starting upload:`, {
      endpoint: uploadEndpoint,
      filesCount: filesArray.length,
      hasAuth: !!authHeader,
      fileDetails: filesArray.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });
    
    setUploading(true);
    
    try {
      // Convert all files to BASE64 (like VehiculeEdit does)
      const base64Images = [];
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        console.log(`  📄 [GALLERY] Converting file ${i+1}/${files.length} to BASE64: ${file.name}`);
        
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUri = e.target.result;
            console.log(`    ✅ Converted ${file.name}: ${dataUri.substring(0, 50)}...`);
            resolve(dataUri);
          };
          reader.onerror = () => {
            console.error(`    ❌ Failed to read ${file.name}`);
            reject(new Error(`Failed to read ${file.name}`));
          };
          reader.readAsDataURL(file);
        });
        
        base64Images.push(base64);
      }
      
      console.log(`✅ [GALLERY] All files converted to BASE64, sending to ${uploadEndpoint}`);
      
      // Extract API base URL from uploadEndpoint
      const apiBaseMatch = uploadEndpoint.match(/^(https?:\/\/[^\/]+)/);
      const apiBase = apiBaseMatch ? apiBaseMatch[1] : '';
      
      // Fetch a fresh CSRF token before upload
      try {
        await fetchCSRFToken(apiBase);
        console.log(`✅ [GALLERY] Fresh CSRF token obtained`);
      } catch (csrfError) {
        console.warn(`⚠️ [GALLERY] Could not fetch CSRF token:`, csrfError);
        // Continue anyway - maybe token in localStorage is still valid
      }
      
      // Get CSRF token from localStorage
      const csrfToken = localStorage.getItem('X-CSRF-Token') || '';
      
      const res = await fetch(uploadEndpoint, { 
        method: 'POST', 
        headers: { 
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        }, 
        body: JSON.stringify({ images: base64Images })
      });
      
      // Update CSRF token from response if available
      updateCSRFTokenFromResponse(res);
      
      console.log(`📡 [GALLERY] Response received:`, {
        status: res.status,
        statusText: res.statusText,
        contentType: res.headers.get('content-type')
      });
      
      if (!res.ok) {
        const txt = await res.text().catch(()=> '');
        console.error(`❌ [GALLERY] Upload failed HTTP ${res.status}:`, txt.substring(0, 200));
        toast({ 
          status: 'error', 
          title: 'Échec upload',
          description: `Erreur ${res.status}: ${txt || res.statusText}`
        });
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      
      const j = await res.json();
      console.log(`✅ [GALLERY] Upload successful, response:`, {
        gallery_count: j.gallery?.length,
        first_image: j.gallery?.[0]?.substring(0, 50)
      });
      onChange(j.gallery || []);
      toast({ status: 'success', title: 'Images ajoutées' });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error(`❌ [GALLERY] Upload error:`, err.message);
      console.error(`❌ [GALLERY] Error details:`, err);
      toast({ 
        status: 'error', 
        title: 'Échec upload',
        description: err.message || 'Erreur réseau'
      });
    } finally {
      setUploading(false);
    }
  };

  const toSrc = (g) => {
    if (!g) return g;
    if (g.startsWith('http://') || g.startsWith('https://')) return g;
    // g commence par /media -> on préfixe base
    return (import.meta.env.VITE_API_URL || '') + g;
  };

  // Variante robuste pour rterner la source d'image
  // Résolution robuste des URLs d'images (identique à VehicleDetails.jsx)
  const resolveImageUrl = (src) => {
    if (!src) return src;
    // URLs absolues ou data URIs - retourner directement
    if (src.startsWith('http://') || src.startsWith('https://')) return src;
    if (src.startsWith('data:') || src.startsWith('blob:')) return src;
    // Assets locaux
    if (src.startsWith('/assets/')) return src;
    
    // Uploads API - préfixer avec API URL
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    if (src.startsWith('/')) {
      return `${apiUrl}${src}`;
    }
    // Chemin relatif
    return `${apiUrl}/${src}`;
  };

  // Ancien alias pour compatibilité
  const toSrc2 = (g) => resolveImageUrl(g);

  return (
    <Box>
      <Input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={e => upload(e.target.files)}
        isDisabled={uploading}
        mb={3}
      />
      {value.length === 0 && (
        <Text fontSize="sm" color="gray.500" mb={2}>Aucune image dans la galerie.</Text>
      )}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
        {value.map((g, i) => (
          <Box key={g + i} border="1px solid" borderColor="gray.200" borderRadius="md" p={1}>
            <Image src={toSrc2(g)} w="100%" h="110px" objectFit="cover" borderRadius="sm" />
            <HStack mt={1} justify="space-between">
              <HStack>
                <IconButton
                  aria-label="Monter"
                  icon={<FiChevronUp />}
                  size="xs"
                  onClick={() => move(i, -1)}
                  isDisabled={i === 0}
                />
                <IconButton
                  aria-label="Descendre"
                  icon={<FiChevronDown />}
                  size="xs"
                  onClick={() => move(i, +1)}
                  isDisabled={i === (value.length - 1)}
                />
              </HStack>
              <IconButton
                aria-label="Supprimer"
                icon={<FiTrash2 />}
                size="xs"
                colorScheme="red"
                onClick={() => remove(g)}
              />
            </HStack>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
