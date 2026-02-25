import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

export const OnboardingModal = () => {
  const { user, profile, loginGoogle, linkWallet, isLoading } = useAuth();
  const { publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [isLinking, setIsLinking] = useState(false);

  // LOGIC SLIDER BERDASARKAN STATE
  let step = 0;
  if (isLoading) step = 0; // Loading state
  else if (!user) step = 1; // Slide 1: Google Login
  else if (user && !profile?.wallet_address) step = 2; // Slide 2: Link Wallet
  else step = 3; // Slide 3: Done (Hilang)

  // Otomatis nge-link kalau di Step 2 user tiba-tiba konek dompet
  useEffect(() => {
    if (step === 2 && publicKey) {
      setIsLinking(true);
      linkWallet(publicKey.toBase58()).finally(() => setIsLinking(false));
    }
  }, [step, publicKey, linkWallet]);

  // Kalau loading atau udah kelar (step 3), jangan render modal onboarding
  if (step === 0 || step === 3) return null;

  // Animasi Slide (Kanan ke Kiri)
  const slideVariants = {
    initial: { x: 100, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    exit: { x: -100, opacity: 0, transition: { duration: 0.2 } }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#FFEB3B]/90 backdrop-blur-sm p-4">
      {/* Background Grid Pattern (Vibe Coder Aesthetic) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000001a_1px,transparent_1px),linear-gradient(to_bottom,#0000001a_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="relative w-full max-w-2xl bg-white border-8 border-black shadow-[24px_24px_0_0_#000000] overflow-hidden">
        
        {/* Header Terminal Style */}
        <div className="bg-black text-[#00FF41] px-6 py-4 font-mono font-bold text-sm flex justify-between items-center">
          <span>PULSE_OS_ONBOARDING.exe</span>
          <span className="animate-pulse">_</span>
        </div>

        <div className="p-10 min-h-[400px] flex flex-col justify-center relative overflow-hidden">
          <AnimatePresence mode="wait">
            
            {/* ================= SLIDE 1: GOOGLE LOGIN ================= */}
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
                  <h2 className="font-black text-6xl uppercase italic tracking-tighter mb-4">
                    Identify<br/>Yourself
                  </h2>
                  <p className="font-mono text-neutral-600 max-w-md mx-auto">
                    To unleash AI Agents, we need access to your schedule. 
                    Login with Google to sync your calendar securely.
                  </p>
                </div>

                <button 
                  onClick={loginGoogle}
                  className="group relative inline-flex items-center justify-center bg-white border-4 border-black px-8 py-4 font-black text-2xl uppercase hover:-translate-y-2 hover:shadow-[8px_8px_0_0_#000000] transition-all duration-200"
                >
                  <img 
                    src="https://www.svgrepo.com/show/475656/google-color.svg" 
                    alt="Google" 
                    className="w-8 h-8 mr-4 group-hover:scale-110 transition-transform"
                  />
                  CONTINUE WITH GOOGLE
                </button>
              </motion.div>
            )}

            {/* ================= SLIDE 2: LINK WALLET ================= */}
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
                  <h2 className="font-black text-6xl uppercase italic tracking-tighter mb-4">
                    Arm Your<br/>Weapon
                  </h2>
                  <p className="font-mono text-neutral-600 max-w-md mx-auto">
                    Welcome, <span className="font-bold text-[#FF00F5]">{user?.email}</span>. <br/>
                    Now, link your Solana wallet to fund your AI missions.
                  </p>
                </div>

                <div className="space-y-4 w-full max-w-md">
                  <button 
                    onClick={() => {
                      if (publicKey) disconnect(); // Buat reset kalau dia mau ganti wallet
                      setVisible(true);
                    }}
                    disabled={isLinking}
                    className="w-full bg-[#FF00F5] text-white border-4 border-black px-8 py-4 font-black text-2xl uppercase hover:-translate-y-2 shadow-[8px_8px_0_0_#000000] hover:shadow-[12px_12px_0_0_#000000] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLinking ? "WIRING NEURAL NET..." : publicKey ? "WALLET CONNECTED. LINKING..." : "CONNECT SOLANA WALLET"}
                  </button>
                  
                  <div className="font-mono text-[10px] text-neutral-400 uppercase italic">
                    *We use this wallet purely as a funding source. Your keys remain yours.
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
        
        {/* Progress Bar Brutalist */}
        <div className="h-4 w-full bg-neutral-200 border-t-8 border-black flex">
          <div className={`h-full bg-[#00FF41] border-r-4 border-black transition-all duration-500 ${step === 1 ? 'w-1/2' : 'w-full'}`} />
        </div>
      </div>
    </div>
  );
};