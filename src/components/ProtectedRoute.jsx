import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Center, Spinner } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, user, sessionChecked, ensureSession } = useUser();
  const [requested, setRequested] = useState(false);

  // Déclenche un contrôle à l’entrée si pas encore checked
  useEffect(() => {
    if (!sessionChecked && !requested) {
      ensureSession();
      setRequested(true);
    }
  }, [sessionChecked, requested, ensureSession]);

  // Afficher un chargement tant que la session n’est pas contrôlée
  if (!sessionChecked) {
    return (
      <Center py={20}>
        <Spinner size="lg" />
      </Center>
    );
  }

  // Refuser si pas de token ou si pas d’utilisateur côté API (logout fait dans ensureSession)
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Cas OK
  return children;
}