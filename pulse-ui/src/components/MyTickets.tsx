import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Ticket, CalendarDays, X, Download } from 'lucide-react';

import { useProgram } from '../hooks/useProgram';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext'; // NEW: Import useToast
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface MyTicketsProps {
  ownerPublicKey: PublicKey;
}

interface TicketNFT {
  mint: string;
  eventPda: string;
  metadata: any;
  onChainStatus: string;
  nftMetadata?: {
    name:string;
    description: string;
    image: string;
    attributes: Array<{ trait_type: string; value: string }>;
  };
  itinerary?: any;
  reasoning?: string;
}

type View = 'list' | 'calendar';

export const MyTickets = ({ ownerPublicKey }: MyTicketsProps) => {
  const { connection } = useProgram();
  const { user } = useAuth();
  const { addToast } = useToast(); // NEW: Initialize useToast

  const [tickets, setTickets] = useState<TicketNFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketNFT | null>(null);
  const [activeView, setActiveView] = useState<View>('list');
  
  const [gcalEvents, setGcalEvents] = useState<any[]>([]); 

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
      console.log("Scanning blockchain for ticket NFTs...");

      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(ownerPublicKey, {
        programId: TOKEN_PROGRAM_ID,
      });

      const potentialNFTs = tokenAccounts.value.filter(
        (t) => t.account.data.parsed.info.tokenAmount.uiAmount === 1
      );

      const ticketList: TicketNFT[] = [];

      for (const token of potentialNFTs) {
        const mintAddress = new PublicKey(token.account.data.parsed.info.mint);
        const mintInfo = await connection.getAccountInfo(mintAddress);
        if (!mintInfo) continue;

        const mintAuthority = new PublicKey(mintInfo.data.slice(4, 36));
        const eventPdaStr = mintAuthority.toBase58();

        const { data: meta } = await supabase
          .from('events_metadata')
          .select('*')
          .eq('event_pda', eventPdaStr)
          .single();

        if (meta) {
          const metadataPDA = PublicKey.findProgramAddressSync(
            [
              Buffer.from("metadata"),
              new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
              mintAddress.toBuffer(),
            ],
            new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
          )[0];

          const onChainMetadata = await fetchNFTMetadata(metadataPDA);
          let nftMetadata = null;

          if (onChainMetadata?.uri) {
            nftMetadata = await fetchMetadataFromURI(onChainMetadata.uri);
          }

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
            console.log("No AI itinerary found for this ticket.");
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

  const fetchGoogleCalendar = useCallback(async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase.from('user_profiles').select('google_access_token').eq('id', user.id).single();
      
      if (profile?.google_access_token) {
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

  useEffect(() => {
    fetchOnChainTickets();
    fetchGoogleCalendar();
  }, [fetchOnChainTickets, fetchGoogleCalendar]);

  const getCalendarEvents = () => {
    const events: any[] = [];
    
    tickets.forEach(ticket => {
      if (ticket.metadata.event_start) {
        const eventDate = new Date(ticket.metadata.event_start);
        events.push({
          title: `🎫 ${ticket.nftMetadata?.name || ticket.metadata.name}`,
          start: eventDate,
          end: new Date(eventDate.getTime() + 3 * 60 * 60 * 1000),
          resource: ticket,
          type: 'ticket'
        });

        if (ticket.itinerary && ticket.itinerary.status !== 'Local Event - No Flight Needed') {
           const flightDate = new Date(eventDate.getTime() - 6 * 60 * 60 * 1000);
           events.push({
              title: `✈️ Flight: ${ticket.itinerary.provider || ticket.itinerary.airline || 'Logistics'}`,
              start: flightDate,
              end: new Date(flightDate.getTime() + 2 * 60 * 60 * 1000),
              resource: ticket,
              type: 'flight'
           });
        }
      }
    });

    gcalEvents.forEach(item => {
      const dateStr = item.start?.dateTime || item.start?.date;
      const endStr = item.end?.dateTime || item.end?.date;
      if (dateStr) {
        events.push({
          title: `📅 ${item.summary || 'Busy Schedule'}`,
          start: new Date(dateStr),
          end: endStr ? new Date(endStr) : new Date(dateStr),
          resource: null,
          type: 'gcal'
        });
      }
    });

    return events;
  };

  const calendarEvents = getCalendarEvents();

  if (loading) {
    return (
      <div className="text-center py-20 font-mono">
        <p className="font-black text-xl italic uppercase">Scanning On-Chain Assets...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 p-4">
      <div className="relative border-b-8 border-black pb-6">
        <h2 className="font-black text-7xl tracking-tighter uppercase italic leading-none">
          My Tickets
        </h2>
        <div className="absolute top-0 right-0 bg-[#00FF41] border-4 border-black px-4 py-2 font-mono font-bold shadow-[4px_4px_0_0_#000000]">
          {tickets.length} TICKETS
        </div>
      </div>

      <div className="flex gap-8 flex-col lg:flex-row">
        <div className="flex lg:flex-col gap-4">
          <button
            onClick={() => { setActiveView('list'); setSelectedTicket(null); }}
            className={`p-4 border-4 border-black shadow-[4px_4px_0_0_#000] transition-all ${
              activeView === 'list'
                ? 'bg-[#FF00F5] text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            <Ticket size={24} />
          </button>
          <button
            onClick={() => setActiveView('calendar')}
            className={`p-4 border-4 border-black shadow-[4px_4px_0_0_#000] transition-all ${
              activeView === 'calendar'
                ? 'bg-[#FF00F5] text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            <CalendarDays size={24} />
          </button>
        </div>

        <div className="flex-1 w-full relative">
          {tickets.length === 0 && activeView === 'list' ? (
            <div className="bg-neutral-100 border-8 border-black p-20 text-center shadow-[12px_12px_0_0_#000000]">
              <h3 className="font-black text-4xl mb-4 uppercase">No Tickets Found</h3>
              <p className="font-mono text-neutral-500">Purchase tickets through the Marketplace or deploy AI Agents to snipe them!</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full flex gap-8"
              >
                
                {activeView === 'list' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
                    {tickets.map((ticket, index) => (
                      <motion.div
                        key={ticket.mint}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="group relative cursor-pointer"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <div className="bg-white border-4 border-black shadow-[8px_8px_0_0_#000000] overflow-hidden transition-all group-hover:shadow-[12px_12px_0_0_#FF00F5] group-hover:-translate-y-1 flex flex-col h-full">
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

                          <div className="p-4 space-y-3 flex flex-col flex-1">
                            <div>
                              <h3 className="font-black text-lg uppercase leading-tight truncate">
                                {ticket.nftMetadata?.name || ticket.metadata.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="w-2 h-2 bg-[#00FF41] rounded-full animate-pulse" />
                                <span className="font-mono text-[10px] font-bold text-[#FF00F5] uppercase tracking-widest">Pulse Protocol Verified</span>
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
                            <div className="mt-auto pt-2">
                              <button className="w-full bg-black text-white px-4 py-3 border-4 border-black hover:bg-[#FF00F5] transition-colors font-black text-sm uppercase">
                                Details
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {activeView === 'calendar' && (
                  <div className="flex w-full gap-6">
                    <div className={`transition-all duration-300 ${selectedTicket ? 'w-2/3' : 'w-full'} h-[75vh] bg-white border-8 border-black p-4 shadow-[12px_12px_0_0_#000000]`}>
                       <Calendar
                          localizer={localizer}
                          events={calendarEvents}
                          startAccessor="start"
                          endAccessor="end"
                          onSelectEvent={event => {
                             if(event.resource) {
                               setSelectedTicket(event.resource as TicketNFT);
                             } else {
                               setSelectedTicket(null);
                             }
                          }}
                          eventPropGetter={(event) => {
                             let bgColor = '#FFEB3B';
                             let color = 'black';
                             if(event.type === 'ticket') { bgColor = '#00FF41'; }
                             if(event.type === 'flight') { bgColor = '#FF00F5'; color = 'white'; }
                             
                             return {
                               style: {
                                  backgroundColor: bgColor,
                                  color: color,
                                  border: '2px solid black',
                                  borderRadius: '0px',
                                  fontWeight: 'bold',
                                  fontFamily: 'monospace'
                               }
                             }
                          }}
                        />
                    </div>

                    <AnimatePresence>
                      {selectedTicket && (
                        <motion.div 
                          initial={{ width: 0, opacity: 0, x: 20 }}
                          animate={{ width: '33.333333%', opacity: 1, x: 0 }}
                          exit={{ width: 0, opacity: 0, x: 20 }}
                          className="bg-neutral-50 border-8 border-black shadow-[12px_12px_0_0_#000000] overflow-y-auto h-[75vh] flex flex-col relative shrink-0"
                        >
                          <button 
                            onClick={() => setSelectedTicket(null)}
                            className="absolute top-2 right-2 bg-black text-white p-1 hover:bg-[#FF00F5] transition-colors"
                          >
                            <X size={20} />
                          </button>

                          <div className="p-4 border-b-4 border-black bg-white">
                            <h3 className="font-black text-xl uppercase italic">Ticket Specs</h3>
                            <p className="font-mono text-xs text-neutral-500 mt-1 truncate">{selectedTicket.metadata.name}</p>
                          </div>

                          <div className="p-4 space-y-6 flex-1">
                            <div className="aspect-video border-4 border-black bg-black">
                              <img src={selectedTicket.nftMetadata?.image || selectedTicket.metadata.image_url} className="w-full h-full object-cover opacity-80" />
                            </div>

                            <div className="space-y-2 font-mono text-sm">
                              <div className="flex justify-between border-b-2 border-dashed border-neutral-300 pb-1">
                                <span className="text-neutral-500">Tier:</span>
                                <span className="font-bold bg-[#FF00F5] text-white px-2 text-xs">
                                  {selectedTicket.nftMetadata?.attributes?.find((a) => a.trait_type === 'Tier')?.value || 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between border-b-2 border-dashed border-neutral-300 pb-1">
                                <span className="text-neutral-500">Date:</span>
                                <span className="font-bold text-right">{new Date(selectedTicket.metadata.event_start).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {selectedTicket.itinerary && (
                              <div className="bg-[#00FF41]/10 border-4 border-[#00FF41] p-3 shadow-[4px_4px_0_0_#00FF41] space-y-3">
                                <div className="flex items-center gap-2 border-b-2 border-black pb-2">
                                  <span className="animate-bounce">✈️</span>
                                  <span className="font-black text-sm uppercase">Logistics</span>
                                </div>
                                <div className="font-mono text-xs space-y-1">
                                  <div className="flex justify-between"><span className="text-neutral-500">Airline:</span><span className="font-bold">{selectedTicket.itinerary.provider || selectedTicket.itinerary.airline || 'N/A'}</span></div>
                                  <div className="flex justify-between"><span className="text-neutral-500">Time:</span><span className="font-bold">{selectedTicket.itinerary.departure_time || 'N/A'}</span></div>
                                  <div className="flex justify-between"><span className="text-neutral-500">Est. Cost:</span><span className="font-bold text-[#FF00F5]">${selectedTicket.itinerary.estimated_cost_usd || '0'}</span></div>
                                </div>
                              </div>
                            )}

                            {selectedTicket.reasoning && (
                              <div className="bg-black text-[#00FF41] p-3 font-mono text-[10px] border-4 border-black">
                                <div className="text-neutral-500 mb-1 border-b border-neutral-800 pb-1">AI_LOG.txt</div>
                                <div className="leading-tight h-32 overflow-y-auto pr-2 custom-scrollbar">
                                  {selectedTicket.reasoning}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="p-4 bg-white border-t-4 border-black mt-auto">
                            <button 
                              onClick={() => setActiveView('list')}
                              className="w-full bg-black text-white font-black py-3 uppercase hover:bg-[#FF00F5] hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000000] transition-all"
                            >
                              Expand View
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedTicket && activeView === 'list' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            onClick={() => setSelectedTicket(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl relative"
            >
              <div className="bg-black text-[#00FF41] px-6 py-3 font-mono font-bold text-sm flex justify-between items-center border-t-8 border-l-8 border-r-8 border-black">
                <span>PULSE_OS_TICKET_VIEWER.exe</span>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-black bg-[#FF00F5] border-2 border-black w-6 h-6 flex items-center justify-center font-black hover:bg-white"
                >
                  X
                </button>
              </div>
              <div className="bg-white border-8 border-black shadow-[24px_24px_0_0_#000000] overflow-hidden max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="relative aspect-video bg-black">
                  <img
                    src={selectedTicket.nftMetadata?.image || selectedTicket.metadata.image_url || 'https://via.placeholder.com/500'}
                    alt={selectedTicket.nftMetadata?.name || selectedTicket.metadata.name}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
                    <h2 className="font-black text-4xl md:text-6xl uppercase italic leading-none text-white drop-shadow-lg">
                      {selectedTicket.metadata.name}
                    </h2>
                  </div>
                </div>

                <div className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-4 md:col-span-2">
                      <h3 className="font-black text-2xl uppercase italic border-b-4 border-black pb-2">Event Information</h3>
                      <div className="space-y-3 font-mono text-base">
                        <div className="flex justify-between border-b-2 border-gray-200 py-2"><span className="text-neutral-500">Venue</span><span className="font-bold truncate max-w-[200px]">{selectedTicket.metadata.location}</span></div>
                        <div className="flex justify-between border-b-2 border-gray-200 py-2"><span className="text-neutral-500">Date</span><span className="font-bold">{selectedTicket.metadata.event_start ? new Date(selectedTicket.metadata.event_start).toLocaleDateString() : 'TBD'}</span></div>
                        <div className="flex justify-between pt-2"><span className="text-neutral-500">Time</span><span className="font-bold">{selectedTicket.metadata.event_start ? new Date(selectedTicket.metadata.event_start).toLocaleTimeString() : 'TBD'}</span></div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-black text-2xl uppercase italic border-b-4 border-black pb-2">Ticket</h3>
                      <div className="space-y-3 font-mono text-base">
                        <div className="flex justify-between border-b-2 border-gray-200 py-2"><span className="text-neutral-500">Tier</span><span className="font-bold bg-[#FF00F5] text-white px-3 py-1">{selectedTicket.nftMetadata?.attributes?.find((attr) => attr.trait_type === 'Tier')?.value || 'N/A'}</span></div>
                        <div className="flex justify-between pt-2"><span className="text-neutral-500">Owner</span><span className="font-bold text-xs">{ownerPublicKey.toBase58().slice(0, 8)}...</span></div>
                      </div>
                    </div>
                  </div>

                  {selectedTicket.itinerary && (
                    <div className="space-y-4">
                      <h3 className="font-black text-2xl uppercase italic border-b-4 border-black pb-2 flex items-center gap-3">
                        <span className="text-3xl">✈️</span>
                        <span>AI Logistics</span>
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-sm">
                        <div className="bg-neutral-100 border-2 border-black p-3 shadow-[4px_4px_0_0_#000000]"><div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Status</div><div className="font-black text-base text-[#FF00F5] uppercase">{selectedTicket.itinerary.status || 'N/A'}</div></div>
                        <div className="bg-neutral-100 border-2 border-black p-3 shadow-[4px_4px_0_0_#000000]"><div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Provider</div><div className="font-black text-base uppercase">{selectedTicket.itinerary.provider || selectedTicket.itinerary.airline || 'N/A'}</div></div>
                        <div className="bg-neutral-100 border-2 border-black p-3 shadow-[4px_4px_0_0_#000000]"><div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Departure</div><div className="font-black text-base uppercase">{selectedTicket.itinerary.departure_time || 'N/A'}</div></div>
                        <div className="bg-neutral-100 border-2 border-black p-3 shadow-[4px_4px_0_0_#000000]"><div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Est. Cost</div><div className="font-black text-base uppercase">${selectedTicket.itinerary.estimated_cost_usd || '0'}</div></div>
                      </div>
                      {selectedTicket.reasoning && (
                        <div className="bg-black p-4 border-4 border-black mt-4">
                          <div className="text-[12px] text-[#00FF41] font-mono mb-2 border-b border-[#00FF41]/30 pb-1 flex items-center justify-between">
                            <span>AI_REASONING_LOG.txt</span>
                            <span className="animate-pulse">_</span>
                          </div>
                          <div className="text-white text-sm font-mono leading-relaxed max-h-24 overflow-y-auto custom-scrollbar pr-2">{selectedTicket.reasoning}</div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t-8 border-black">
                    <button className="flex-1 flex items-center justify-center gap-2 border-4 border-black bg-[#FFEB3B] py-3 font-black uppercase hover:bg-[#FFD600] hover:-translate-y-1 transition-all shadow-[4px_4px_0_0_#000]">
                      <Download size={20}/>
                      Download
                    </button>
                    <button className="flex-1 border-4 border-black bg-[#00FF41] py-3 font-black uppercase hover:bg-[#00DD3A] transition-colors" onClick={() => window.open(`https://explorer.solana.com/address/${selectedTicket.mint}?cluster=devnet`, '_blank')}>View on Solscan</button>
                    <button className="flex-1 border-4 border-black bg-black text-white py-3 font-black uppercase hover:bg-[#FF00F5] transition-colors" onClick={() => { navigator.clipboard.writeText(selectedTicket.mint); addToast("Copied Mint Address!", "success"); }}>Copy Mint</button>
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