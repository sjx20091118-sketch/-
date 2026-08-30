import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MoreHorizontal,
  Feather,
  RotateCcw,
  Trash2,
  Copy,
  Check,
  Hourglass,
  ArrowUp,
  Flame,
  Volume2
} from 'lucide-react';
import { ChatMessage, HealingTheme } from '../types';

interface TimeAiCompanionProps {
  aiEngine: 'gemini' | 'deepseek';
  onToggleEngine: () => void;
  messages: ChatMessage[];
  onClearMessages: () => void;
  input: string;
  setInput: (val: string) => void;
  onSendMessage: (customPrompt?: string) => void;
  isLoading: boolean;
  theme: HealingTheme;
  showToast: (msg: string) => void;
  onPlayTts?: (text: string) => void;
}

const INSPIRATION_CHIPS = [
  {
    icon: '🌿',
    label: '翻翻那年夏天的旧事',
    prompt: '翻翻我记忆中那年夏天的往事，帮我整理一段专属时光随笔。'
  },
  {
    icon: '💌',
    label: '关于某位老朋友的回忆',
    prompt: '回顾一下我和重要好友们（如江川、许知夏、沈砚）之间的温暖点滴与成长痕迹。'
  },
  {
    icon: '☕',
    label: '重温一段写在雨天的文字',
    prompt: '帮我找一找档案里那些在雨天、晚自习或安静时刻写下的故事与章节。'
  },
  {
    icon: '🕯️',
    label: '聊聊记忆深处的那件旧物',
    prompt: '从我的拾物阁藏品中挑一件，与我聊聊它背后凝固的光阴与故事。'
  },
  {
    icon: '🎐',
    label: '拾取一段温柔的成长印记',
    prompt: '根据我的所有时光记忆，总结我这些年最珍贵的成长与心境蜕变。'
  }
];

