import { motion } from 'framer-motion';

interface NeoCardProps {
  children: React.ReactNode;
  hover?: boolean;
  className?: string;
  onClick?: () => void;
}

export const NeoCard = ({ children, hover = false, className = '', onClick }: NeoCardProps) => {
  const baseClasses = 'card-neo';
  const hoverClass = hover ? 'card-neo-hover cursor-pointer' : '';

  return (
    <motion.div
      whileHover={hover ? { scale: 1.01 } : {}}
      className={`${baseClasses} ${hoverClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};
