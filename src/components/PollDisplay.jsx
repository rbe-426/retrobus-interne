/**
 * PollDisplay.jsx
 * Affichage d'un sondage avec possibilité de vote
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Radio,
  RadioGroup,
  Progress,
  Badge,
  useToast,
  Card,
  CardBody
} from '@chakra-ui/react';
import { FiCheck } from 'react-icons/fi';
import { apiClient } from '../api/config';

export default function PollDisplay({ newsId, poll, showResults = false }) {
  const [selectedOption, setSelectedOption] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (showResults || hasVoted) {
      loadResults();
    }
    // Check if user already voted (localStorage)
    const votedPolls = JSON.parse(localStorage.getItem('votedPolls') || '{}');
    if (votedPolls[poll.id]) {
      setHasVoted(true);
      loadResults();
    }
  }, [poll.id, showResults, hasVoted]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get(`/api/retro-news/${newsId}/polls/${poll.id}/results`);
      setResults(data);
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!selectedOption) {
      toast({
        title: 'Sélectionnez une option',
        status: 'warning',
        duration: 2000
      });
      return;
    }

    try {
      setVoting(true);
      
      const response = await apiClient.post(`/api/retro-news/${newsId}/poll/vote`, {
        pollId: poll.id,
        optionId: selectedOption
      });

      // Store vote in localStorage
      const votedPolls = JSON.parse(localStorage.getItem('votedPolls') || '{}');
      votedPolls[poll.id] = selectedOption;
      localStorage.setItem('votedPolls', JSON.stringify(votedPolls));

      setHasVoted(true);
      setResults(response);

      toast({
        title: 'Vote enregistré !',
        status: 'success',
        duration: 2000
      });

      loadResults();
    } catch (error) {
      toast({
        title: 'Erreur de vote',
        description: error.response?.data?.error || 'Impossible de voter',
        status: 'error',
        duration: 3000
      });
    } finally {
      setVoting(false);
    }
  };

  const getPercentage = (optionId) => {
    if (!results || !results.totalVotes || results.totalVotes === 0) return 0;
    const votes = results.voteCounts[optionId] || 0;
    return Math.round((votes / results.totalVotes) * 100);
  };

  const getVotes = (optionId) => {
    if (!results) return 0;
    return results.voteCounts[optionId] || 0;
  };

  const totalVotes = results?.totalVotes || 0;

  return (
    <Card borderWidth="2px" borderColor="purple.200" bg="purple.50">
      <CardBody>
        <VStack align="stretch" spacing={4}>
          <HStack justify="space-between">
            <Text fontWeight="bold" fontSize="md" color="purple.700">
              📊 {poll.question}
            </Text>
            {hasVoted && (
              <Badge colorScheme="green">Vous avez voté</Badge>
            )}
          </HStack>

          {!hasVoted && !showResults ? (
            // Vote Form
            <VStack align="stretch" spacing={3}>
              <RadioGroup value={selectedOption} onChange={setSelectedOption}>
                <VStack align="stretch" spacing={2}>
                  {poll.options.map((option) => (
                    <Radio
                      key={option.id}
                      value={option.id}
                      colorScheme="purple"
                      bg="white"
                      p={3}
                      borderRadius="md"
                      borderWidth="1px"
                      _hover={{ borderColor: 'purple.400' }}
                    >
                      {option.text}
                    </Radio>
                  ))}
                </VStack>
              </RadioGroup>

              <Button
                leftIcon={<FiCheck />}
                colorScheme="purple"
                onClick={handleVote}
                isLoading={voting}
                isDisabled={!selectedOption}
              >
                Voter
              </Button>
            </VStack>
          ) : (
            // Results Display
            <VStack align="stretch" spacing={3}>
              {loading ? (
                <Text fontSize="sm" color="gray.500">Chargement des résultats...</Text>
              ) : (
                <>
                  {poll.options.map((option) => {
                    const percentage = getPercentage(option.id);
                    const votes = getVotes(option.id);
                    const isSelected = selectedOption === option.id;

                    return (
                      <Box key={option.id}>
                        <HStack justify="space-between" mb={1}>
                          <Text
                            fontSize="sm"
                            fontWeight={isSelected ? 'bold' : 'normal'}
                            color={isSelected ? 'purple.600' : 'gray.700'}
                          >
                            {isSelected && '✓ '}
                            {option.text}
                          </Text>
                          <HStack spacing={2}>
                            <Badge colorScheme="purple">{votes} votes</Badge>
                            <Text fontSize="sm" fontWeight="bold" color="purple.600">
                              {percentage}%
                            </Text>
                          </HStack>
                        </HStack>
                        <Progress
                          value={percentage}
                          colorScheme="purple"
                          size="sm"
                          borderRadius="md"
                        />
                      </Box>
                    );
                  })}

                  <Text fontSize="xs" color="gray.500" textAlign="center" mt={2}>
                    Total : {totalVotes} vote{totalVotes > 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </VStack>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}
