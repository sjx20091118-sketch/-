import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Plus, Trash2, X, Check } from 'lucide-react';
import { Artifact } from '../types';
import { sound } from '../utils/soundEngine';
import { TiltCard } from './TiltCard';

interface PersonArtifactsShelfProps {
  personName: string;
  boundArtifactIds?: string[];
  allArtifacts: Artifact[];
  onUpdateBoundArtifacts: (artifactIds: string[]) => void;
  onSelectArtifact?: (artifact: Artifact) => void;
  showToast: (msg: string) => void;
}

export const PersonArtifactsShelf: React.FC<PersonArtifactsShelfProps> = ({
  personName,
  boundArtifactIds = [],
  allArtifacts,
  onUpdateBoundArtifacts,
  onSelectArtifact,
  showToast
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(boundArtifactIds);

  const boundArtifacts = allArtifacts.filter(a => boundArtifactIds.includes(a.id));

  const handleOpenPicker = () => {
    sound.playWaterDrop(880);
    setSelectedIds([...boundArtifactIds]);
    setIsPickerOpen(true);
  };

  const handleToggleArtifact = (id: string) => {
    sound.playWaterDrop(780);
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSaveSelection = () => {
    sound.playWaterDrop(960);
    onUpdateBoundArtifacts(selectedIds);
    setIsPickerOpen(false);
    showToast(`已更新与【${personName}】相系的信物`);
  };

  const handleRemoveSingle = (id: string, name: string) => {
    sound.playPaperRustle();
    const updated = boundArtifactIds.filter(item => item !== id);
    onUpdateBoundArtifacts(updated);
    showToast(`已将【${name}】从信物柜移出`);
  };

  return (
    <div className="bg-white dark:bg-[#1E2822] rounded-3xl p-5 border border-[#5B7B6D]/20 dark:border-white/10 shadow-2xs space-y-4 relative z-10 isolate">
      {/* 顶栏 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-[#5B7B6D]/10 text-[#5B7B6D]">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-[#2B332E] dark:text-[#FAF8F5]">专属信物陈列柜</h3>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenPicker}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-white/10 border border-[#5B7B6D]/30 hover:border-[#5B7B6D] hover:bg-[#5B7B6D]/10 text-[#5B7B6D] dark:text-[#A7B4AD] transition-all text-xs font-serif font-medium shadow-2xs cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>从拾物阁拣选</span>
        </button>
      </div>

      {/* 已选信物展览架 */}
      {boundArtifacts.length === 0 ? (
        <div
          onClick={handleOpenPicker}
          className="cursor-pointer border-2 border-dashed border-[#5B7B6D]/20 hover:border-[#E88765]/40 bg-[#FAF8F5] hover:bg-[#FAF6F0] rounded-2xl p-6 text-center transition-all group"
        >
          <Package className="w-8 h-8 text-[#5B7B6D]/40 group-hover:text-[#E88765] mx-auto mb-2 transition-colors" />
          <p className="text-xs text-[#6E7C75] font-serif">信物柜尚且空置，点击从「拾物阁」选取属于你们的信物</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {boundArtifacts.map(art => (
            <div
              key={art.id}
              onClick={() => onSelectArtifact?.(art)}
              className="cursor-pointer"
            >
              <TiltCard
                maxTilt={4}
                glareOpacity={0.15}
                className="rounded-2xl border border-[#5B7B6D]/15 dark:border-white/10 bg-white dark:bg-[#141C18] p-2.5 space-y-2 group shadow-2xs hover:shadow-sm hover:border-[#5B7B6D]/40 transition-all"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-[#FAF8F5] dark:bg-black/30 border border-[#5B7B6D]/10">
                  <img
                    src={art.image}
                    alt={art.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {art.images && art.images.length > 1 && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[9px] font-sans flex items-center gap-0.5">
                      📸 {art.images.length}
                    </span>
                  )}
                </div>
                <div className="px-0.5">
                  <h4 className="font-serif font-bold text-xs text-[#2B332E] dark:text-[#FAF8F5] truncate group-hover:text-[#5B7B6D] transition-colors">{art.name}</h4>
                  <p className="text-[10px] text-[#6E7C75] dark:text-[#A7B4AD] font-mono mt-0.5">{art.date || '岁月信物'}</p>
                </div>
              </TiltCard>
            </div>
          ))}
        </div>
      )}

      {/* 从拾物阁拣选信物全局卡片弹窗 (Portal 挂载至 document.body，与专属相册弹窗风格一致) */}
      {typeof document !== 'undefined' && createPortal(
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
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2B332E] text-sm font-serif flex items-center gap-1.5">
                        <span>从拾物阁拣选信物</span>
                        <span className="text-[11px] font-sans font-normal text-[#6E7C75]">
                          (已选 {selectedIds.length}/{allArtifacts.length})
                        </span>
                      </h3>
                      <p className="text-[10px] text-[#6E7C75] font-serif mt-0.5">
                        勾选与【{personName}】相关的旧物陈列在专属格中
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(false)}
                    className="p-1.5 rounded-full hover:bg-stone-100 text-[#6E7C75] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {allArtifacts.length === 0 ? (
                  <div className="py-16 text-center text-[#6E7C75] text-xs font-serif">
                    拾物阁中暂未珍藏旧物，请先前往「拾物阁」添加旧物信笺
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {allArtifacts.map(artifact => {
                      const isChecked = selectedIds.includes(artifact.id);
                      return (
                        <div
                          key={artifact.id}
                          onClick={() => handleToggleArtifact(artifact.id)}
                          className={`cursor-pointer relative rounded-2xl p-2.5 border transition-all select-none ${
                            isChecked
                              ? 'bg-white border-[#5B7B6D] shadow-sm ring-1 ring-[#5B7B6D]/30'
                              : 'bg-white/70 border-[#5B7B6D]/15 hover:border-[#5B7B6D]/35 hover:bg-white'
                          }`}
                        >
                          <div className="relative aspect-square rounded-xl overflow-hidden bg-stone-100 mb-2">
                            <img
                              src={artifact.image}
                              alt={artifact.name}
                              className="w-full h-full object-cover"
                            />
                            <div
                              className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                isChecked ? 'bg-[#5B7B6D] text-white shadow-xs' : 'bg-white/80 border border-[#5B7B6D]/30 text-transparent'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                            </div>
                          </div>
                          <h5 className="font-serif font-bold text-xs text-[#2B332E] truncate">{artifact.name}</h5>
                          <p className="text-[10px] text-[#6E7C75] font-mono mt-0.5 truncate">{artifact.date}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 弹窗底部操作 */}
                <div className="p-3.5 bg-white/95 border-t border-[#5B7B6D]/15 flex justify-between items-center shrink-0">
                  <span className="text-xs text-[#6E7C75] font-mono">已选中 {selectedIds.length} 件信物</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-serif text-[#6E7C75] hover:bg-stone-100 transition-colors cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSelection}
                      className="px-5 py-2 rounded-xl bg-[#5B7B6D] hover:bg-[#4A6458] text-white text-xs font-serif font-medium shadow-xs transition-colors cursor-pointer active:scale-95"
                    >
                      确认陈列
                    </button>
                  </div>
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
