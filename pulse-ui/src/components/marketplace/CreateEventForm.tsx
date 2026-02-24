import { useState } from 'react';
import { useEvents } from '../../hooks/useEvents'; 
import { NeoCard, NeoInput, NeoButton } from '../neo';
import { solToLamports, getEventPDA, PROGRAM_ID } from '../../utils/accounts';
import { useWallet } from '@solana/wallet-adapter-react';

interface CreateEventFormProps {
  onSuccess?: () => void;
}

export const CreateEventForm = ({ onSuccess }: CreateEventFormProps) => {
  const { publicKey } = useWallet();
  const { createEvent, createTicketTier } = useEvents();
  const [loading, setLoading] = useState(false);
  
  // //TESTING YAAAAA: Field lengkap sesuai SC baru
  const [formData, setFormData] = useState({
    eventId: '',
    name: '',
    description: '',
    imageUrl: '',
    location: '',
    maxTickets: 5,
    tierId: 'GA',
    tierName: 'General Admission',
    priceSol: '0.1',
    supply: '100'
  });

  const handlePublish = async () => {
    if (!publicKey) return alert("Connect wallet dulu!");
    
    // VALIDASI PENTING:
    // Event ID dipakai sebagai SEED PDA, limitnya 32 bytes.
    if (Buffer.from(formData.eventId).length > 32) {
      return alert("EVENT ID terlalu panjang untuk sistem blockchain (Max 32 bytes)");
    }

    setLoading(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      
      const eventTx = await createEvent({
        // Gunakan .slice untuk memastikan tidak ada string yang luber
        eventId: formData.eventId.trim().slice(0, 32), 
        name: formData.name.slice(0, 100),
        description: formData.description.slice(0, 500),
        imageUrl: formData.imageUrl.slice(0, 200) || `https://api.dicebear.com/7.x/identicon/svg?seed=${formData.eventId}`,
        location: formData.location.slice(0, 100),
        
        // Pastikan format waktu adalah integer (Seconds)
        eventStart: now + (86400 * 7),
        eventEnd: now + (86400 * 8),
        saleStart: now,
        saleEnd: now + (86400 * 7),
        maxTickets: Number(formData.maxTickets),
        organizerFeeBps: 500,
      });

      await new Promise(r => setTimeout(r, 2000)); // Tunggu RPC sync

      // 2. Create Ticket Tier
      const [eventPDA] = getEventPDA(publicKey, formData.eventId.trim(), PROGRAM_ID);
      console.log("Step 2: Creating Tier...");
      
      await createTicketTier(eventPDA, {
        tierId: formData.tierId,
        name: formData.tierName,
        description: "Standard Entry",
        price: solToLamports(Number(formData.priceSol)),
        maxSupply: Number(formData.supply),
      });

      alert("EVENT BERHASIL LIVE DI SOLANA!");
      onSuccess?.(); 
    } catch (err: any) {
      console.error(err);
      alert(`Gagal: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <NeoCard className="p-6 bg-white border-4 border-black max-h-[85vh] overflow-y-auto">
      <h2 className="font-display font-black text-3xl mb-6">PUBLISH EVENT</h2>
      
      <div className="space-y-4 font-mono">
        <div className="grid grid-cols-2 gap-4">
          <NeoInput label="EVENT ID (SLUG)" placeholder="neon-2025" value={formData.eventId} onChange={e => setFormData({...formData, eventId: e.target.value})} />
          <NeoInput label="EVENT NAME" placeholder="Neon Music Fest" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        </div>
        
        <NeoInput label="LOCATION" placeholder="Cyber Arena, Tokyo" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
        <NeoInput label="IMAGE URL" placeholder="https://..." value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
        <NeoInput label="DESCRIPTION" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />

        <div className="border-t-4 border-black pt-4 mt-2">
          <h4 className="font-bold mb-2 text-[#FF00F5]">TICKET CONFIG</h4>
          <div className="grid grid-cols-3 gap-3">
            <NeoInput label="TIER ID" value={formData.tierId} onChange={e => setFormData({...formData, tierId: e.target.value})} />
            <NeoInput label="PRICE (SOL)" type="number" value={formData.priceSol} onChange={e => setFormData({...formData, priceSol: e.target.value})} />
            <NeoInput label="SUPPLY" type="number" value={formData.supply} onChange={e => setFormData({...formData, supply: e.target.value})} />
          </div>
        </div>

        <NeoButton variant="primary" className="w-full mt-4 py-4" onClick={handlePublish} disabled={loading}>
          {loading ? "DEPLOYING TO CHAIN..." : "CONFIRM & GO LIVE 🚀"}
        </NeoButton>
      </div>
    </NeoCard>
  );
};