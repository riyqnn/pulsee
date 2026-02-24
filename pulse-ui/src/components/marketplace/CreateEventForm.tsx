import { useState } from 'react';
import { useEvents } from '../../hooks/useEvents'; 
import { NeoCard, NeoInput, NeoButton } from '../neo';
import { solToLamports, getEventPDA, PROGRAM_ID } from '../../utils/accounts';
import { useWallet } from '@solana/wallet-adapter-react';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../utils/supabase';

export const CreateEventForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { publicKey } = useWallet();
  const { createEvent, createTicketTier } = useEvents();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [eventData, setEventData] = useState({
    eventId: '',
    name: '',
    description: '',
    imageUrl: '',
    location: '',
    startDate: '',
    startTime: '19:00',
  });

  const [tiers, setTiers] = useState([
    { tierId: 'GA', name: 'General Admission', priceSol: '0.01', supply: '100' }
  ]);

  const addTier = () => {
    setTiers([...tiers, { tierId: '', name: '', priceSol: '0.01', supply: '50' }]);
  };

  const removeTier = (index: number) => {
    if (tiers.length > 1) {
      setTiers(tiers.filter((_, i) => i !== index));
    }
  };

  const handleTierChange = (index: number, field: string, value: string) => {
    const newTiers = [...tiers];
    (newTiers[index] as any)[field] = value;
    setTiers(newTiers);
  };

  const handlePublish = async () => {
      if (!publicKey) {
        addToast("Please connect your wallet to create an event.", 'error');
        return;
      }
      setLoading(true);

      try {
        await createEvent({
          eventId: eventData.eventId.trim(),
          organizerFeeBps: 500,
        });

        const [eventPDA] = getEventPDA(publicKey, eventData.eventId.trim(), PROGRAM_ID);
        await new Promise(r => setTimeout(r, 2000)); 

        for (const tier of tiers) {
          await createTicketTier(eventPDA, {
            tierId: tier.tierId.trim(),
            price: solToLamports(Number(tier.priceSol)),
            maxSupply: Number(tier.supply),
          });
        }

        const { error: sbError } = await supabase
          .from('events_metadata')
          .insert([{
            event_pda: eventPDA.toBase58(),
            event_id: eventData.eventId,
            name: eventData.name,
            description: eventData.description,
            image_url: eventData.imageUrl,
            location: eventData.location,
            event_start: `${eventData.startDate}T${eventData.startTime}:00Z`,
            organizer_pubkey: publicKey.toBase58()
          }]);

        if (sbError) throw sbError;
        addToast("Event successfully created and is now live!", 'success');
        onSuccess?.();
      } catch (err: any) {
        addToast(`Event creation failed: ${err.message}`, 'error');
      } finally {
        setLoading(false);
      }
  };

  return (
    <NeoCard className="p-6 bg-white border-4 border-black max-h-[85vh] overflow-y-auto shadow-[12px_12px_0_0_#000000]">
      <h2 className="font-display font-black text-3xl mb-6 uppercase tracking-tighter">Publish New Event</h2>
      
      <div className="space-y-6 font-mono">
        {/* Event Info */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <NeoInput label="EVENT SLUG (ID)" placeholder="straykids-jkt" value={eventData.eventId} onChange={e => setEventData({...eventData, eventId: e.target.value})} />
            <NeoInput label="DISPLAY NAME" placeholder="Stray Kids World Tour" value={eventData.name} onChange={e => setEventData({...eventData, name: e.target.value})} />
          </div>
          <NeoInput label="LOCATION" placeholder="Stadion Madya, Jakarta" value={eventData.location} onChange={e => setEventData({...eventData, location: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <NeoInput label="DATE" type="date" value={eventData.startDate} onChange={e => setEventData({...eventData, startDate: e.target.value})} />
            <NeoInput label="TIME" type="time" value={eventData.startTime} onChange={e => setEventData({...eventData, startTime: e.target.value})} />
          </div>
          <NeoInput label="IMAGE URL" value={eventData.imageUrl} onChange={e => setEventData({...eventData, imageUrl: e.target.value})} />
            <div className="flex flex-col gap-2">
            <label className="text-xs font-black uppercase tracking-widest">Description</label>
            <textarea 
              placeholder="Tell us about the event..."
              className="w-full border-4 border-black p-3 outline-none focus:bg-neutral-50 min-h-[100px] resize-none font-mono text-sm"
              value={eventData.description}
              onChange={e => setEventData({...eventData, description: e.target.value})}
            />
          </div>
        </div>

        {/* Tiers Management */}
        <div className="border-t-4 border-black pt-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-black text-xl text-[#FF00F5]">TICKET TIERS</h4>
            <NeoButton variant="secondary" className="text-xs py-1" onClick={addTier}>+ ADD TIER</NeoButton>
          </div>

          {tiers.map((tier, index) => (
            <div key={index} className="bg-neutral-100 border-4 border-black p-4 mb-4 relative">
               {tiers.length > 1 && (
                 <button onClick={() => removeTier(index)} className="absolute top-2 right-2 text-red-500 font-bold">[X]</button>
               )}
               <div className="grid grid-cols-2 gap-3 mb-3">
                 <NeoInput label="TIER ID (E.g: VIP)" value={tier.tierId} onChange={e => handleTierChange(index, 'tierId', e.target.value)} />
                 <NeoInput label="TIER NAME" value={tier.name} onChange={e => handleTierChange(index, 'name', e.target.value)} />
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <NeoInput label="PRICE (SOL)" type="number" value={tier.priceSol} onChange={e => handleTierChange(index, 'priceSol', e.target.value)} />
                 <NeoInput label="SUPPLY" type="number" value={tier.supply} onChange={e => handleTierChange(index, 'supply', e.target.value)} />
               </div>
            </div>
          ))}
        </div>

        <NeoButton variant="primary" className="w-full py-4 text-2xl shadow-[8px_8px_0_0_#000000]" onClick={handlePublish} disabled={loading}>
          {loading ? "DEPLOYING MULTI-TIER..." : "CONFIRM & GO LIVE 🚀"}
        </NeoButton>
      </div>
    </NeoCard>
  );
};