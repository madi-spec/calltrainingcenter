import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-foreground text-background hover:opacity-90 transition-opacity',
  secondary: 'bg-secondary text-secondary-foreground border border-border hover:bg-accent transition-colors',
  danger: 'bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity',
  success: 'bg-foreground text-background hover:opacity-90 transition-opacity',
  ghost: 'bg-transparent hover:bg-accent text-secondary-foreground hover:text-foreground transition-colors',
  outline: 'bg-transparent border border-border hover:bg-accent text-secondary-foreground hover:text-foreground transition-colors'
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg'
};

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  ...props
}, ref) => {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      ref={ref}
      whileHover={!isDisabled ? { scale: 1.02 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      className={`
        inline-flex items-center justify-center gap-2
        font-medium rounded-md
        transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />
      )}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
    </motion.button>
  );
});

Button.displayName = 'Button';

export default Button;
