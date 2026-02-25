import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useProgram } from '../hooks/useProgram';
import { supabase } from '../utils/supabase';

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
}

export const MyTickets = ({ ownerPublicKey }: MyTicketsProps) => {
  const { connection } = useProgram();
  const [tickets, setTickets] = useState<TicketNFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketNFT | null>(null);

  const fetchNFTMetadata = async (metadataAddress: PublicKey): Promise<any> => {
    try {
      const accountInfo = await connection.getAccountInfo(metadataAddress);
      if (!accountInfo) return null;

      // Parse Metaplex metadata
      const metadata = accountInfo.data;
      // Skip the first byte (discriminator)
      const data = metadata.slice(1);

      // Read metadata from the account data
      // This is a simplified parser - in production use the Metaplex SDK
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
      // Handle data URI
      if (uri.startsWith('data:application/json;base64,')) {
        const base64Data = uri.split(',')[1];
        const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
        return JSON.parse(jsonString);
      }

      // Handle HTTP/HTTPS URIs
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

      // 1. Get all token accounts owned by user
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(ownerPublicKey, {
        programId: TOKEN_PROGRAM_ID,
      });

      // 2. Filter tokens with amount 1 (NFTs)
      const potentialNFTs = tokenAccounts.value.filter(
        (t) => t.account.data.parsed.info.tokenAmount.uiAmount === 1
      );

      const ticketList: TicketNFT[] = [];

      // 3. Verify Authority & Fetch Metadata
      for (const token of potentialNFTs) {
        const mintAddress = new PublicKey(token.account.data.parsed.info.mint);

        // Get mint info to check authority
        const mintInfo = await connection.getAccountInfo(mintAddress);
        if (!mintInfo) continue;

        /**
         * In Solana Mint Account, bytes 4-36 are the Mint Authority.
         * In our Smart Contract, Mint Authority = Event PDA.
         */
        const mintAuthority = new PublicKey(mintInfo.data.slice(4, 36));
        const eventPdaStr = mintAuthority.toBase58();

        // 4. Check if this is a Pulse Protocol event
        const { data: meta } = await supabase
          .from('events_metadata')
          .select('*')
          .eq('event_pda', eventPdaStr)
          .single();

        if (meta) {
          // Try to fetch NFT on-chain metadata
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

          ticketList.push({
            mint: mintAddress.toBase58(),
            eventPda: eventPdaStr,
            metadata: meta,
            onChainStatus: 'VERIFIED_NFT',
            nftMetadata: nftMetadata || undefined,
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

  useEffect(() => {
    fetchOnChainTickets();
  }, [fetchOnChainTickets]);

  if (loading) {
    return (
      <div className="text-center py-20 font-mono">
        <p className="font-black text-xl italic uppercase">Scanning On-Chain Assets...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 p-4">
      {/* Brutalist Header */}
      <div className="relative border-b-8 border-black pb-6">
        <h2 className="font-black text-7xl tracking-tighter uppercase italic leading-none">
          My Tickets
        </h2>
        <div className="absolute top-0 right-0 bg-[#00FF41] border-4 border-black px-4 py-2 font-mono font-bold shadow-[4px_4px_0_0_#000000]">
          {tickets.length} TICKETS
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="bg-neutral-100 border-8 border-black p-20 text-center shadow-[12px_12px_0_0_#000000]">
          <h3 className="font-black text-4xl mb-4 uppercase">No Tickets Found</h3>
          <p className="font-mono text-neutral-500">Purchase tickets through the Marketplace or deploy AI Agents to snipe them!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                {/* Image Section */}
                <div className="relative aspect-[5/3] border-b-4 border-black bg-black">
                  <img
                    src={ticket.nftMetadata?.image || ticket.metadata.image_url || 'https://via.placeholder.com/500'}
                    alt={ticket.nftMetadata?.name || ticket.metadata.name || 'Ticket NFT'}
                    className="w-full h-full object-cover"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-mono font-bold text-sm">VIEW DETAILS</span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-4 space-y-3">
                  {/* Event Name */}
                  <div>
                    <h3 className="font-black text-lg uppercase leading-tight">
                      {ticket.nftMetadata?.name || ticket.metadata.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-[#00FF41] rounded-full animate-pulse" />
                      <span className="font-mono text-[10px] font-bold text-[#FF00F5] uppercase tracking-widest">Pulse Protocol Verified</span>
                    </div>
                  </div>

                  {/* Ticket Details */}
                  <div className="bg-neutral-50 border-2 border-black p-3 font-mono text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">VENUE:</span>
                      <span className="font-bold">{ticket.metadata.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">DATE:</span>
                      <span className="font-bold">
                        {ticket.metadata.event_start ? new Date(ticket.metadata.event_start).toLocaleDateString() : 'TBD'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">TIER:</span>
                      <span className="font-bold bg-[#FF00F5] text-white px-2 py-0.5 text-[10px]">
                        {ticket.nftMetadata?.attributes?.find((attr) => attr.trait_type === 'Tier')?.value || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Attributes Display */}
                  {ticket.nftMetadata?.attributes && (
                    <div className="flex flex-wrap gap-2">
                      {ticket.nftMetadata.attributes.map((attr, i: number) => (
                        attr.trait_type !== 'Protocol' && (
                          <div key={i} className="bg-neutral-100 border border-black px-2 py-1 text-[10px] font-mono">
                            <span className="text-neutral-500">{attr.trait_type}:</span>
                            <span className="font-bold ml-1">{attr.value}</span>
                          </div>
                        )
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <div className="flex-1 border-4 border-black bg-[#FFEB3B] text-black font-black text-center py-2 text-xs italic shadow-[2px_2px_0_0_#000000]">
                      VERIFIED
                    </div>
                    <button className="bg-black text-white px-4 py-2 border-4 border-black hover:bg-[#FF00F5] transition-colors">
                      <span className="font-black text-xs">DETAILS</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Ticket Detail Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedTicket(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedTicket(null)}
                className="absolute -top-12 right-0 bg-white text-black px-6 py-3 border-4 border-black font-black font-mono text-sm hover:bg-[#FF00F5] hover:text-white transition-colors"
              >
                CLOSE
              </button>

              {/* Ticket Card - Full Size */}
              <div className="bg-white border-8 border-black shadow-[16px_16px_0_0_#000000] overflow-hidden">
                {/* Ticket Image */}
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

                {/* Ticket Details */}
                <div className="p-8 space-y-6">
                  {/* Verification Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-[#00FF41] rounded-full animate-pulse" />
                      <span className="font-mono text-sm font-bold text-[#FF00F5] uppercase tracking-widest">Pulse Protocol Verified Asset</span>
                    </div>
                    <div className="border-4 border-black bg-[#FFEB3B] text-black px-4 py-2 font-black italic shadow-[2px_2px_0_0_#000000]">
                      VERIFIED NFT
                    </div>
                  </div>

                  {/* Event Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-display font-bold text-xl uppercase border-b-4 border-black pb-2">Event Information</h3>

                      <div className="space-y-3 font-mono text-sm">
                        <div className="flex justify-between border-b-2 border-gray-200 pb-2">
                          <span className="text-neutral-500">Event</span>
                          <span className="font-bold">{selectedTicket.metadata.name}</span>
                        </div>
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
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Time</span>
                          <span className="font-bold">
                            {selectedTicket.metadata.event_start ? new Date(selectedTicket.metadata.event_start).toLocaleTimeString() : 'TBD'}
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
                        <div className="flex justify-between border-b-2 border-gray-200 pb-2">
                          <span className="text-neutral-500">Token Standard</span>
                          <span className="font-bold">Solana Token Program</span>
                        </div>
                        <div className="flex justify-between border-b-2 border-gray-200 pb-2">
                          <span className="text-neutral-500">Mint Address</span>
                          <span className="font-bold text-xs">{selectedTicket.mint.slice(0, 8)}...{selectedTicket.mint.slice(-8)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Event PDA</span>
                          <span className="font-bold text-xs">{selectedTicket.eventPda.slice(0, 12)}...</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NFT Attributes */}
                  {selectedTicket.nftMetadata?.attributes && (
                    <div>
                      <h3 className="font-display font-bold text-xl uppercase border-b-4 border-black pb-2 mb-4">On-Chain Attributes</h3>
                      <div className="flex flex-wrap gap-3">
                        {selectedTicket.nftMetadata.attributes.map((attr, i: number) => (
                          <div key={i} className="border-4 border-black px-4 py-3 bg-neutral-50 shadow-[2px_2px_0_0_#000000]">
                            <div className="text-[10px] text-neutral-500 uppercase font-mono">{attr.trait_type}</div>
                            <div className="font-bold text-lg">{attr.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {selectedTicket.nftMetadata?.description && (
                    <div className="bg-neutral-50 border-4 border-black p-4">
                      <h3 className="font-display font-bold text-sm uppercase text-neutral-500 mb-2">Description</h3>
                      <p className="font-mono text-sm">{selectedTicket.nftMetadata.description}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4 border-t-4 border-black">
                    <button className="flex-1 border-4 border-black bg-[#00FF41] py-3 font-black font-bold hover:bg-[#FF00F5] hover:text-white transition-colors">
                      VIEW ON SOLSCAN
                    </button>
                    <button className="flex-1 border-4 border-black bg-black text-white py-3 font-black font-bold hover:bg-[#FF00F5] hover:text-white transition-colors">
                      COPY MINT ADDRESS
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
