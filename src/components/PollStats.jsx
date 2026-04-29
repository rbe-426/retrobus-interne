/**
 * PollStats.jsx
 * Affichage des statistiques de sondages pour l'administration
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Spinner,
  Icon,
  Tooltip
} from '@chakra-ui/react';
import { FiBarChart2, FiUsers } from 'react-icons/fi';
import { apiClient } from '../api/config';

export default function PollStats({ newsId, polls }) {
  const [pollsWithStats, setPollsWithStats] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (polls && polls.length > 0) {
      loadPollsStats();
    }
  }, [polls, newsId]);

  const loadPollsStats = async () => {
    if (!polls || polls.length === 0) return;

    try {
      setLoading(true);
      const pollsArray = typeof polls === 'string' ? JSON.parse(polls) : polls;
      
      // Charger les stats pour chaque sondage
      const pollsWithData = await Promise.all(
        pollsArray.map(async (poll) => {
          try {
            const stats = await apiClient.get(`/api/retro-news/${newsId}/polls/${poll.id}/results`);
            return {
              ...poll,
              stats: stats
            };
          } catch (error) {
            console.error(`Error loading stats for poll ${poll.id}:`, error);
            return {
              ...poll,
              stats: { voteCounts: {}, totalVotes: 0 }
            };
          }
        })
      );

      setPollsWithStats(pollsWithData);
    } catch (error) {
      console.error('Error loading polls stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPercentage = (optionId, stats) => {
    if (!stats || !stats.totalVotes || stats.totalVotes === 0) return 0;
    const votes = stats.voteCounts[optionId] || 0;
    return Math.round((votes / stats.totalVotes) * 100);
  };

  const getVotes = (optionId, stats) => {
    if (!stats) return 0;
    return stats.voteCounts[optionId] || 0;
  };

  if (!polls || (typeof polls === 'string' ? JSON.parse(polls).length === 0 : polls.length === 0)) {
    return null;
  }

  if (loading) {
    return (
      <Box p={2}>
        <HStack spacing={2}>
          <Spinner size="xs" />
          <Text fontSize="xs" color="gray.500">Chargement des stats...</Text>
        </HStack>
      </Box>
    );
  }

  return (
    <Accordion allowToggle size="sm">
      {pollsWithStats.map((poll, index) => {
        const totalVotes = poll.stats?.totalVotes || 0;
        
        return (
          <AccordionItem key={poll.id} border="none">
            <AccordionButton
              bg="purple.50"
              _hover={{ bg: 'purple.100' }}
              borderRadius="md"
              py={2}
              px={3}
            >
              <Box flex="1" textAlign="left">
                <HStack spacing={2}>
                  <Icon as={FiBarChart2} color="purple.600" />
                  <Text fontSize="xs" fontWeight="bold" color="purple.700" noOfLines={1}>
                    {poll.question}
                  </Text>
                  <Badge colorScheme="purple" fontSize="xx-small">
                    <HStack spacing={1}>
                      <Icon as={FiUsers} w={2} h={2} />
                      <Text>{totalVotes}</Text>
                    </HStack>
                  </Badge>
                </HStack>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={3} px={3} bg="purple.25">
              <VStack align="stretch" spacing={2}>
                {poll.options.map((option) => {
                  const percentage = getPercentage(option.id, poll.stats);
                  const votes = getVotes(option.id, poll.stats);
                  const isTopChoice = votes > 0 && votes === Math.max(...poll.options.map(o => getVotes(o.id, poll.stats)));

                  return (
                    <Box key={option.id}>
                      <HStack justify="space-between" mb={1}>
                        <Text
                          fontSize="xs"
                          fontWeight={isTopChoice ? 'bold' : 'normal'}
                          color={isTopChoice ? 'purple.700' : 'gray.700'}
                        >
                          {isTopChoice && '🏆 '}
                          {option.text}
                        </Text>
                        <HStack spacing={2}>
                          <Tooltip label={`${votes} vote${votes > 1 ? 's' : ''}`}>
                            <Badge colorScheme="purple" fontSize="xx-small">
                              {votes}
                            </Badge>
                          </Tooltip>
                          <Text fontSize="xs" fontWeight="bold" color="purple.600" minW="35px" textAlign="right">
                            {percentage}%
                          </Text>
                        </HStack>
                      </HStack>
                      <Progress
                        value={percentage}
                        colorScheme="purple"
                        size="xs"
                        borderRadius="full"
                        bg="purple.100"
                      />
                    </Box>
                  );
                })}
                
                {totalVotes === 0 && (
                  <Text fontSize="xs" color="gray.500" textAlign="center" py={2}>
                    Aucun vote pour le moment
                  </Text>
                )}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
