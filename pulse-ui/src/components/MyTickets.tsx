import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useProgram } from '../hooks/useProgram';
import { supabase } from '../utils/supabase';
// //NEW: Import useAuth buat dapetin token Google
import { useAuth } from '../contexts/AuthContext';

interface MyTicketsProps {
  ownerPublicKey: PublicKey;
}

interface TicketNFT {
  mint: string;
  eventPda: string;
  metadata: any;
  onChainStatus: string;
  nftMetadata?: {
    name: string;
    description: string;
    image: string;
    attributes: Array<{ trait_type: string; value: string }>;
  };
  itinerary?: any; 
  reasoning?: string;
}

// //NEW: Interface buat Timeline gabungan (GCal + Ticket + Flight)
interface TimelineEvent {
  id: string;
  type: 'ticket' | 'flight' | 'calendar';
  date: Date;
  title: string;
  description: string;
  timeString: string;
}

export const MyTickets = ({ ownerPublicKey }: MyTicketsProps) => {
  const { connection } = useProgram();
  const { user } = useAuth(); // //NEW: Tarik user session

  const [tickets, setTickets] = useState<TicketNFT[]>([]);
  const [gcalEvents, setGcalEvents] = useState<any[]>([]); // //NEW: State GCal
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketNFT | null>(null);

  // ==========================================
  // 1. FETCH TICKET DARI BLOCKCHAIN (TETAP SAMA)
  // ==========================================
  const fetchNFTMetadata = async (metadataAddress: PublicKey): Promise<any> => {
    try {
      const accountInfo = await connection.getAccountInfo(metadataAddress);
      if (!accountInfo) return null;
      const metadata = accountInfo.data;
      const data = metadata.slice(1);
      const nameLength = data.readUInt8(0);
      const symbolLength = data.readUInt8(1 + nameLength);
      const uriLength = data.readUInt8(2 + nameLength + symbolLength);
      const name = data.slice(1, 1 + nameLength).toString('utf8');
      const uri = data.slice(3 + nameLength + symbolLength, 3 + nameLength + symbolLength + uriLength).toString('utf8');
      return { name, uri };
    } catch (e) {
      console.error('Failed to parse NFT metadata:', e);
      return null;
    }
  };

  const fetchMetadataFromURI = async (uri: string): Promise<any> => {
    try {
      if (uri.startsWith('data:application/json;base64,')) {
        const base64Data = uri.split(',')[1];
        const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
        return JSON.parse(jsonString);
      }
      if (uri.startsWith('http')) {
        const response = await fetch(uri);
        return await response.json();
      }
      return null;
    } catch (e) {
      console.error('Failed to fetch metadata from URI:', e);
      return null;
    }
  };

  const fetchOnChainTickets = useCallback(async () => {
    if (!connection || !ownerPublicKey) return;
    try {
      setLoading(true);
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(ownerPublicKey, { programId: TOKEN_PROGRAM_ID });
      const potentialNFTs = tokenAccounts.value.filter((t) => t.account.data.parsed.info.tokenAmount.uiAmount === 1);
      const ticketList: TicketNFT[] = [];

      for (const token of potentialNFTs) {
        const mintAddress = new PublicKey(token.account.data.parsed.info.mint);
        const mintInfo = await connection.getAccountInfo(mintAddress);
        if (!mintInfo) continue;

        const mintAuthority = new PublicKey(mintInfo.data.slice(4, 36));
        const eventPdaStr = mintAuthority.toBase58();

        const { data: meta } = await supabase.from('events_metadata').select('*').eq('event_pda', eventPdaStr).single();

        if (meta) {
          const metadataPDA = PublicKey.findProgramAddressSync(
            [Buffer.from("metadata"), new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(), mintAddress.toBuffer()],
            new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
          )[0];

          const onChainMetadata = await fetchNFTMetadata(metadataPDA);
          let nftMetadata = null;
          if (onChainMetadata?.uri) nftMetadata = await fetchMetadataFromURI(onChainMetadata.uri);

          let aiItinerary = null;
          let aiReasoning = null;
          try {
            const { data: missionData } = await supabase
              .from('agent_missions')
              .select('secured_itinerary, agent_reasoning_log')
              .eq('event_pda', eventPdaStr)
              .eq('agent_owner', ownerPublicKey.toBase58())
              .not('secured_itinerary', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
              
            if (missionData) {
              aiItinerary = missionData.secured_itinerary;
              aiReasoning = missionData.agent_reasoning_log;
            }
          } catch (e) {
            console.log("No AI itinerary found.");
          }

          ticketList.push({
            mint: mintAddress.toBase58(),
            eventPda: eventPdaStr,
            metadata: meta,
            onChainStatus: 'VERIFIED_NFT',
            nftMetadata: nftMetadata || undefined,
            itinerary: aiItinerary,
            reasoning: aiReasoning,
          });
        }
      }
      setTickets(ticketList);
    } catch (error) {
      console.error('[MyTickets] On-chain fetch failed:', error);
    } finally {
      setLoading(false);
    }
  }, [connection, ownerPublicKey]);

  // ==========================================
  // 2. FETCH REAL GOOGLE CALENDAR (FRONTEND)
  // ==========================================
  const fetchGoogleCalendar = useCallback(async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase.from('user_profiles').select('google_access_token').eq('id', user.id).single();
      
      if (profile?.google_access_token) {
        // Ambil jadwal dari hari ini sampe 30 hari ke depan
        const timeMin = new Date().toISOString();
        const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); 
        
        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`, {
          headers: { Authorization: `Bearer ${profile.google_access_token}` }
        });

        if (response.ok) {
          const json = await response.json();
          setGcalEvents(json.items || []);
        }
      }
    } catch (e) {
      console.error("Failed to fetch Google Calendar from client", e);
    }
  }, [user]);

  // Eksekusi Fetcher
  useEffect(() => {
    fetchOnChainTickets();
    fetchGoogleCalendar();
  }, [fetchOnChainTickets, fetchGoogleCalendar]);

  // ==========================================
  // 3. COMPILE & SORT TIMELINE
  // ==========================================
  const getTimeline = (): TimelineEvent[] => {
    const timeline: TimelineEvent[] = [];

    // A. Masukin data GCal
    gcalEvents.forEach(item => {
      const dateStr = item.start?.dateTime || item.start?.date;
      if (dateStr) {
        timeline.push({
          id: item.id,
          type: 'calendar',
          date: new Date(dateStr),
          title: item.summary || 'Busy Schedule',
          description: 'Personal Google Calendar',
          timeString: new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    });

    // B. Masukin data Tiket Konser & Itinerary Pesawat
    tickets.forEach(ticket => {
      if (ticket.metadata?.event_start) {
        const tDate = new Date(ticket.metadata.event_start);
        
        // Push Event Konser
        timeline.push({
          id: ticket.mint + '_ticket',
          type: 'ticket',
          date: tDate,
          title: ticket.metadata.name,
          description: `Venue: ${ticket.metadata.location}`,
          timeString: tDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        // Push Itinerary Pesawat (kalau ada & butuh terbang)
        if (ticket.itinerary && ticket.itinerary.status !== 'Local Event - No Flight Needed') {
          // Asumsi pesawat berangkat di hari yang sama, 6 jam sebelum event
          const flightDate = new Date(tDate.getTime() - 6 * 60 * 60 * 1000); 
          timeline.push({
            id: ticket.mint + '_flight',
            type: 'flight',
            date: flightDate,
            title: `Flight: ${ticket.itinerary.provider || ticket.itinerary.airline || 'Logistics'}`,
            description: ticket.itinerary.status,
            timeString: ticket.itinerary.departure_time || flightDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }
      }
    });

    // Sort by Date Ascending
    return timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const timelineEvents = getTimeline();

  if (loading) {
    return (
      <div className="text-center py-20 font-mono">
        <p className="font-black text-xl italic uppercase">Scanning Neural Net...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 flex flex-col xl:flex-row gap-8 items-start">
      
      {/* ===================================== */}
      {/* KIRI: MAIN TICKETS GRID (80% Width) */}
      {/* ===================================== */}
      <div className="flex-1 w-full space-y-8">
        {/* Brutalist Header */}
        <div className="relative border-b-8 border-black pb-6">
          <h2 className="font-black text-7xl tracking-tighter uppercase italic leading-none">
            My Tickets
          </h2>
          <div className="absolute top-0 right-0 bg-[#00FF41] border-4 border-black px-4 py-2 font-mono font-bold shadow-[4px_4px_0_0_#000000]">
            {tickets.length} ASSETS
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="bg-neutral-100 border-8 border-black p-20 text-center shadow-[12px_12px_0_0_#000000]">
            <h3 className="font-black text-4xl mb-4 uppercase">No Tickets Found</h3>
            <p className="font-mono text-neutral-500">Purchase tickets through the Marketplace or deploy AI Agents to snipe them!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((ticket, index) => (
              <motion.div
                key={ticket.mint}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="group relative cursor-pointer"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="bg-white border-4 border-black shadow-[8px_8px_0_0_#000000] overflow-hidden transition-all group-hover:shadow-[12px_12px_0_0_#FF00F5] group-hover:-translate-y-1">
                  <div className="relative aspect-[5/3] border-b-4 border-black bg-black">
                    <img
                      src={ticket.nftMetadata?.image || ticket.metadata.image_url || 'https://via.placeholder.com/500'}
                      alt={ticket.nftMetadata?.name || ticket.metadata.name || 'Ticket NFT'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white font-mono font-bold text-sm">VIEW DETAILS</span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-black text-lg uppercase leading-tight truncate">
                        {ticket.nftMetadata?.name || ticket.metadata.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 bg-[#00FF41] rounded-full animate-pulse" />
                        <span className="font-mono text-[10px] font-bold text-[#FF00F5] uppercase tracking-widest">On-Chain Asset</span>
                      </div>
                    </div>

                    <div className="bg-neutral-50 border-2 border-black p-3 font-mono text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">VENUE:</span>
                        <span className="font-bold truncate max-w-[120px]">{ticket.metadata.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">DATE:</span>
                        <span className="font-bold">
                          {ticket.metadata.event_start ? new Date(ticket.metadata.event_start).toLocaleDateString() : 'TBD'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 border-4 border-black bg-[#FFEB3B] text-black font-black text-center py-2 text-xs italic shadow-[2px_2px_0_0_#000000]">
                        VERIFIED
                      </div>
                      {ticket.itinerary && (
                        <div className="border-4 border-black bg-black text-[#00FF41] flex items-center justify-center px-3" title="AI Itinerary Secured">
                          <span className="text-lg">✈️</span>
                        </div>
                      )}
                      <button className="bg-black text-white px-3 py-2 border-4 border-black hover:bg-[#FF00F5] transition-colors">
                        <span className="font-black text-xs">VIEW</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ===================================== */}
      {/* KANAN: SIDEBAR SCHEDULE (20% Width) */}
      {/* ===================================== */}
      <div className="w-full xl:w-[380px] shrink-0 bg-white border-8 border-black shadow-[12px_12px_0_0_#000000] sticky top-32 overflow-hidden">
        {/* Sidebar Header */}
        <div className="bg-black text-white p-4 flex justify-between items-center border-b-4 border-black">
          <h3 className="font-black text-xl uppercase italic tracking-wider">AI Synced Itinerary</h3>
          <span className="w-3 h-3 bg-[#00FF41] rounded-full animate-pulse" />
        </div>

        {/* Timeline Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto bg-neutral-50 space-y-6 relative">
          {/* Garis vertikal di tengah */}
          <div className="absolute left-[34px] top-6 bottom-6 w-1 bg-black z-0" />

          {timelineEvents.length === 0 ? (
             <div className="text-center font-mono text-sm text-neutral-500 py-10">No upcoming schedule detected.</div>
          ) : (
            timelineEvents.map((item, idx) => (
              <div key={idx} className="relative z-10 pl-12">
                {/* Bulatan indikator warna */}
                <div 
                  className={`absolute left-[3.5px] top-4 w-6 h-6 border-4 border-black rounded-none flex items-center justify-center text-xs font-bold
                    ${item.type === 'ticket' ? 'bg-[#00FF41]' : item.type === 'flight' ? 'bg-[#FF00F5] text-white' : 'bg-[#FFEB3B]'}
                  `}
                >
                  {item.type === 'ticket' ? '🎫' : item.type === 'flight' ? '✈️' : '📅'}
                </div>

                {/* Box Event */}
                <div className="bg-white border-4 border-black p-3 hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000000] transition-all">
                  <div className="text-[10px] font-mono text-neutral-500 font-bold uppercase mb-1">
                    {item.date.toLocaleDateString()} • {item.timeString}
                  </div>
                  <div className="font-black uppercase text-sm leading-tight mb-1">{item.title}</div>
                  <div className="text-[10px] font-mono text-neutral-600 truncate">{item.description}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ===================================== */}
      {/* TICKET DETAIL MODAL (TETAP SAMA) */}
      {/* ===================================== */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto py-20"
            onClick={() => setSelectedTicket(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl relative my-auto"
            >
              <button
                onClick={() => setSelectedTicket(null)}
                className="absolute -top-12 right-0 bg-white text-black px-6 py-3 border-4 border-black font-black font-mono text-sm hover:bg-[#FF00F5] hover:text-white transition-colors"
              >
                CLOSE
              </button>

              <div className="bg-white border-8 border-black shadow-[16px_16px_0_0_#000000] overflow-hidden">
                <div className="relative aspect-[5/3] bg-black">
                  <img
                    src={selectedTicket.nftMetadata?.image || selectedTicket.metadata.image_url || 'https://via.placeholder.com/500'}
                    alt={selectedTicket.nftMetadata?.name || selectedTicket.metadata.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
                    <h2 className="font-black text-4xl md:text-5xl uppercase italic leading-none text-white drop-shadow-lg">
                      {selectedTicket.metadata.name}
                    </h2>
                  </div>
                </div>

                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-[#00FF41] rounded-full animate-pulse" />
                      <span className="font-mono text-sm font-bold text-[#FF00F5] uppercase tracking-widest">Pulse Protocol Verified</span>
                    </div>
                    <div className="border-4 border-black bg-[#FFEB3B] text-black px-4 py-2 font-black italic shadow-[2px_2px_0_0_#000000]">
                      VERIFIED NFT
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-display font-bold text-xl uppercase border-b-4 border-black pb-2">Event Info</h3>
                      <div className="space-y-3 font-mono text-sm">
                        <div className="flex justify-between border-b-2 border-gray-200 pb-2">
                          <span className="text-neutral-500">Venue</span>
                          <span className="font-bold">{selectedTicket.metadata.location}</span>
                        </div>
                        <div className="flex justify-between border-b-2 border-gray-200 pb-2">
                          <span className="text-neutral-500">Date</span>
                          <span className="font-bold">
                            {selectedTicket.metadata.event_start ? new Date(selectedTicket.metadata.event_start).toLocaleDateString() : 'TBD'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-display font-bold text-xl uppercase border-b-4 border-black pb-2">Ticket Details</h3>
                      <div className="space-y-3 font-mono text-sm">
                        <div className="flex justify-between border-b-2 border-gray-200 pb-2">
                          <span className="text-neutral-500">Tier</span>
                          <span className="font-bold bg-[#FF00F5] text-white px-3 py-1">
                            {selectedTicket.nftMetadata?.attributes?.find((attr) => attr.trait_type === 'Tier')?.value || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Mint</span>
                          <span className="font-bold text-xs">{selectedTicket.mint.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedTicket.itinerary && (
                    <div className="bg-[#00FF41]/10 border-4 border-[#00FF41] p-6 space-y-4 shadow-[8px_8px_0_0_#00FF41]">
                      <div className="flex items-center gap-3 border-b-4 border-[#00FF41] pb-2">
                        <span className="text-2xl animate-bounce">🤖</span>
                        <h3 className="font-display font-black text-xl uppercase tracking-widest text-black italic">
                          AI Logistics Secured
                        </h3>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-sm">
                        <div className="bg-white border-2 border-black p-3 shadow-[4px_4px_0_0_#000000]">
                          <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Status</div>
                          <div className="font-black text-[#FF00F5] uppercase">{selectedTicket.itinerary.status || 'Simulated Booking'}</div>
                        </div>
                        <div className="bg-white border-2 border-black p-3 shadow-[4px_4px_0_0_#000000]">
                          <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Provider</div>
                          <div className="font-black uppercase">{selectedTicket.itinerary.provider || selectedTicket.itinerary.airline || 'N/A'}</div>
                        </div>
                        <div className="bg-white border-2 border-black p-3 shadow-[4px_4px_0_0_#000000]">
                          <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Departure</div>
                          <div className="font-black uppercase">{selectedTicket.itinerary.departure_time || 'N/A'}</div>
                        </div>
                        <div className="bg-white border-2 border-black p-3 shadow-[4px_4px_0_0_#000000]">
                          <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Cost Est.</div>
                          <div className="font-black uppercase">${selectedTicket.itinerary.estimated_cost_usd || '0'}</div>
                        </div>
                      </div>

                      {selectedTicket.reasoning && (
                        <div className="bg-black p-4 border-2 border-black mt-4">
                          <div className="text-[10px] text-[#00FF41] font-mono mb-2 border-b border-[#00FF41]/30 pb-1">AI_REASONING_LOG.txt</div>
                          <div className="text-white text-xs font-mono leading-relaxed">
                            <span className="text-[#FF00F5]">{"> "}</span>{selectedTicket.reasoning}<span className="animate-pulse">_</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-4 pt-4 border-t-4 border-black">
                    <button className="flex-1 border-4 border-black bg-[#00FF41] py-3 font-black font-bold hover:bg-[#FF00F5] hover:text-white transition-colors" onClick={() => window.open(`https://explorer.solana.com/address/${selectedTicket.mint}?cluster=devnet`, '_blank')}>
                      VIEW ON SOLSCAN
                    </button>
                    <button className="flex-1 border-4 border-black bg-black text-white py-3 font-black font-bold hover:bg-[#FF00F5] hover:text-white transition-colors" onClick={() => { navigator.clipboard.writeText(selectedTicket.mint); alert("Copied!"); }}>
                      COPY MINT
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};