import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { WalletProvider } from './components/WalletProvider.tsx';
import { AgentsProvider } from './contexts/AgentsContext.tsx';
import { EventsProvider } from './contexts/EventsContext.tsx';
import { MarketProvider } from './contexts/MarketContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletProvider>
      <AgentsProvider>
        <EventsProvider autoRefresh={false}>
          <MarketProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </MarketProvider>
        </EventsProvider>
      </AgentsProvider>
    </WalletProvider>
  </StrictMode>
);
