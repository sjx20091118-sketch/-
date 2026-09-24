import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Feather, CheckCircle2, Info, Compass, Heart } from 'lucide-react';
import { HealingTheme } from '../types';

export interface ToastConfig {
  id?: string;
  message: string;
  type?: 'info' | 'success' | 'literary' | 'heart';
  icon?: string;
}

interface ThemedToastProps {
  toast: string | ToastConfig | null;
  theme?: HealingTheme;
  isDarkMode?: boolean;
}

export const ThemedToast: React.FC<ThemedToastProps> = ({ toast, theme, isDarkMode }) => {
  if (!toast) return null;

  const text = typeof toast === 'string' ? toast : toast.message;
  const type = typeof toast === 'string' ? 'literary' : toast.type || 'literary';

  const accentTone = isDarkMode ? '#52B788' : (theme?.accent || '#E88765');
  const primaryTone = isDarkMode ? '#52B788' : (theme?.primary || '#5B7B6D');

  // Determine icon based on message keywords or custom type
  const renderIcon = () => {
    if (text.includes('复制') || text.includes('保存') || text.includes('成功') || text.includes('录入') || text.includes('更新')) {
      return <CheckCircle2 className="w-3.5 h-3.5" style={{ color: primaryTone }} />;
    }
    if (text.includes('色调') || text.includes('主题') || text.includes('画') || text.includes('光')) {
      return <Compass className="w-3.5 h-3.5" style={{ color: accentTone }} />;
    }
    if (text.includes('朋友') || text.includes('印记') || text.includes('信笺') || text.includes('陪伴')) {
      return <Heart className="w-3.5 h-3.5" style={{ color: accentTone }} />;
    }
    return <Feather className="w-3.5 h-3.5" style={{ color: primaryTone }} />;
  };

  return (
    <AnimatePresence>
      <div className="fixed top-12 sm:top-14 left-1/2 -translate-x-1/2 z-[100] pointer-events-none px-4 max-w-[92vw] sm:max-w-md w-auto">
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.95, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, scale: 0.96, filter: 'blur(2px)' }}
          transition={{
            type: 'spring',
            stiffness: 420,
            damping: 28,
            mass: 0.8
          }}
          className="relative group overflow-hidden"
        >
          {/* Glass Paper Capsule Container (No heavy bottom shadow) */}
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-none backdrop-blur-xl transition-all duration-300 border"
            style={{
              backgroundColor: isDarkMode ? 'rgba(18, 24, 21, 0.94)' : 'rgba(255, 253, 250, 0.95)',
              borderColor: isDarkMode ? 'rgba(82, 183, 136, 0.25)' : 'rgba(91, 123, 109, 0.18)'
            }}
          >
            {/* Ambient subtle light shimmer */}
            <div 
              className="absolute inset-0 rounded-full pointer-events-none opacity-40" 
              style={{
                background: isDarkMode
                  ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent)'
              }}
            />

            {/* Left Accent Icon Badge */}
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-2xs border"
              style={{
                backgroundColor: isDarkMode ? `${theme?.primary || '#5B7B6D'}35` : (theme?.accentLight || '#FDF0EB'),
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.9)'
              }}
            >
              {renderIcon()}
            </div>

            {/* Literary Toast Typography */}
            <div className="min-w-0 pr-1">
              <span
                className="text-xs font-serif font-medium tracking-wide leading-tight whitespace-nowrap block drop-shadow-2xs"
                style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}
              >
                {text}
              </span>
            </div>

            {/* Delicate end ornament dot */}
            <div 
              className="w-1.5 h-1.5 rounded-full opacity-75 shrink-0 animate-pulse"
              style={{ backgroundColor: theme?.accent || '#E88765' }}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
