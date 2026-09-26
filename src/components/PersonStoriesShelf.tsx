import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Plus, X, Check, FileText } from 'lucide-react';
import { Story } from '../types';
import { sound } from '../utils/soundEngine';

interface PersonStoriesShelfProps {
  personName: string;
  boundStoryIds?: string[];
  allStories: Story[];
  onUpdateBoundStories: (storyIds: string[]) => void;
  onReadStory: (story: Story) => void;
  showToast: (msg: string) => void;
}

export const PersonStoriesShelf: React.FC<PersonStoriesShelfProps> = ({
  personName,
  boundStoryIds = [],
  allStories,
  onUpdateBoundStories,
  onReadStory,
  showToast
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(boundStoryIds);

  const boundStories = allStories.filter((s) => boundStoryIds.includes(s.id));

  const handleOpenPicker = () => {
    sound.playWaterDrop(880);
    setSelectedIds([...boundStoryIds]);
    setIsPickerOpen(true);
  };

  const handleToggleStory = (id: string) => {
    sound.playWaterDrop(780);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveSelection = () => {
    sound.playWaterDrop(960);
    onUpdateBoundStories(selectedIds);
    setIsPickerOpen(false);
    showToast(`已更新【${personName}】的关联忆篇 (${selectedIds.length} 篇)`);
  };

  return (
    <div className="bg-white dark:bg-[#1E2822] p-5 sm:p-6 rounded-3xl border border-[#5B7B6D]/20 dark:border-white/10 shadow-2xs space-y-4 relative z-10 isolate">
      {/* 标题栏与操作 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#5B7B6D]/10 text-[#5B7B6D] flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-[#2B332E] dark:text-[#FAF8F5] flex items-center gap-1.5">
              <span>关联拾忆篇章</span>
              <span className="text-xs font-mono text-[#6E7C75] dark:text-[#A7B4AD] font-normal">({boundStories.length})</span>
            </h3>
          </div>
        </div>
        <button
          type="button"
          onClick={handleOpenPicker}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-white/10 border border-[#5B7B6D]/30 hover:border-[#5B7B6D] hover:bg-[#5B7B6D]/10 text-[#5B7B6D] dark:text-[#A7B4AD] transition-all text-xs font-serif font-medium shadow-2xs cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>从拾忆篇拣选</span>
        </button>
      </div>

      {/* 篇章列表展示 */}
      {boundStories.length === 0 ? (
        <div
          onClick={handleOpenPicker}
          className="cursor-pointer border-2 border-dashed border-[#5B7B6D]/20 hover:border-[#E88765]/40 bg-[#FAF8F5] hover:bg-[#FAF6F0] rounded-2xl p-6 text-center transition-all group"
        >
          <BookOpen className="w-8 h-8 text-[#5B7B6D]/40 group-hover:text-[#E88765] mx-auto mb-2 transition-colors" />
          <p className="text-xs text-[#6E7C75] dark:text-[#A7B4AD] font-serif">
            暂未关联文章，轻触即可从「拾忆篇」拣选记录你们故事的文字
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {boundStories.map((story) => (
            <div
              key={story.id}
              onClick={() => onReadStory(story)}
              className="group p-4 rounded-2xl bg-white dark:bg-[#141C18] hover:bg-white border border-[#5B7B6D]/15 dark:border-white/10 hover:border-[#5B7B6D]/40 shadow-2xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between space-y-2.5"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#E88765] px-2 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-black/30 border border-[#E88765]/20">
                    {story.chapter}
                  </span>
                  <span className="text-[10px] text-[#6E7C75] dark:text-[#A7B4AD] font-mono">
                    {story.date}
                  </span>
                </div>
                <h4 className="text-sm font-serif font-bold text-[#2B332E] dark:text-[#FAF8F5] group-hover:text-[#5B7B6D] transition-colors truncate">
                  {story.title}
                </h4>
                <p className="text-xs text-[#526058] dark:text-[#C2CDC7] font-serif line-clamp-2 leading-relaxed">
                  {story.content}
                </p>
              </div>

              <div className="pt-2 border-t border-[#5B7B6D]/10 flex items-center justify-between text-[11px] text-[#5B7B6D]">
                <span className="flex items-center gap-1 font-medium font-serif">
                  <FileText className="w-3 h-3" />
                  阅读全文
                </span>
                <span className="text-[10px] text-[#6E7C75]">
                  约 {story.content?.length || 0} 字
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 从拾忆篇拣选弹窗 (Portal 挂载) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isPickerOpen && (
              <div className="fixed inset-0 w-screen h-[100dvh] z-[9999] flex items-center justify-center p-3 sm:p-6 select-none">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsPickerOpen(false)}
                  className="fixed inset-0 bg-[#2B332E]/80 backdrop-blur-sm"
                />

                <motion.div
                  initial={{ scale: 0.92, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.92, opacity: 0, y: 15 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="relative w-full max-w-xl bg-[#FAF8F5] rounded-3xl border border-[#5B7B6D]/30 shadow-2xl overflow-hidden flex flex-col font-sans z-10 paper-texture max-h-[88dvh]"
                >
                  {/* 弹窗头部 */}
                  <div className="p-4 bg-white/95 border-b border-[#5B7B6D]/15 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#5B7B6D]/20 flex items-center justify-center text-[#5B7B6D]">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#2B332E] text-sm font-serif flex items-center gap-1.5">
                          <span>从拾忆篇拣选关联文章</span>
                          <span className="text-[11px] font-sans font-normal text-[#6E7C75]">
                            (已选 {selectedIds.length}/{allStories.length})
                          </span>
                        </h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(false)}
                      className="p-1 rounded-full text-[#6E7C75] hover:text-[#2B332E] hover:bg-black/5"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* 拾忆篇列表 */}
                  <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
                    {allStories.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[#6E7C75] font-serif">
                        拾忆篇中暂无文章，可先在「拾忆篇」中撰写故事
                      </div>
                    ) : (
                      allStories.map((story) => {
                        const isChecked = selectedIds.includes(story.id);
                        return (
                          <div
                            key={story.id}
                            onClick={() => handleToggleStory(story.id)}
                            className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-white border-[#5B7B6D] shadow-xs'
                                : 'bg-white/60 hover:bg-white border-[#5B7B6D]/15'
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF8F5] text-[#E88765] border border-[#E88765]/20">
                                  {story.chapter}
                                </span>
                                <span className="text-[10px] text-[#6E7C75] font-mono">
                                  {story.date}
                                </span>
                              </div>
                              <h4 className="text-xs font-serif font-bold text-[#2B332E] truncate">
                                {story.title}
                              </h4>
                              <p className="text-[11px] text-[#6E7C75] font-serif truncate mt-0.5">
                                {story.content}
                              </p>
                            </div>

                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
                                isChecked
                                  ? 'bg-[#5B7B6D] border-[#5B7B6D] text-white'
                                  : 'border-[#5B7B6D]/30 bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* 弹窗底部保存 */}
                  <div className="p-3 bg-white border-t border-[#5B7B6D]/15 flex justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-serif text-[#6E7C75] hover:bg-black/5"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSelection}
                      className="px-5 py-2 rounded-xl text-xs font-serif font-medium bg-[#5B7B6D] text-white hover:bg-[#3E564B] shadow-xs"
                    >
                      确认并陈列
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
