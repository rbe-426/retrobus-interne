/**
 * PollCreator.jsx
 * Composant de création de sondages pour RétroActus
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Input,
  IconButton,
  Text,
  useToast,
  FormControl,
  FormLabel,
  Card,
  CardBody,
  Badge,
  Divider
} from '@chakra-ui/react';
import { FiPlus, FiTrash2, FiEdit, FiCheck } from 'react-icons/fi';

export default function PollCreator({ polls = [], onChange }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [currentPoll, setCurrentPoll] = useState({
    question: '',
    options: ['', '']
  });
  const toast = useToast();

  // Ensure polls is always an array
  const pollsArray = Array.isArray(polls) ? polls : [];

  useEffect(() => {
    console.log('🔄 PollCreator received polls:', pollsArray);
  }, [polls]);

  const handleAddOption = () => {
    if (currentPoll.options.length >= 10) {
      toast({
        title: 'Limite atteinte',
        description: 'Maximum 10 options par sondage',
        status: 'warning',
        duration: 2000
      });
      return;
    }
    setCurrentPoll({
      ...currentPoll,
      options: [...currentPoll.options, '']
    });
  };

  const handleRemoveOption = (index) => {
    if (currentPoll.options.length <= 2) {
      toast({
        title: 'Minimum requis',
        description: 'Un sondage doit avoir au moins 2 options',
        status: 'warning',
        duration: 2000
      });
      return;
    }
    const newOptions = currentPoll.options.filter((_, i) => i !== index);
    setCurrentPoll({ ...currentPoll, options: newOptions });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...currentPoll.options];
    newOptions[index] = value;
    setCurrentPoll({ ...currentPoll, options: newOptions });
  };

  const handleSavePoll = () => {
    // Validation
    if (!currentPoll.question.trim()) {
      toast({
        title: 'Question manquante',
        description: 'Veuillez entrer une question',
        status: 'error',
        duration: 2000
      });
      return;
    }

    const validOptions = currentPoll.options.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      toast({
        title: 'Options manquantes',
        description: 'Un sondage doit avoir au moins 2 options',
        status: 'error',
        duration: 2000
      });
      return;
    }

    // Create poll object with unique IDs
    const newPoll = {
      id: editingIndex !== null ? pollsArray[editingIndex].id : `poll-${Date.now()}`,
      question: currentPoll.question.trim(),
      options: validOptions.map((text, idx) => ({
        id: `opt-${Date.now()}-${idx}`,
        text: text.trim(),
        votes: 0
      }))
    };

    // Update or add poll
    let newPolls;
    if (editingIndex !== null) {
      newPolls = [...pollsArray];
      newPolls[editingIndex] = newPoll;
    } else {
      newPolls = [...pollsArray, newPoll];
    }

    console.log('✅ Saving poll:', newPoll);
    console.log('✅ New polls array:', newPolls);
    onChange(newPolls);
    
    toast({
      title: editingIndex !== null ? 'Sondage modifié' : 'Sondage créé',
      status: 'success',
      duration: 2000
    });

    // Reset
    setCurrentPoll({ question: '', options: ['', ''] });
    setIsCreating(false);
    setEditingIndex(null);
  };

  const handleEditPoll = (index) => {
    const poll = pollsArray[index];
    setCurrentPoll({
      question: poll.question,
      options: poll.options.map(opt => opt.text)
    });
    setEditingIndex(index);
    setIsCreating(true);
  };

  const handleDeletePoll = (index) => {
    const newPolls = pollsArray.filter((_, i) => i !== index);
    onChange(newPolls);
    toast({
      title: 'Sondage supprimé',
      status: 'info',
      duration: 2000
    });
  };

  const handleCancel = () => {
    setCurrentPoll({ question: '', options: ['', ''] });
    setIsCreating(false);
    setEditingIndex(null);
  };

  return (
    <Box>
      <VStack align="stretch" spacing={4}>
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="sm">
            Sondages ({pollsArray.length})
          </Text>
          {!isCreating && (
            <Button
              leftIcon={<FiPlus />}
              size="sm"
              colorScheme="purple"
              onClick={() => setIsCreating(true)}
            >
              Créer un sondage
            </Button>
          )}
        </HStack>

        {/* Existing Polls */}
        {!isCreating && pollsArray.length > 0 && (
          <VStack align="stretch" spacing={3}>
            {pollsArray.map((poll, index) => (
              <Card key={poll.id} variant="outline">
                <CardBody>
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between">
                      <Text fontWeight="bold" fontSize="sm">
                        📊 {poll.question}
                      </Text>
                      <HStack>
                        <IconButton
                          icon={<FiEdit />}
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditPoll(index)}
                          aria-label="Éditer"
                        />
                        <IconButton
                          icon={<FiTrash2 />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleDeletePoll(index)}
                          aria-label="Supprimer"
                        />
                      </HStack>
                    </HStack>
                    <VStack align="stretch" spacing={1} pl={4}>
                      {poll.options.map((opt, optIdx) => (
                        <HStack key={opt.id} fontSize="sm" color="gray.600">
                          <Badge colorScheme="blue">{optIdx + 1}</Badge>
                          <Text>{opt.text}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        )}

        {/* Poll Creator Form */}
        {isCreating && (
          <Card bg="purple.50" borderColor="purple.200" borderWidth="2px">
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <Text fontWeight="bold" color="purple.600">
                  {editingIndex !== null ? '✏️ Modifier le sondage' : '✨ Nouveau sondage'}
                </Text>

                <FormControl isRequired>
                  <FormLabel fontSize="sm">Question</FormLabel>
                  <Input
                    placeholder="Quelle est votre question ?"
                    value={currentPoll.question}
                    onChange={(e) => setCurrentPoll({ ...currentPoll, question: e.target.value })}
                    bg="white"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="sm">Options (min. 2)</FormLabel>
                  <VStack align="stretch" spacing={2}>
                    {currentPoll.options.map((option, index) => (
                      <HStack key={index}>
                        <Badge colorScheme="purple">{index + 1}</Badge>
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          bg="white"
                        />
                        {currentPoll.options.length > 2 && (
                          <IconButton
                            icon={<FiTrash2 />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleRemoveOption(index)}
                            aria-label="Supprimer option"
                          />
                        )}
                      </HStack>
                    ))}
                  </VStack>
                </FormControl>

                <Button
                  leftIcon={<FiPlus />}
                  size="sm"
                  variant="outline"
                  onClick={handleAddOption}
                  isDisabled={currentPoll.options.length >= 10}
                >
                  Ajouter une option
                </Button>

                <Divider />

                <HStack justify="flex-end">
                  <Button size="sm" variant="ghost" onClick={handleCancel}>
                    Annuler
                  </Button>
                  <Button
                    leftIcon={<FiCheck />}
                    size="sm"
                    colorScheme="purple"
                    onClick={handleSavePoll}
                  >
                    {editingIndex !== null ? 'Modifier' : 'Créer'}
                  </Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Box>
  );
}