export const TimeAiCompanion: React.FC<TimeAiCompanionProps> = ({
  aiEngine,
  onToggleEngine,
  messages,
  onClearMessages,
  input,
  setInput,
  onSendMessage,
  isLoading,
  theme,
  showToast,
  onPlayTts
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Scroll ONLY the internal chat container on user interaction, never the outer window
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleCopyChat = () => {
    const fullText = messages
      .map((m) => `${m.role === 'user' ? '我' : '时光慢言'}：\n${m.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(fullText);
    showToast('已复制时光对谈全记录');
    setIsMenuOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        onSendMessage();
      }
    }
  };

  return (
    <div
      className="relative rounded-[26px] border border-[#5B7B6D]/15 overflow-hidden flex flex-col transition-all duration-300 paper-texture"
      style={{
        backgroundColor: 'rgba(250, 248, 245, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)'
      }}
    >
      {/* 1. Ambient Header */}
      <div className="px-5 py-3.5 border-b border-[#5B7B6D]/10 bg-white/60 backdrop-blur-md flex items-center justify-between relative z-20">
        {/* Left: Time Guardian Icon + Title + Breathing Glow Dot */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-2xs transition-transform duration-300 hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})`
            }}
          >
            <Hourglass className="w-4 h-4 text-white/95" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#2B332E] font-serif tracking-wide">
                拾年 · 慢言
              </h3>
              {/* Breathing Glow Dot */}
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: theme.accent, animationDuration: '2.5s' }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ backgroundColor: theme.accent }}
                />
              </span>
            </div>
            <p className="text-[10.5px] text-[#6E7C75] font-serif leading-tight truncate">
              轻声漫谈，重温记忆深处的微光与私语
            </p>
          </div>
        </div>

        {/* Right: Minimalist Translucent "···" Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="w-8 h-8 rounded-xl bg-white/80 hover:bg-white border border-[#5B7B6D]/15 text-[#5B7B6D] hover:text-[#2B332E] flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="更多操作"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Dropdown Menu Sheet */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 w-48 bg-white/95 backdrop-blur-xl border border-[#5B7B6D]/20 rounded-2xl shadow-xl p-1.5 z-30 font-sans text-xs space-y-1 paper-texture"
              >
                <div className="px-2.5 py-1.5 text-[10px] text-[#6E7C75] font-mono border-b border-[#5B7B6D]/10 flex items-center justify-between">
                  <span>对谈引擎</span>
                  <span className="font-bold text-[#5B7B6D]">
                    {aiEngine === 'deepseek' ? 'DeepSeek-V3' : '标准模型'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onToggleEngine();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-[#2B332E] hover:bg-[#FAF8F5] flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-3.5 h-3.5 text-[#5B7B6D]" />
                    <span>切换模型引擎</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyChat}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-[#2B332E] hover:bg-[#FAF8F5] flex items-center gap-2 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-[#5B7B6D]" />
                  <span>复制对谈内容</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClearMessages();
                    setIsMenuOpen(false);
                    showToast('已清空对谈，重置慢言');
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>清空对话记录</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Chat Conversation Stream (Literary Essay Typography) */}
      <div ref={chatContainerRef} className="h-64 sm:h-72 overflow-y-auto custom-scrollbar p-4 space-y-4 relative">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={idx}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              {isUser ? (
                /* User Message: Clean Floating Note / Tag */
                <div
                  className="max-w-[85%] px-4 py-2.5 rounded-2xl text-xs font-sans text-white shadow-xs leading-relaxed"
                  style={{
                    backgroundColor: theme.primary,
                    borderBottomRightRadius: '4px'
                  }}
                >
                  {msg.text}
                </div>
              ) : (
                /* AI Message: Literary Essay Styled Section */
                <div className="max-w-[95%] sm:max-w-[90%] space-y-2">
                  <div
                    className="p-4 rounded-2xl border text-xs font-serif text-[#2B332E] tracking-wide leading-[1.8] relative shadow-2xs"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.85)',
                      borderColor: `${theme.primary}20`,
                      borderLeftWidth: '3px',
                      borderLeftColor: theme.primary
                    }}
                  >
                    <div className="whitespace-pre-line break-words select-text">
                      {msg.text}
                    </div>

                    {/* Action Bar (Audio Read) */}
                    {onPlayTts && (
                      <div className="mt-2 pt-2 border-t border-[#5B7B6D]/10 flex items-center justify-between text-[10.5px] text-[#6E7C75]">
                        <span className="flex items-center gap-1 font-mono text-[#5B7B6D]">
                          <Feather className="w-3 h-3 text-[#E88765]" />
                          <span>拾年慢言 · 笺语</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => onPlayTts(msg.text)}
                          className="hover:text-[#E88765] flex items-center gap-1 font-medium transition-colors cursor-pointer"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>朗诵</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* AI Thinking / Loading State */}
        {isLoading && (
          <div className="flex justify-start animate-fadeIn">
            <div
              className="px-4 py-3 rounded-2xl border bg-white/90 text-xs text-[#6E7C75] flex items-center gap-2 font-serif shadow-2xs"
              style={{ borderColor: `${theme.primary}20` }}
            >
              <Hourglass className="w-3.5 h-3.5 text-[#E88765] animate-spin" style={{ animationDuration: '3s' }} />
              <span className="tracking-wide">慢言守护者正在翻阅时光卷宗...</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Poetic Inspiration Chips (Floating Pill Tags with 1px Highlight Border) */}
      <div className="px-3.5 py-2 border-t border-[#5B7B6D]/10 bg-white/40 flex items-center gap-2 overflow-x-auto custom-scrollbar select-none">
        {INSPIRATION_CHIPS.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSendMessage(chip.prompt)}
            disabled={isLoading}
            className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-serif transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              color: '#2B332E',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
            }}
          >
            <span className="text-xs">{chip.icon}</span>
            <span className="hover:text-[#E88765] transition-colors">{chip.label}</span>
          </button>
        ))}
      </div>

      {/* 4. Minimalist Note Input Bar */}
      <div className="p-3 bg-white/80 border-t border-[#5B7B6D]/15">
        <div
          className="rounded-2xl border flex items-center p-1.5 pl-3.5 gap-2 transition-all shadow-inner"
          style={{
            backgroundColor: 'rgba(250, 248, 245, 0.95)',
            borderColor: `${theme.primary}25`
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="向时光提问，或写下你想念的瞬间…"
            className="flex-1 min-w-0 bg-transparent text-xs text-[#2B332E] placeholder-[#6E7C75]/70 focus:outline-none font-serif tracking-wide"
          />

          <button
            type="button"
            onClick={() => onSendMessage()}
            disabled={isLoading || !input.trim()}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all shadow-2xs shrink-0 active:scale-95 cursor-pointer ${
              !input.trim() || isLoading
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:opacity-95 hover:shadow-md'
            }`}
            style={{
              backgroundColor: theme.primary
            }}
            title="发送寄语"
          >
            <Feather className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
