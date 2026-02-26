import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';

export const WalletButton = () => {
  // //NEW: Destructure updateOriginCity dari context
  const { user, profile, loginGoogle, logout, linkWallet, updateOriginCity, isLoading } = useAuth();
  const { publicKey, disconnect, connecting } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  
  const [isLinking, setIsLinking] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // //NEW: Local state buat nampung ketikan user sebelum di-save
  const [originCity, setOriginCity] = useState(profile?.default_origin_city || '');
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sinkronisasi local state kalau profile Supabase udah ke-fetch
  useEffect(() => {
    if (profile?.default_origin_city) {
      setOriginCity(profile.default_origin_city);
    }
  }, [profile?.default_origin_city]);

  useEffect(() => {
    if (user && publicKey && profile && profile.wallet_address !== publicKey.toBase58()) {
      setIsLinking(true);
      linkWallet(publicKey.toBase58()).finally(() => setIsLinking(false));
    }
  }, [publicKey, user, profile, linkWallet]);

  useEffect(() => {
    if (publicKey) {
      connection.getBalance(publicKey).then((bal) => setBalance(bal / LAMPORTS_PER_SOL));
      const id = connection.onAccountChange(publicKey, (acc) => setBalance(acc.lamports / LAMPORTS_PER_SOL));
      return () => { connection.removeAccountChangeListener(id); };
    }
  }, [publicKey, connection]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // //NEW: Handler buat nyimpen kota pas user klik Enter atau unfocus
  const handleOriginBlur = async () => {
    if (originCity !== profile?.default_origin_city) {
      await updateOriginCity(originCity);
    }
  };

  if (isLoading) {
    return (
      <button className="bg-neutral-200 border-4 border-black px-6 py-2 font-display font-black text-sm md:text-lg animate-pulse">
        BOOTING...
      </button>
    );
  }

  if (!user) {
    return (
      <button 
        onClick={loginGoogle}
        className="bg-white border-4 border-black px-6 py-2 font-display font-black text-sm md:text-lg hover:bg-black hover:text-white hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#FF00F5] transition-all"
      >
        LOGIN GOOGLE
      </button>
    );
  }

  if (user && !profile?.wallet_address) {
    return (
      <button 
        onClick={() => setVisible(true)}
        disabled={isLinking || connecting}
        className="bg-[#FF00F5] text-white border-4 border-black px-6 py-2 font-display font-black text-sm md:text-lg hover:-translate-y-1 shadow-[4px_4px_0_0_#000000] hover:shadow-[6px_6px_0_0_#000000] transition-all animate-pulse"
      >
        {isLinking ? 'LINKING DB...' : connecting ? 'CONNECTING...' : 'LINK WALLET'}
      </button>
    );
  }

  if (user && profile?.wallet_address && !publicKey) {
    return (
      <button 
        onClick={() => setVisible(true)}
        disabled={connecting}
        className="bg-[#00FF41] text-black border-4 border-black px-6 py-2 font-display font-black text-sm md:text-lg hover:-translate-y-1 shadow-[4px_4px_0_0_#000000] transition-all"
      >
        {connecting ? 'WAKING WALLET...' : 'RECONNECT WALLET'}
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-3 bg-white border-4 border-black px-3 py-1 hover:bg-neutral-100 hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000000] transition-all"
      >
        <div className="flex flex-col text-right font-mono text-xs">
          <span className="font-bold text-black uppercase truncate max-w-[120px]">
            {user.email?.split('@')[0]}
          </span>
          <span className="text-[#FF00F5] font-black">
            {balance.toFixed(2)} SOL
          </span>
        </div>
        <div className="w-10 h-10 bg-black text-[#00FF41] border-2 border-black flex items-center justify-center font-black text-xl shadow-[2px_2px_0_0_#00FF41]">
          {user.email?.charAt(0).toUpperCase()}
        </div>
      </button>

      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-3 w-80 bg-white border-4 border-black shadow-[12px_12px_0_0_#000000] z-50 flex flex-col"
          >
            <div className="p-4 border-b-4 border-black bg-neutral-100">
              <p className="font-mono text-xs text-neutral-500 uppercase font-bold mb-1">User Profile</p>
              <p className="font-black text-lg truncate" title={user.email}>{user.email}</p>
            </div>

            <div className="p-4 space-y-4 border-b-4 border-black">
              <div className="bg-white border-2 border-black p-3 shadow-[4px_4px_0_0_#FF00F5]">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-[10px] font-bold text-neutral-500 uppercase">Wallet Balance</span>
                  <span className="font-mono text-[10px] bg-black text-white px-1">DEVNET</span>
                </div>
                <div className="font-black text-2xl text-black">
                  {balance.toFixed(4)} <span className="text-sm text-[#FF00F5]">SOL</span>
                </div>
                <div className="font-mono text-xs text-neutral-500 truncate mt-2 cursor-pointer hover:text-black transition-colors"
                     onClick={() => {
                       navigator.clipboard.writeText(publicKey?.toBase58() || '');
                       alert("Address copied!");
                     }}
                     title="Click to copy">
                  {publicKey?.toBase58()}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between bg-black text-white p-2 border-2 border-black">
                  <span className="font-mono text-xs uppercase font-bold flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#00FF41] rounded-full animate-pulse" />
                    Google Calendar
                  </span>
                  <span className="font-black text-xs text-[#00FF41]">SYNCED</span>
                </div>
                
                {/* //FIXED: Input sekarang beneran nyimpen data ke Supabase */}
                <div className="flex items-center justify-between bg-neutral-100 p-2 border-2 border-black">
                  <span className="font-mono text-xs uppercase font-bold text-neutral-500">
                    Home Base 📍
                  </span>
                  <input 
                    type="text" 
                    placeholder="e.g. Jakarta" 
                    value={originCity}
                    onChange={(e) => setOriginCity(e.target.value)}
                    onBlur={handleOriginBlur} // Save pas user klik di luar input
                    onKeyDown={(e) => e.key === 'Enter' && handleOriginBlur()} // Save pas tekan Enter
                    className="w-24 bg-white border-2 border-black px-2 py-0.5 font-mono text-xs font-black text-right focus:outline-none focus:border-[#00FF41] focus:bg-[#00FF41]/10 placeholder:font-normal"
                    title="Your default location for AI Flight Routing"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  disconnect();
                  setIsDropdownOpen(false);
                }}
                className="py-2 border-4 border-black font-black text-[10px] uppercase hover:bg-neutral-200 transition-colors"
              >
                Unplug Wallet
              </button>
              <button 
                onClick={() => {
                  logout();
                  setIsDropdownOpen(false);
                }}
                className="py-2 bg-red-500 text-white border-4 border-black font-black text-[10px] shadow-[2px_2px_0_0_#000000] hover:translate-y-0.5 hover:shadow-none transition-all uppercase"
              >
                Log Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};