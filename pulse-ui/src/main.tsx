import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { WalletProvider } from './components/WalletProvider.tsx';
import { AgentsProvider } from './contexts/AgentsContext.tsx';
import { EventsProvider } from './contexts/EventsContext.tsx';
import { MarketProvider } from './contexts/MarketContext.tsx';
import { ToastProvider } from './contexts/ToastContext';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletProvider>
      <AgentsProvider>
        <EventsProvider autoRefresh={false}>
          <MarketProvider>
            <ToastProvider>
              <BrowserRouter>
                <AuthProvider>
                  <App />
                </AuthProvider>
              </BrowserRouter>
            </ToastProvider>
          </MarketProvider>
        </EventsProvider>
      </AgentsProvider>
    </WalletProvider>
  </StrictMode>
);
