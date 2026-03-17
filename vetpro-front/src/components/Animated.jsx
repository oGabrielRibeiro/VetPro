import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Variantes de animação pré-definidas
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const fadeInDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export const slideInLeft = {
  initial: { opacity: 0, x: -100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -100 },
};

export const slideInRight = {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 100 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// Componente wrapper para animações simples
export const AnimatedDiv = ({ 
  children, 
  variant = fadeInUp, 
  duration = 0.3,
  delay = 0,
  className = '',
  ...props 
}) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variant}
      transition={{ duration, delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Componente para animas listas com stagger
export const AnimatedList = ({ 
  children, 
  variant = staggerItem,
  containerVariant = staggerContainer,
  duration = 0.3,
  staggerDelay = 0.05,
  className = '',
}) => {
  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={containerVariant ? containerVariants : undefined}
      initial="initial"
      animate="animate"
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={variant}
          transition={{ duration }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

// Componente para transições de página
export const PageTransition = ({ children, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Componente para modal com animação
export const AnimatedModal = ({ isOpen, onClose, children, className = '' }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed z-50 ${className}`}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Componente para accordion
export const AnimatedAccordion = ({ isOpen, children, className = '' }) => {
  return (
    <motion.div
      initial={false}
      animate={{ 
        height: isOpen ? 'auto' : 0,
        opacity: isOpen ? 1 : 0
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
};

// Botão com animação de click
export const AnimatedButton = ({ 
  children, 
  onClick, 
  variant = 'primary',
  className = '',
  disabled = false,
  ...props 
}) => {
  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`
        px-4 py-2 rounded-lg font-semibold transition-colors
        ${variants[variant] || variants.primary}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.button>
  );
};

// Card com animação de hover
export const AnimatedCard = ({ 
  children, 
  onClick,
  className = '',
}) => {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: onClick ? 1.02 : 1, y: onClick ? -4 : 0 }}
      whileTap={{ scale: onClick ? 0.98 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`
        vp-card
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
};

// Skeleton com animação
export const AnimatedSkeleton = ({ className = '', variant = 'rect' }) => {
  const variantClasses = {
    rect: 'rounded-lg',
    circle: 'rounded-full',
    text: 'rounded h-4',
  };

  return (
    <motion.div
      className={`bg-gray-200 dark:bg-dark-700 ${variantClasses[variant]} ${className}`}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};

// Componente para entrada com animação de label
export const AnimatedInput = ({ 
  label, 
  value, 
  onChange, 
  error,
  className = '',
  ...props 
}) => {
  const hasValue = value && value.length > 0;

  return (
    <div className={`relative ${className}`}>
      <motion.label
        initial={false}
        animate={{
          y: hasValue ? -24 : 0,
          scale: hasValue ? 0.85 : 1,
          originX: 0,
          originY: 0,
        }}
        transition={{ duration: 0.2 }}
        className={`
          absolute left-3 pointer-events-none text-sm
          ${error ? 'text-red-500' : 'text-gray-500'}
          ${hasValue ? 'text-emerald-600' : ''}
        `}
      >
        {label}
      </motion.label>
      <input
        value={value}
        onChange={onChange}
        className={`
          vp-input-field pt-5 pb-2
          ${error ? 'border-red-300' : 'border-gray-300'}
        `}
        {...props}
      />
    </div>
  );
};

// Badge animado
export const AnimatedBadge = ({ 
  children, 
  variant = 'default',
  className = '',
}) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${variants[variant] || variants.default}
        ${className}
      `}
    >
      {children}
    </motion.span>
  );
};

export default {
  fadeIn,
  fadeInUp,
  fadeInDown,
  slideInLeft,
  slideInRight,
  scaleIn,
  staggerContainer,
  staggerItem,
  AnimatedDiv,
  AnimatedList,
  PageTransition,
  AnimatedModal,
  AnimatedAccordion,
  AnimatedButton,
  AnimatedCard,
  AnimatedSkeleton,
  AnimatedInput,
  AnimatedBadge,
};
