import { motion } from 'framer-motion';

interface NeoBadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'pink' | 'black';
}

export const NeoBadge = ({ children, variant = 'green' }: NeoBadgeProps) => {
  const variantClasses = {
    green: 'bg-[#00FF41] text-black',
    pink: 'bg-[#FF00F5] text-white',
    black: 'bg-black text-white',
  };

  return (
    <motion.span
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      className={`inline-block px-3 py-1 border-2 border-black font-mono text-sm font-bold ${variantClasses[variant]}`}
    >
      {children}
    </motion.span>
  );
};
