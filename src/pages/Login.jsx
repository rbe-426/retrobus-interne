import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, Input, VStack, Text, Image, Flex, InputGroup, InputRightElement, IconButton } from '@chakra-ui/react';
import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useUser } from '../context/UserContext';
import { login, memberLogin } from '../api/auth';
import logoUrbex from '../assets/URBEX.svg';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPwd] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken, setUser } = useUser();

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
      const looksLikeMatricule = /^\d{4}-\d{3}$/i.test(id) || id.includes('@') || id.includes('.');
      const data = looksLikeMatricule
        ? await memberLogin(id, password)
        : await login(id.toLowerCase(), password);
      setToken(data.token);
      setUser(data.user);
      
      // Rediriger vers le changement de mot de passe obligatoire si nécessaire
      if (data.user?.mustChangePassword || data.user?.isPasswordTemporary) {
        navigate('/force-password-change');
      } else {
        // Rediriger vers l'URL demandée ou vers dashboard
        const from = location.state?.from || '/dashboard';
        navigate(from, { replace: true });
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const key = (e) => e.key === 'Enter' && submit();

  return (
    <Flex
      minH="100vh"
      bgImage="url('/interne_screen_login.png')"
      bgSize="cover"
      bgPosition="0px"
      bgRepeat="no-repeat"
      align="center"
      justify={{ base: 'center', md: 'flex-start' }}
      position="relative"
      pl={{ base: 0, md: '8%', lg: '10%' }}
      _before={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bg: 'blackAlpha.400',
        zIndex: 0
      }}
    >
      {/* Card de connexion */}
      <VStack
        spacing={5}
        bg="whiteAlpha.600"
        backdropFilter="blur(20px) saturate(180%)"
        p={10}
        pt={24}
        borderRadius="3xl"
        shadow="2xl"
        w={{ base: '90%', sm: '420px' }}
        maxW="420px"
        zIndex={1}
        position="relative"
        border="1px solid"
        borderColor="whiteAlpha.400"
      >
        <Box position="absolute" top={6} left="50%" transform="translateX(-50%)" w="90%">
          <Image 
            src="/urbex_connexion_title.png" 
            alt="Connexion" 
            maxH="80px"
            w="full"
            objectFit="contain"
            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
          />
        </Box>
        
        {error && (
          <Box 
            w="full" 
            bg="red.50" 
            backdropFilter="blur(10px)" 
            border="1px solid" 
            borderColor="red.200" 
            borderRadius="2xl" 
            p={4}
          >
            <Text color="red.700" fontSize="sm" textAlign="center" fontWeight="500">{error}</Text>
          </Box>
        )}
        
        <Input
          placeholder="Email ou identifiant"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={key}
          size="lg"
          bg="whiteAlpha.600"
          backdropFilter="blur(10px)"
          border="1px solid"
          borderColor="gray.300"
          borderRadius="2xl"
          fontSize="md"
          px={5}
          py={7}
          _placeholder={{ color: 'gray.500' }}
          _hover={{ borderColor: 'gray.400', bg: 'whiteAlpha.700' }}
          _focus={{ 
            borderColor: 'rbe.400', 
            boxShadow: '0 0 0 3px rgba(211, 12, 76, 0.1)', 
            bg: 'whiteAlpha.800',
            outline: 'none'
          }}
        />
        
        <InputGroup size="lg">
          <Input
            placeholder="Mot de passe"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPwd(e.target.value)}
            onKeyDown={key}
            bg="whiteAlpha.600"
            backdropFilter="blur(10px)"
            border="1px solid"
            borderColor="gray.300"
            borderRadius="2xl"
            fontSize="md"
            px={5}
            py={7}
            _placeholder={{ color: 'gray.500' }}
            _hover={{ borderColor: 'gray.400', bg: 'whiteAlpha.700' }}
            _focus={{ 
              borderColor: 'rbe.400', 
              boxShadow: '0 0 0 3px rgba(211, 12, 76, 0.1)', 
              bg: 'whiteAlpha.800',
              outline: 'none'
            }}
          />
          <InputRightElement h="full" pr={2}>
            <IconButton
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              icon={showPassword ? <FiEyeOff /> : <FiEye />}
              variant="ghost"
              onClick={() => setShowPassword((visible) => !visible)}
            />
          </InputRightElement>
        </InputGroup>
        
        <Button
          size="lg"
          colorScheme="rbe"
          w="full"
          onClick={submit}
          isLoading={loading}
          loadingText="Connexion..."
          mt={3}
          py={7}
          borderRadius="2xl"
          fontSize="md"
          fontWeight="600"
          bg="rbe.500"
          color="white"
          _hover={{ 
            bg: 'rbe.600',
            transform: 'scale(1.02)',
            shadow: 'xl' 
          }}
          _active={{
            transform: 'scale(0.98)'
          }}
          transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
        >
          Se connecter
        </Button>
      </VStack>

    </Flex>
  );
}
