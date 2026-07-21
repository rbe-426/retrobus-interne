import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'
import theme from './theme'
import App from './App'
import './index.css'
import './styles/mobile.css'
import './styles/tablet.css'
import { UserProvider } from './context/UserContext'
import { CacheProvider } from './context/CacheContext'

// Enregistrement du Service Worker pour PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let reloadedForServiceWorkerUpdate = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadedForServiceWorkerUpdate) return;
      reloadedForServiceWorkerUpdate = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker enregistré:', registration.scope);
        registration.update();

        // Vérifier les mises à jour toutes les heures
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.error('❌ Erreur Service Worker:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <UserProvider>
          <CacheProvider>
            <App />
          </CacheProvider>
        </UserProvider>
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>,
)
