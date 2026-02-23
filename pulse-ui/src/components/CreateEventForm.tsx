// src/components/marketplace/CreateEventForm.tsx
import { useState } from 'react';
import { useEvents } from '../hooks/useEvents'; 
import { NeoCard, NeoInput, NeoButton } from './neo';
import { solToLamports, getEventPDA, PROGRAM_ID } from '../utils/accounts';
import { useWallet } from '@solana/wallet-adapter-react';

interface CreateEventFormProps {
  onSuccess?: () => void;
}

export const CreateEventForm = ({ onSuccess }: CreateEventFormProps) => {
  // Panggil hook di top-level body
  const { publicKey } = useWallet();
  const { createEvent, createTicketTier } = useEvents();
  
  const [loading, setLoading] = useState(false);
  const [eventId, setEventId] = useState('');
  const [tierName, setTierName] = useState('General Admission');
  const [priceSol, setPriceSol] = useState('0.1');
  const [supply, setSupply] = useState('100');

  const handlePublish = async () => {
    if (!publicKey) {
      alert("Connect your wallet first!");
      return;
    }

    // Validasi Seed (Max 32 Bytes)
    if (Buffer.from(eventId).length > 32 || Buffer.from(tierName).length > 20) {
      alert("Event ID (max 32 chars) or Tier Name (max 20 chars) is too long!");
      return;
    }

    setLoading(true);
    try {
      // 1. Inisialisasi Event
      console.log("Step 1: Creating Event...");
      const eventTx = await createEvent({
        eventId: eventId.trim(),
        organizerFeeBps: 500, // 5% fee
      });
      console.log("Event Created TX:", eventTx);
      
      // Tunggu RPC sinkronisasi
      await new Promise(r => setTimeout(r, 2000));

      // 2. Turunkan PDA Event
      const [eventPDA] = getEventPDA(publicKey, eventId.trim(), PROGRAM_ID);

      // 3. Inisialisasi Tier
      console.log("Step 2: Creating Ticket Tier...");
      const tierTx = await createTicketTier(eventPDA, {
        tierId: tierName.trim(),
        price: solToLamports(Number(priceSol)),
        maxSupply: Number(supply),
      });
      console.log("Tier Created TX:", tierTx);

      alert(`CONGRATS! Event & Tickets are LIVE!\nEvent ID: ${eventId}`);
      onSuccess?.(); 
    } catch (err: any) {
      console.error("Full Error Context:", err);
      
      // Deteksi error khusus
      if (err.message?.includes('already in use') || err.logs?.some((l: string) => l.includes('already in use'))) {
        alert("Error: Event ID ini sudah terpakai di blockchain. Coba ID lain!");
      } else {
        alert(`Failed: ${err.message || 'Check console for logs'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <NeoCard className="p-6 bg-white border-4 border-black shadow-[8px_8px_0_0_#000000]">
      <h2 className="font-display font-black text-3xl mb-6">PUBLISH EVENT</h2>
      
      <div className="space-y-4">
        <NeoInput 
          label="Unique Event ID (Slug)" 
          value={eventId} 
          onChange={e => setEventId(e.target.value)} 
          placeholder="e.g., party-001"
        />

        <div className="border-t-4 border-black pt-4">
          <h4 className="font-bold mb-3 uppercase text-sm tracking-widest">Initial Category</h4>
          <NeoInput 
            label="Tier Name (e.g. VIP)" 
            value={tierName} 
            onChange={e => setTierName(e.target.value)} 
          />
          <div className="grid grid-cols-2 gap-4 mt-2">
            <NeoInput 
              label="Price (SOL)" 
              type="number" 
              value={priceSol} 
              onChange={e => setPriceSol(e.target.value)} 
            />
            <NeoInput 
              label="Supply" 
              type="number" 
              value={supply} 
              onChange={e => setSupply(e.target.value)} 
            />
          </div>
        </div>

        <NeoButton 
          variant="primary" 
          className="w-full mt-6 py-4 text-xl" 
          onClick={handlePublish}
          disabled={loading || !publicKey}
        >
          {loading ? "PROCESSING..." : "DEPLOY TO SOLANA 🚀"}
        </NeoButton>
        
        {!publicKey && (
          <p className="text-center font-mono text-xs text-red-500 mt-2">
            * Wallet must be connected to publish
          </p>
        )}
      </div>
    </NeoCard>
  );
};