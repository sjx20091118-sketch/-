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
  isDarkMode?: boolean;
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
  onPlayTts,
  isDarkMode = false
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
      className={`relative rounded-[26px] border overflow-hidden flex flex-col transition-all duration-300 ${
        isDarkMode
          ? 'bg-[#151D19]/90 border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.35)] text-[#FAF8F5]'
          : 'bg-[#FAF8F5]/90 border-[#5B7B6D]/15 shadow-[0_8px_30px_rgba(0,0,0,0.03)] text-[#2B332E] paper-texture'
      }`}
      style={{
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)'
      }}
    >
      {/* 1. Ambient Header */}
      <div
        className={`px-5 py-3.5 border-b flex items-center justify-between relative z-20 backdrop-blur-md transition-colors ${
          isDarkMode
            ? 'bg-[#1A231F]/80 border-white/10'
            : 'bg-white/60 border-[#5B7B6D]/10'
        }`}
      >
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
              <h3
                className={`text-sm font-bold font-serif tracking-wide ${
                  isDarkMode ? 'text-[#FAF8F5]' : 'text-[#2B332E]'
                }`}
              >
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
            <p
              className={`text-[10.5px] font-serif leading-tight truncate ${
                isDarkMode ? 'text-[#A0B0A7]' : 'text-[#6E7C75]'
              }`}
            >
              轻声漫谈，重温记忆深处的微光与私语
            </p>
          </div>
        </div>

        {/* Right: Minimalist Translucent "···" Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer ${
              isDarkMode
                ? 'bg-[#222B26] hover:bg-[#2A3630] border-white/15 text-[#C2CDC7] hover:text-[#FAF8F5]'
                : 'bg-white/80 hover:bg-white border-[#5B7B6D]/15 text-[#5B7B6D] hover:text-[#2B332E]'
            }`}
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
                className={`absolute right-0 top-10 w-48 border rounded-2xl shadow-xl p-1.5 z-30 font-sans text-xs space-y-1 backdrop-blur-xl ${
                  isDarkMode
                    ? 'bg-[#18201C]/95 border-white/15 text-[#FAF8F5]'
                    : 'bg-white/95 border-[#5B7B6D]/20 text-[#2B332E] paper-texture'
                }`}
              >
                <div
                  className={`px-2.5 py-1.5 text-[10px] font-mono border-b flex items-center justify-between ${
                    isDarkMode ? 'text-[#A0B0A7] border-white/10' : 'text-[#6E7C75] border-[#5B7B6D]/10'
                  }`}
                >
                  <span>对谈引擎</span>
                  <span className="font-bold" style={{ color: isDarkMode ? theme.accent : theme.primary }}>
                    {aiEngine === 'deepseek' ? 'DeepSeek-V3' : '标准模型'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onToggleEngine();
                    setIsMenuOpen(false);
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between transition-colors ${
                    isDarkMode ? 'text-[#FAF8F5] hover:bg-white/10' : 'text-[#2B332E] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-3.5 h-3.5" style={{ color: isDarkMode ? theme.accent : theme.primary }} />
                    <span>切换模型引擎</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyChat}
                  className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center gap-2 transition-colors ${
                    isDarkMode ? 'text-[#FAF8F5] hover:bg-white/10' : 'text-[#2B332E] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" style={{ color: isDarkMode ? theme.accent : theme.primary }} />
                  <span>复制对谈内容</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClearMessages();
                    setIsMenuOpen(false);
                    showToast('已清空对谈，重置慢言');
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl text-left text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition-colors`}
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
                    className={`p-4 rounded-2xl border text-xs font-serif tracking-wide leading-[1.8] relative shadow-2xs ${
                      isDarkMode
                        ? 'bg-[#1C2621]/90 text-[#FAF8F5] border-white/10'
                        : 'bg-white/85 text-[#2B332E]'
                    }`}
                    style={{
                      borderColor: `${theme.primary}30`,
                      borderLeftWidth: '3px',
                      borderLeftColor: theme.primary
                    }}
                  >
                    <div className="whitespace-pre-line break-words select-text">
                      {msg.text}
                    </div>

                    {/* Action Bar (Audio Read) */}
                    {onPlayTts && (
                      <div
                        className={`mt-2 pt-2 border-t flex items-center justify-between text-[10.5px] ${
                          isDarkMode ? 'border-white/10 text-[#A0B0A7]' : 'border-[#5B7B6D]/10 text-[#6E7C75]'
                        }`}
                      >
                        <span className="flex items-center gap-1 font-mono" style={{ color: isDarkMode ? theme.accent : theme.primary }}>
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
              className={`px-4 py-3 rounded-2xl border text-xs flex items-center gap-2 font-serif shadow-2xs ${
                isDarkMode ? 'bg-[#1C2621]/90 text-[#A0B0A7] border-white/10' : 'bg-white/90 text-[#6E7C75]'
              }`}
              style={{ borderColor: `${theme.primary}20` }}
            >
              <Hourglass className="w-3.5 h-3.5 text-[#E88765] animate-spin" style={{ animationDuration: '3s' }} />
              <span className="tracking-wide">慢言守护者正在翻阅时光卷宗...</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Poetic Inspiration Chips (Floating Pill Tags) */}
      <div
        className={`px-3.5 py-2 border-t flex items-center gap-2 overflow-x-auto custom-scrollbar select-none transition-colors ${
          isDarkMode ? 'border-white/10 bg-[#121815]/60' : 'border-[#5B7B6D]/10 bg-white/40'
        }`}
      >
        {INSPIRATION_CHIPS.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSendMessage(chip.prompt)}
            disabled={isLoading}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-serif transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap border ${
              isDarkMode
                ? 'bg-[#1E2823]/90 hover:bg-[#25322C] border-white/12 text-[#FAF8F5]'
                : 'bg-white/85 hover:bg-white border-white/95 text-[#2B332E]'
            }`}
          >
            <span className="text-xs">{chip.icon}</span>
            <span className="hover:text-[#E88765] transition-colors">{chip.label}</span>
          </button>
        ))}
      </div>

      {/* 4. Minimalist Note Input Bar */}
      <div
        className={`p-3 border-t transition-colors ${
          isDarkMode ? 'bg-[#18201C]/90 border-white/10' : 'bg-white/80 border-[#5B7B6D]/15'
        }`}
      >
        <div
          className={`rounded-2xl border flex items-center p-1.5 pl-3.5 gap-2 transition-all shadow-inner ${
            isDarkMode ? 'bg-[#121815]/80 border-white/15' : 'bg-[#FAF8F5]/95'
          }`}
          style={{
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : `${theme.primary}25`
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="向时光提问，或写下你想念的瞬间…"
            className={`flex-1 min-w-0 bg-transparent text-xs focus:outline-none font-serif tracking-wide ${
              isDarkMode
                ? 'text-[#FAF8F5] placeholder-[#A0B0A7]/60'
                : 'text-[#2B332E] placeholder-[#6E7C75]/70'
            }`}
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
