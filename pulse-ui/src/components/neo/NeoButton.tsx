import { motion } from 'framer-motion';

interface NeoButtonProps {
  variant?: 'default' | 'primary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export const NeoButton = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  disabled = false,
  onClick,
}: NeoButtonProps) => {
  const baseClasses = 'btn-neo';
  const variantClasses = {
    default: '',
    primary: 'btn-neo-primary',
    accent: 'btn-neo-accent',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-lg',
    lg: 'px-8 py-4 text-xl',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
};
