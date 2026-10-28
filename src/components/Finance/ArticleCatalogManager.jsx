import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Button, HStack, VStack, Input, NumberInput, NumberInputField, Table, Thead, Tbody, Tr, Th, Td,
  IconButton, Switch, Text, useToast
} from '@chakra-ui/react';
import { FiPlus, FiSave, FiTrash2 } from 'react-icons/fi';
import { fetchWithCSRF } from '../../lib/csrfClient.js';

export const fetchArticles = async () => {
  const res = await fetchWithCSRF('/api/finance/articles');
  if (!res.ok) throw new Error(`Catalogue indisponible (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export const saveArticle = async (article) => {
  const isEdit = !!article.id;
  const res = await fetchWithCSRF(isEdit ? `/api/finance/articles/${article.id}` : '/api/finance/articles', {
    method: isEdit ? 'PUT' : 'POST',
    body: JSON.stringify(article)
  });
  if (!res.ok) throw new Error(`Enregistrement impossible (${res.status})`);
  return res.json();
};

const EMPTY = { name: '', category: '', unit: 'unité', unitPrice: 0, description: '', isActive: true };

/** Gestion du catalogue d'articles utilisé par l'éditeur de devis / factures. */
export default function ArticleCatalogManager({ isOpen, onClose, onChanged }) {
  const toast = useToast();
  const [articles, setArticles] = useState([]);
  const [draft, setDraft] = useState(EMPTY);

  const load = useCallback(async () => {
    try {
      setArticles(await fetchArticles());
    } catch (e) {
      toast({ status: 'error', title: 'Catalogue', description: e.message });
    }
  }, [toast]);

  useEffect(() => { if (isOpen) load(); }, [isOpen, load]);

  const persist = async (article) => {
    if (!String(article.name || '').trim()) {
      toast({ status: 'warning', title: 'Nom requis' });
      return;
    }
    try {
      await saveArticle(article);
      if (!article.id) setDraft(EMPTY);
      await load();
      onChanged?.();
    } catch (e) {
      toast({ status: 'error', title: 'Erreur', description: e.message });
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Supprimer cet article ?')) return;
    try {
      const res = await fetchWithCSRF(`/api/finance/articles/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Suppression impossible (${res.status})`);
      await load();
      onChanged?.();
    } catch (e) {
      toast({ status: 'error', title: 'Erreur', description: e.message });
    }
  };

  const patch = (id, field, value) =>
    setArticles(list => list.map(a => (a.id === id ? { ...a, [field]: value } : a)));

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Catalogue d'articles</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Table size="sm">
            <Thead>
              <Tr><Th>Nom</Th><Th>Catégorie</Th><Th>Unité</Th><Th isNumeric>Prix unitaire</Th><Th>Actif</Th><Th /></Tr>
            </Thead>
            <Tbody>
              <Tr bg="blue.50" _dark={{ bg: 'whiteAlpha.100' }}>
                <Td><Input size="sm" placeholder="Nouvel article" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></Td>
                <Td><Input size="sm" value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} /></Td>
                <Td><Input size="sm" value={draft.unit} onChange={e => setDraft({ ...draft, unit: e.target.value })} /></Td>
                <Td isNumeric>
                  <NumberInput size="sm" min={0} value={draft.unitPrice} onChange={(_, v) => setDraft({ ...draft, unitPrice: Number.isNaN(v) ? 0 : v })}>
                    <NumberInputField />
                  </NumberInput>
                </Td>
                <Td />
                <Td><IconButton size="sm" colorScheme="green" icon={<FiPlus />} aria-label="Ajouter" onClick={() => persist(draft)} /></Td>
              </Tr>
              {articles.map(a => (
                <Tr key={a.id}>
                  <Td><Input size="sm" value={a.name} onChange={e => patch(a.id, 'name', e.target.value)} /></Td>
                  <Td><Input size="sm" value={a.category || ''} onChange={e => patch(a.id, 'category', e.target.value)} /></Td>
                  <Td><Input size="sm" value={a.unit || ''} onChange={e => patch(a.id, 'unit', e.target.value)} /></Td>
                  <Td isNumeric>
                    <NumberInput size="sm" min={0} value={a.unitPrice} onChange={(_, v) => patch(a.id, 'unitPrice', Number.isNaN(v) ? 0 : v)}>
                      <NumberInputField />
                    </NumberInput>
                  </Td>
                  <Td><Switch isChecked={a.isActive} onChange={e => patch(a.id, 'isActive', e.target.checked)} /></Td>
                  <Td>
                    <HStack spacing={1}>
                      <IconButton size="sm" icon={<FiSave />} aria-label="Enregistrer" onClick={() => persist(a)} />
                      <IconButton size="sm" colorScheme="red" variant="ghost" icon={<FiTrash2 />} aria-label="Supprimer" onClick={() => remove(a.id)} />
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {articles.length === 0 && (
            <VStack py={6}><Text color="gray.500">Aucun article. Ajoutez vos prestations (location bus, chauffeur, kilomètres…).</Text></VStack>
          )}
        </ModalBody>
        <ModalFooter><Button onClick={onClose}>Fermer</Button></ModalFooter>
      </ModalContent>
    </Modal>
  );
}
