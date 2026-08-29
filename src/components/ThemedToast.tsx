import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Feather, CheckCircle2, Info, Sparkles, Heart } from 'lucide-react';
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
}

export const ThemedToast: React.FC<ThemedToastProps> = ({ toast, theme }) => {
  if (!toast) return null;

  const text = typeof toast === 'string' ? toast : toast.message;
  const type = typeof toast === 'string' ? 'literary' : toast.type || 'literary';

  // Determine icon based on message keywords or custom type
  const renderIcon = () => {
    if (text.includes('复制') || text.includes('保存') || text.includes('成功') || text.includes('录入') || text.includes('更新')) {
      return <CheckCircle2 className="w-3.5 h-3.5 text-[#5B7B6D]" style={{ color: theme?.primary }} />;
    }
    if (text.includes('色调') || text.includes('主题') || text.includes('画') || text.includes('光')) {
      return <Sparkles className="w-3.5 h-3.5 text-[#E88765]" style={{ color: theme?.accent }} />;
    }
    if (text.includes('朋友') || text.includes('印记') || text.includes('信笺') || text.includes('陪伴')) {
      return <Heart className="w-3.5 h-3.5 text-[#E88765]" style={{ color: theme?.accent }} />;
    }
    return <Feather className="w-3.5 h-3.5 text-[#5B7B6D]" style={{ color: theme?.primary }} />;
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
          {/* Glass Paper Capsule Container */}
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-[0_12px_32px_-4px_rgba(43,51,46,0.12),0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl border border-white/80 transition-all duration-300"
            style={{
              backgroundColor: 'rgba(255, 253, 250, 0.94)',
              borderColor: 'rgba(91, 123, 109, 0.16)'
            }}
          >
            {/* Ambient subtle light shimmer */}
            <div 
              className="absolute inset-0 rounded-full pointer-events-none opacity-40 bg-gradient-to-r from-transparent via-white/70 to-transparent" 
              style={{
                maskImage: 'linear-gradient(to right, transparent, white, transparent)'
              }}
            />

            {/* Left Accent Icon Badge */}
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-2xs border border-white/90"
              style={{
                backgroundColor: theme?.accentLight || '#FDF0EB',
              }}
            >
              {renderIcon()}
            </div>

            {/* Literary Toast Typography */}
            <div className="min-w-0 pr-1">
              <span className="text-xs text-[#2B332E] font-serif font-medium tracking-wide leading-tight whitespace-nowrap block drop-shadow-2xs">
                {text}
              </span>
            </div>

            {/* Delicate end ornament dot */}
            <div 
              className="w-1.5 h-1.5 rounded-full opacity-60 shrink-0 animate-pulse"
              style={{ backgroundColor: theme?.accent || '#E88765' }}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
