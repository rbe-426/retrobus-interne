/**
 * CustomEventQuestionsForm.jsx
 * Composant pour afficher et remplir les questions customisées d'un événement
 * Utilisé lors de l'inscription à un événement
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  CheckboxGroup,
  Checkbox,
  FormErrorMessage,
  Card,
  CardHeader,
  CardBody,
  Heading,
  useColorModeValue,
  Stack,
  HStack,
  Badge
} from '@chakra-ui/react';

export default function CustomEventQuestionsForm({
  questions = [],
  responses = {},
  onChange = () => {},
  isRequired = true
}) {
  const cardBg = useColorModeValue('white', 'gray.800');
  const [errors, setErrors] = useState({});

  if (!questions || questions.length === 0) {
    return null;
  }

  const handleChange = (questionId, value) => {
    const newResponses = {
      ...responses,
      [questionId]: value
    };

    // Validation
    const newErrors = { ...errors };
    if (questions.find(q => q.id === questionId)?.required && !value) {
      newErrors[questionId] = 'Ce champ est obligatoire';
    } else {
      delete newErrors[questionId];
    }

    setErrors(newErrors);
    onChange(newResponses);
  };

  return (
    <Card bg={cardBg} borderRadius="lg">
      <CardHeader>
        <HStack justify="space-between">
          <Heading size="md">Questions supplémentaires</Heading>
          <Badge colorScheme="blue">{questions.length}</Badge>
        </HStack>
      </CardHeader>
      <CardBody>
        <VStack spacing={6} align="stretch">
          {questions.map((question) => {
            const value = responses[question.id] || '';
            const error = errors[question.id];
            const isReq = question.required && isRequired;

            return (
              <FormControl
                key={question.id}
                isInvalid={!!error}
                isRequired={isReq}
              >
                <FormLabel fontWeight="bold">
                  {question.text}
                  {isReq && <span style={{ color: 'red' }}> *</span>}
                </FormLabel>

                {/* Text input */}
                {question.type === 'text' && (
                  <Input
                    placeholder="Votre réponse..."
                    value={value}
                    onChange={(e) => handleChange(question.id, e.target.value)}
                    size="md"
                    borderColor={error ? 'red.500' : 'gray.200'}
                  />
                )}

                {/* Textarea */}
                {question.type === 'textarea' && (
                  <Textarea
                    placeholder="Votre réponse..."
                    value={value}
                    onChange={(e) => handleChange(question.id, e.target.value)}
                    rows={4}
                    borderColor={error ? 'red.500' : 'gray.200'}
                  />
                )}

                {/* Select */}
                {question.type === 'select' && (
                  <Select
                    placeholder="Sélectionnez une option..."
                    value={value}
                    onChange={(e) => handleChange(question.id, e.target.value)}
                    borderColor={error ? 'red.500' : 'gray.200'}
                  >
                    {(question.options || []).map((opt, idx) => (
                      <option key={idx} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>
                )}

                {/* Checkboxes (multiple selection) */}
                {question.type === 'checkbox' && (
                  <CheckboxGroup
                    value={Array.isArray(value) ? value : (value ? [value] : [])}
                    onChange={(vals) => handleChange(question.id, vals)}
                  >
                    <Stack spacing={2}>
                      {(question.options || []).map((opt, idx) => (
                        <Checkbox key={idx} value={opt}>
                          {opt}
                        </Checkbox>
                      ))}
                    </Stack>
                  </CheckboxGroup>
                )}

                {error && <FormErrorMessage>{error}</FormErrorMessage>}
              </FormControl>
            );
          })}
        </VStack>
      </CardBody>
    </Card>
  );
}
