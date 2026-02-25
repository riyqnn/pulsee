import { useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion'; 
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

export const OnboardingModal = () => {
  const { user, profile, loginGoogle, linkWallet, updateOriginCity, isLoading } = useAuth();
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  
  const [isLinking, setIsLinking] = useState(false);
  const [localCity, setLocalCity] = useState('');
  const [isSavingCity, setIsSavingCity] = useState(false);

  let step = 0;
  if (isLoading) {
    step = 0;
  } else if (!user) {
    step = 1; 
  } else if (user && !profile?.wallet_address) {
    step = 2; 
  } else if (user && profile?.wallet_address && !profile?.default_origin_city) {
    step = 3;
  } else {
    step = 4;
  }

  useEffect(() => {
    if (step === 2 && connected && publicKey && profile && !profile.wallet_address) {
      setIsLinking(true);
      linkWallet(publicKey.toBase58())
        .catch(console.error)
        .finally(() => setIsLinking(false));
    }
  }, [step, connected, publicKey, profile, linkWallet]);

  if (step === 0 || step === 4) return null;

  const handleSaveCity = async () => {
    if (!localCity.trim()) return;
    setIsSavingCity(true);
    try {
      const formattedCity = localCity.trim().toUpperCase();
      await updateOriginCity(formattedCity);
    } catch (e) {
      console.error("Failed to save city:", e);
    } finally {
      setIsSavingCity(false);
    }
  };

  // //FIXED: Type Variants dan pisah properti transition agar TS senang
  const slideVariants: Variants = {
    initial: { x: 100, opacity: 0 },
    animate: { 
      x: 0, 
      opacity: 1,
      transition: { 
        type: 'spring', 
        stiffness: 300, 
        damping: 30 
      } 
    },
    exit: { 
      x: -100, 
      opacity: 0,
      transition: { 
        duration: 0.2 
      } 
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#FFEB3B]/90 backdrop-blur-sm p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000001a_1px,transparent_1px),linear-gradient(to_bottom,#0000001a_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="relative w-full max-w-2xl bg-white border-8 border-black shadow-[24px_24px_0_0_#000000] overflow-hidden">
        <div className="bg-black text-[#00FF41] px-6 py-4 font-mono font-bold text-sm flex justify-between items-center border-b-8 border-black">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 border-2 border-black" />
            <div className="w-3 h-3 bg-yellow-500 border-2 border-black" />
            <div className="w-3 h-3 bg-green-500 border-2 border-black" />
            <span className="ml-2 uppercase tracking-tighter">Initialize_User_Session.exe</span>
          </div>
          <span className="animate-pulse">_</span>
        </div>

        <div className="p-10 min-h-[450px] flex flex-col justify-center relative overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col items-center text-center space-y-8"
              >
                <div>
                  <h2 className="font-black text-6xl uppercase italic tracking-tighter mb-4 text-[#FF00F5]">
                    Identify<br/>Yourself
                  </h2>
                  <p className="font-mono text-neutral-600 max-w-md mx-auto uppercase text-xs font-bold leading-relaxed">
                    Accessing Neural Net requires authentication. <br/>
                    Link your Google Identity to begin.
                  </p>
                </div>
                <button 
                  onClick={loginGoogle}
                  className="group relative inline-flex items-center justify-center bg-white border-4 border-black px-8 py-4 font-black text-2xl uppercase hover:-translate-y-2 hover:shadow-[8px_8px_0_0_#000000] transition-all duration-200"
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-8 h-8 mr-4 group-hover:rotate-12 transition-transform" />
                  CONNECT GOOGLE
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col items-center text-center space-y-8"
              >
                <div>
                  <h2 className="font-black text-6xl uppercase italic tracking-tighter mb-4 text-[#00FF41] bg-black inline-block px-4">
                    Link<br/>Wallet
                  </h2>
                  <p className="font-mono text-neutral-600 max-w-md mx-auto uppercase text-xs font-bold mt-4">
                    Identity confirmed: <span className="text-black underline">{user?.email}</span>. <br/>
                    Now, bind your Solana wallet to settle on-chain missions.
                  </p>
                </div>
                <div className="space-y-4 w-full max-w-md">
                  <button 
                    onClick={() => {
                      if (connected) disconnect(); 
                      setVisible(true);
                    }}
                    disabled={isLinking}
                    className="w-full bg-[#00FF41] text-black border-4 border-black px-8 py-5 font-black text-2xl uppercase hover:-translate-y-2 shadow-[8px_8px_0_0_#000000] transition-all duration-200 disabled:opacity-50"
                  >
                    {isLinking ? "Binding To DB..." : "CONNECT SOLANA"}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col items-center text-center space-y-8"
              >
                <div>
                  <h2 className="font-black text-6xl uppercase italic tracking-tighter mb-4 text-black">
                    Neural<br/>Origin
                  </h2>
                  <p className="font-mono text-neutral-600 max-w-md mx-auto uppercase text-xs font-bold leading-relaxed">
                    Wallet linked. <br/>
                    Enter your departure city for flight logistics calibration.
                  </p>
                </div>
                <div className="space-y-4 w-full max-w-md">
                  <input 
                    type="text" 
                    placeholder="ENTER CITY (E.G. JAKARTA)"
                    value={localCity}
                    onChange={(e) => setLocalCity(e.target.value)}
                    className="w-full bg-neutral-100 border-4 border-black px-6 py-5 font-mono font-black text-2xl text-center uppercase focus:outline-none focus:border-[#FF00F5] transition-all"
                  />
                  <button 
                    onClick={handleSaveCity}
                    disabled={isSavingCity || !localCity.trim()}
                    className="w-full bg-black text-[#00FF41] border-4 border-black px-8 py-5 font-black text-2xl uppercase hover:-translate-y-2 shadow-[8px_8px_0_0_#000000] transition-all duration-200 disabled:opacity-50"
                  >
                    {isSavingCity ? "Calibrating..." : "Finalize Onboarding"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="h-6 w-full bg-neutral-200 border-t-8 border-black flex overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ 
              width: step === 1 ? '33.33%' : step === 2 ? '66.66%' : '100%' 
            }}
            className="h-full bg-[#00FF41] border-r-8 border-black" 
          />
        </div>
      </div>
    </div>
  );
};