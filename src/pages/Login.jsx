import { useNavigate } from 'react-router-dom';
import { Box, Button, Input, VStack, Text, Image, useColorModeValue } from '@chakra-ui/react';
import { useState } from 'react';
import { useUser } from '../context/UserContext';
import { login, memberLogin } from '../api/auth';
import { fetchCSRFToken } from '../lib/csrfClient';

// Bannière (2000x600) placée dans: interne/public/univers_rbe.png
const BANNER_SRC = '/univers_rbe.png';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPwd] = useState('');
  const [error, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken, setUser } = useUser();

  const focusColor = useColorModeValue('rbe.500', 'rbe.300');
  const cardBorder = useColorModeValue('gray.100', 'gray.700');

  const submit = async () => {
    if (!username.trim() || !password.trim()) {
      setErr('Champs requis.');
      return;
    }
    setLoading(true);
    setErr('');
    try {
      const id = username.trim();
      // Déterminer si c'est un matricule ou un username admin
      // Matricule: contient un @ (email), ou est au format XXXX-XXX, ou contient un point (w.belaidi)
      const looksLikeMatricule = /^\d{4}-\d{3}$/i.test(id) || id.includes('@') || id.includes('.');
      const data = looksLikeMatricule
        ? await memberLogin(id, password)
        : await login(id.toLowerCase(), password);
      setToken(data.token);
      setUser(data.user);
      
      // 🔐 Fetch CSRF token after successful login
      try {
        await fetchCSRFToken();
        console.log('✅ CSRF token obtained after login');
      } catch (csrfError) {
        console.error('❌ CSRF token fetch failed, but continuing:', csrfError.message);
        // Ne pas bloquer le login si CSRF fail - le serveur le refusera aux mutations
      }
      
      // Rediriger vers le changement de mot de passe obligatoire si nécessaire
      if (data.user?.mustChangePassword || data.user?.isPasswordTemporary) {
        navigate('/force-password-change');
      } else {
        navigate('/dashboard');
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const key = (e) => e.key === 'Enter' && submit();

  return (
    <Box minH="100vh" bg="white" overflowX="hidden">
      {/* Top banner */}
      <Box as="header" w="100%" bg="gray.50" borderBottom="1px solid" borderColor="gray.200">
        <Box maxW="2000px" mx="auto">
          <Image
            src={BANNER_SRC}
            alt="Bannière Intranet"
            w="100%"
            h={{ base: '100px', md: '200px', lg: '300px' }}
            objectFit="cover"
            fallbackSrc="https://via.placeholder.com/2000x600?text=Intranet+Banner"
          />
        </Box>
      </Box>

      {/* Central login card */}
      <Box as="main" px={4} pb={12}>
        <Box
          maxW="xs"
          w="full"
          mx="auto"
          mt={{ base: -12, md: -20 }}
          position="relative"
        >
          <VStack
            spacing={3}
            bg="white"
            p={6}
            borderRadius="md"
            shadow="xl"
            border="1px solid"
            borderColor={cardBorder}
            borderTop="4px solid"
            borderTopColor="rbe.500"
          >
            <Text fontSize="xl" fontWeight="bold" textAlign="center">
              Connexion Intranet
            </Text>
            <Text fontSize="xs" color="gray.500" textAlign="center">
              Accès réservé aux membres et bénévoles
            </Text>
            {error && <Text color="red.500" textAlign="center">{error}</Text>}
            <Input
              size="sm"
              placeholder="Identifiant"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={key}
              _focus={{ borderColor: focusColor, boxShadow: `0 0 0 1px ${focusColor}` }}
            />
            <Input
              size="sm"
              placeholder="Mot de passe"
              type="password"
              value={password}
              onChange={e => setPwd(e.target.value)}
              onKeyDown={key}
              _focus={{ borderColor: focusColor, boxShadow: `0 0 0 1px ${focusColor}` }}
            />
            <Button
              size="sm"
              colorScheme="rbe"
              w="full"
              onClick={submit}
              isLoading={loading}
              loadingText="Connexion..."
            >
              Se connecter
            </Button>
          </VStack>
        </Box>
      </Box>
    </Box>
  );
}
