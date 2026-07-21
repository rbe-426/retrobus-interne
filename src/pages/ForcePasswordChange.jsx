import React, { useState } from 'react';
import {
  Box, Container, Heading, VStack, Text, Button, Input, FormControl,
  FormLabel, FormErrorMessage, useToast, Alert, AlertIcon, Divider,
  InputGroup, InputRightElement, IconButton
} from '@chakra-ui/react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { apiClient } from '../api/config';

export default function ForcePasswordChange() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ isValid: false, errors: [] });
  
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useUser();

  // Rediriger si l'utilisateur n'a pas besoin de changer son mot de passe
  React.useEffect(() => {
    if (user && !user.mustChangePassword && !user.isPasswordTemporary) {
      navigate('/');
    }
  }, [user, navigate]);

  const validatePassword = (password) => {
    const errors = [];

    if (password.length < 8) {
      errors.push('Au minimum 8 caractères');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Au moins 1 majuscule');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Au moins 1 minuscule');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Au moins 1 chiffre');
    }

    if (!/[!@#$%^&*_+\-=]/.test(password)) {
      errors.push('Au moins 1 caractère spécial (!@#$%^&*_+-=)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleNewPasswordChange = (e) => {
    const pwd = e.target.value;
    setNewPassword(pwd);
    setPasswordStrength(validatePassword(pwd));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!currentPassword) {
      toast({
        title: 'Erreur',
        description: 'Entrez votre mot de passe actuel',
        status: 'error'
      });
      return;
    }

    if (!newPassword) {
      toast({
        title: 'Erreur',
        description: 'Entrez votre nouveau mot de passe',
        status: 'error'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        status: 'error'
      });
      return;
    }

    if (!passwordStrength.isValid) {
      toast({
        title: 'Erreur',
        description: 'Le mot de passe ne respecte pas les règles de sécurité',
        status: 'error'
      });
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword
      });

      toast({
        title: 'Succès !',
        description: 'Votre mot de passe a été changé avec succès',
        status: 'success'
      });

      // Rediriger vers le dashboard
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.error || 'Impossible de changer le mot de passe',
        status: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" py={8}>
      <Container maxW="md">
        <Box bg="white" p={8} borderRadius="lg" boxShadow="lg">
          <VStack spacing={6}>
            {/* Header */}
            <Box textAlign="center">
              <Heading size="lg" mb={2}>🔐 Changez votre mot de passe</Heading>
              <Text color="gray.600">
                C'est votre première connexion. Par sécurité, vous devez créer un nouveau mot de passe personnalisé.
              </Text>
            </Box>

            <Divider />

            {/* Alert */}
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <Box>
                <Text fontWeight="bold">Règles de sécurité :</Text>
                <Text fontSize="sm">
                  • Au minimum 8 caractères<br/>
                  • Au moins 1 majuscule et 1 minuscule<br/>
                  • Au moins 1 chiffre et 1 caractère spécial
                </Text>
              </Box>
            </Alert>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <VStack spacing={4}>
                {/* Mot de passe actuel */}
                <FormControl isRequired>
                  <FormLabel>Mot de passe temporaire actuel</FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword.current ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Entrez le mot de passe reçu"
                      disabled={loading}
                    />
                    <InputRightElement>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        icon={showPassword.current ? <FiEyeOff /> : <FiEye />}
                        onClick={() => setShowPassword(p => ({ ...p, current: !p.current }))}
                        tabIndex={-1}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                {/* Nouveau mot de passe */}
                <FormControl isRequired isInvalid={newPassword && !passwordStrength.isValid}>
                  <FormLabel>Nouveau mot de passe</FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword.new ? 'text' : 'password'}
                      value={newPassword}
                      onChange={handleNewPasswordChange}
                      placeholder="Créez un mot de passe fort"
                      disabled={loading}
                    />
                    <InputRightElement>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        icon={showPassword.new ? <FiEyeOff /> : <FiEye />}
                        onClick={() => setShowPassword(p => ({ ...p, new: !p.new }))}
                        tabIndex={-1}
                      />
                    </InputRightElement>
                  </InputGroup>
                  {newPassword && !passwordStrength.isValid && (
                    <FormErrorMessage>
                      <VStack align="start" spacing={1}>
                        {passwordStrength.errors.map((error, idx) => (
                          <Text key={idx} fontSize="sm">❌ {error}</Text>
                        ))}
                      </VStack>
                    </FormErrorMessage>
                  )}
                  {newPassword && passwordStrength.isValid && (
                    <Text fontSize="sm" color="green.600">✅ Mot de passe conforme</Text>
                  )}
                </FormControl>

                {/* Confirmation */}
                <FormControl isRequired>
                  <FormLabel>Saisir à nouveau</FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword.confirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirmez votre nouveau mot de passe"
                      disabled={loading}
                    />
                    <InputRightElement>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        icon={showPassword.confirm ? <FiEyeOff /> : <FiEye />}
                        onClick={() => setShowPassword(p => ({ ...p, confirm: !p.confirm }))}
                        tabIndex={-1}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                <Divider />

                {/* Submit */}
                <Button
                  type="submit"
                  w="100%"
                  size="lg"
                  bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  color="white"
                  isLoading={loading}
                  isDisabled={!currentPassword || !newPassword || !confirmPassword || !passwordStrength.isValid}
                >
                  Changer mon mot de passe
                </Button>
              </VStack>
            </form>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}
