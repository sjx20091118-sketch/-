import React, { useState } from 'react';
import { X, Folder, ChevronDown, Calendar, UserPlus } from 'lucide-react';
import { HealingTheme } from '../types';
import { LocalImageUploader } from './LocalImageUploader';

export interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (personData: any) => void;
  currentTheme: HealingTheme;
  isDarkMode?: boolean;
  showToast: (msg: string) => void;
  uploadPersonAvatarToCloud?: (base64: string) => Promise<any>;
  getZodiacFromBirthday: (b: string) => string;
  setDatePickerConfig: (cfg: any) => void;
  setFormGroupPickerTarget: (target: 'add' | 'edit') => void;
  formPersonGroup: string;
  addPersonBirthday: string;
  addPersonKnownDate: string;
}

export const AddPersonModalForm: React.FC<AddPersonModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentTheme,
  showToast,
  uploadPersonAvatarToCloud,
  getZodiacFromBirthday,
  setDatePickerConfig,
  setFormGroupPickerTarget,
  formPersonGroup,
  addPersonBirthday,
  addPersonKnownDate
}) => {
  const [avatar, setAvatar] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [relationship, setRelationship] = useState<string>('挚友');
  const [knowWhere, setKnowWhere] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [wechat, setWechat] = useState<string>('');
  const [qq, setQq] = useState<string>('');
  const [hobbies, setHobbies] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [impression, setImpression] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanRel = relationship.trim();

    if (!avatar) {
      showToast('请上传人物头像相片（必填项）');
      return;
    }
    if (!cleanName) {
      showToast('请填写人物姓名或称谓（必填项）');
      return;
    }
    if (!cleanRel) {
      showToast('请填写或选择与该人物的关系（必填项）');
      return;
    }

    if (uploadPersonAvatarToCloud && avatar) {
      uploadPersonAvatarToCloud(avatar).catch(() => {});
    }

    const bDay = addPersonBirthday?.trim() || '';
    const zodiacVal = bDay ? getZodiacFromBirthday(bDay) : '未知';

    onSubmit({
      id: 'p-' + Date.now(),
      name: cleanName,
      avatar,
      relationship: cleanRel,
      group: formPersonGroup || '未分组',
      birthday: bDay || '未填写',
      zodiac: zodiacVal,
      knownDate: addPersonKnownDate || '2021-09-01',
      wechat: wechat.trim(),
      qq: qq.trim(),
      phone: phone.trim(),
      hobbies: hobbies.trim() || '未填写',
      color: '暖杏粉',
      bio: bio.trim() || `${cleanRel} · 珍贵回忆的同路人`,
      customFields: { '认识地点': knowWhere.trim() || '时光长廊' },
      impressions: impression.trim()
        ? [{ id: 'imp-0', year: new Date().getFullYear().toString(), text: impression.trim() }]
        : []
    });
  };

  return (
    <div className="absolute inset-0 bg-[#2B332E]/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="bg-[#FAF8F5] dark:bg-[#141B18] text-[#2B332E] dark:text-[#FAF8F5] w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6 rounded-t-[32px] sm:rounded-3xl border border-[#5B7B6D]/15 dark:border-white/15 shadow-2xl space-y-4 paper-texture pb-8">
        {/* Apple Sheet Pull Indicator */}
        <div className="w-10 h-1 bg-black/15 dark:bg-white/20 rounded-full mx-auto -mt-1 mb-2 sm:hidden" />
        <div className="flex justify-between items-center border-b border-black/5 dark:border-white/10 pb-3">
          <h3 className="font-bold text-base flex items-center gap-2 font-serif" style={{ color: currentTheme.primary }}>
            <span>添加人物档案</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[#6E7C75] hover:text-[#2B332E] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {/* Header: Pure Minimalist Avatar Frame & Centered Name Input */}
          <div className="flex flex-col items-center gap-2 pt-1">
            <LocalImageUploader
              value={avatar}
              onChange={(val) => {
                setAvatar(val);
                if (val && uploadPersonAvatarToCloud) {
                  uploadPersonAvatarToCloud(val).catch(() => {});
                }
              }}
              mode="avatar"
              required={true}
            />
            <div className="w-full text-center">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={(e) => setName(e.currentTarget.value.trim())}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                required
                placeholder="好友姓名或称谓..."
                className="w-full text-center text-xl font-serif font-bold bg-transparent border-b-2 border-stone-200/90 dark:border-white/10 pb-1 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50"
              />
            </div>
          </div>

          {/* Card 1: 身名与岁月坐标 (Identity, Group & Milestones) */}
          <div className="bg-white/90 dark:bg-white/[0.04] rounded-2xl border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10 shadow-2xs">
            {/* Relationship Row */}
            <div className="flex items-center justify-between p-3 gap-2">
              <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">身份关系</span>
              <input
                required
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                onBlur={(e) => setRelationship(e.currentTarget.value.trim())}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="输入身份关系 (如: 挚友)"
                className="w-36 sm:w-44 text-right text-xs bg-stone-50/90 dark:bg-black/20 p-2 rounded-xl border border-stone-200/80 dark:border-white/10 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none focus:border-[#5B7B6D] placeholder-[#6E7C75]/50 font-serif"
              />
            </div>

            {/* Group Row */}
            <div className="flex items-center justify-between p-3">
              <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">所属分组</span>
              <button
                type="button"
                onClick={() => setFormGroupPickerTarget('add')}
                className="font-mono text-xs text-[#2B332E] dark:text-[#FAF8F5] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100/80 dark:bg-white/10 border border-stone-200 dark:border-white/10 hover:border-primary transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Folder className="w-3.5 h-3.5 text-[#5B7B6D]" />
                <span>{formPersonGroup || '未分组'}</span>
                <ChevronDown className="w-3 h-3 text-[#6E7C75]" />
              </button>
            </div>

            {/* Known Date Row */}
            <div className="flex items-center justify-between p-3">
              <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">相识时日</span>
              <button
                type="button"
                onClick={() => {
                  setDatePickerConfig({
                    isOpen: true,
                    title: '选择相识起始日期',
                    value: addPersonKnownDate || '2021-09-01',
                    mode: 'full',
                    onConfirm: () => {}
                  });
                }}
                className="font-mono text-xs text-[#2B332E] dark:text-[#FAF8F5] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100/80 dark:bg-white/10 border border-stone-200 dark:border-white/10 hover:border-primary transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5 text-[#5B7B6D]" />
                <span>{addPersonKnownDate || '2021-09-01'}</span>
              </button>
            </div>

            {/* Birthday Row */}
            <div className="flex items-center justify-between p-3">
              <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">好友生辰</span>
              <button
                type="button"
                onClick={() => {
                  setDatePickerConfig({
                    isOpen: true,
                    title: '选择好友生日',
                    value: addPersonBirthday || '',
                    mode: 'month-day',
                    onConfirm: () => {}
                  });
                }}
                className="font-mono text-xs text-[#2B332E] dark:text-[#FAF8F5] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100/80 dark:bg-white/10 border border-stone-200 dark:border-white/10 hover:border-primary transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5 text-[#E88765]" />
                <span>{addPersonBirthday || '选填生日'}</span>
              </button>
            </div>

            {/* Know Where Row */}
            <div className="flex items-center justify-between p-3 gap-2">
              <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">初遇地点</span>
              <input
                value={knowWhere}
                onChange={(e) => setKnowWhere(e.target.value)}
                placeholder="选填，如：新沂一中"
                className="w-40 sm:w-44 text-right text-xs bg-stone-50/90 dark:bg-black/20 p-2 rounded-xl border border-stone-200/80 dark:border-white/10 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50 font-serif"
              />
            </div>
          </div>

          {/* Card 2: 联络方式 (Contacts) */}
          <div className="bg-white/90 dark:bg-white/[0.04] p-3.5 rounded-2xl border border-black/5 dark:border-white/10 space-y-2 shadow-2xs">
            <span className="text-[11px] font-serif font-medium text-[#526058] dark:text-[#A7B4AD]">联络方式 (选填)</span>
            <div className="grid grid-cols-3 gap-2">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="电话 (选填)"
                className="w-full p-2.5 text-xs font-serif rounded-xl border border-stone-200/80 dark:border-white/10 bg-stone-50/90 dark:bg-black/20 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50"
              />
              <input
                value={wechat}
                onChange={(e) => setWechat(e.target.value)}
                placeholder="微信 (选填)"
                className="w-full p-2.5 text-xs font-serif rounded-xl border border-stone-200/80 dark:border-white/10 bg-stone-50/90 dark:bg-black/20 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50"
              />
              <input
                value={qq}
                onChange={(e) => setQq(e.target.value)}
                placeholder="QQ (选填)"
                className="w-full p-2.5 text-xs font-serif rounded-xl border border-stone-200/80 dark:border-white/10 bg-stone-50/90 dark:bg-black/20 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50"
              />
            </div>
          </div>

          {/* Card 3: 寄语与初识印象 (Bio & Impression) */}
          <div className="bg-white/90 dark:bg-white/[0.04] p-3.5 rounded-2xl border border-black/5 dark:border-white/10 space-y-2 shadow-2xs">
            <span className="text-[11px] font-serif font-medium text-[#526058] dark:text-[#A7B4AD]">一句话总结与初识印象</span>
            <input
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="选填，如：知心挚友，同路前行"
              className="w-full p-2.5 text-xs font-serif rounded-xl border border-stone-200/80 dark:border-white/10 bg-stone-50/90 dark:bg-black/20 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50"
            />
            <textarea
              value={impression}
              onChange={(e) => setImpression(e.target.value)}
              rows={2}
              placeholder="初识温存细节或深刻回忆（选填）..."
              className="w-full p-2.5 text-xs font-serif rounded-xl border border-stone-200/80 dark:border-white/10 bg-stone-50/90 dark:bg-black/20 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none resize-none placeholder-[#6E7C75]/50"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 text-white font-serif font-bold text-xs rounded-2xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            style={{ backgroundColor: currentTheme.primary }}
          >
            建立人物档案
          </button>
        </form>
      </div>
    </div>
  );
};

export interface EditPersonModalProps {
  isOpen: boolean;
  selectedPerson: any;
  onClose: () => void;
  onUpdate: (updatedData: any) => void;
  currentTheme: HealingTheme;
  isDarkMode?: boolean;
  showToast: (msg: string) => void;
  uploadPersonAvatarToCloud?: (base64: string) => Promise<any>;
  getZodiacFromBirthday: (b: string) => string;
  setDatePickerConfig: (cfg: any) => void;
  setFormGroupPickerTarget: (target: 'add' | 'edit') => void;
  editPersonGroup: string;
}

export const EditPersonModalForm: React.FC<EditPersonModalProps> = ({
  isOpen,
  selectedPerson,
  onClose,
  onUpdate,
  currentTheme,
  showToast,
  uploadPersonAvatarToCloud,
  getZodiacFromBirthday,
  setDatePickerConfig,
  setFormGroupPickerTarget,
  editPersonGroup
}) => {
  if (!isOpen || !selectedPerson) return null;

  const [avatar, setAvatar] = useState<string>(selectedPerson.avatar || '');
  const [name, setName] = useState<string>(selectedPerson.name || '');
  const [relationship, setRelationship] = useState<string>(selectedPerson.relationship || '挚友');
  const [knowWhere, setKnowWhere] = useState<string>(selectedPerson.customFields?.['认识地点'] || '');
  const [phone, setPhone] = useState<string>(selectedPerson.phone || '');
  const [wechat, setWechat] = useState<string>(selectedPerson.wechat || '');
  const [qq, setQq] = useState<string>(selectedPerson.qq || '');
  const [hobbies, setHobbies] = useState<string>(selectedPerson.hobbies || '');
  const [bio, setBio] = useState<string>(selectedPerson.bio || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanRel = relationship.trim();

    if (!avatar && !selectedPerson.avatar) {
      showToast('请上传人物头像相片（必填项）');
      return;
    }
    if (!cleanName) {
      showToast('请填写人物姓名（必填项）');
      return;
    }
    if (!cleanRel) {
      showToast('请填写与该人物的关系（必填项）');
      return;
    }

    const finalAvatar = avatar || selectedPerson.avatar;
    if (uploadPersonAvatarToCloud && finalAvatar) {
      uploadPersonAvatarToCloud(finalAvatar).catch(() => {});
    }

    const bDay = selectedPerson.birthday || '';
    const zodiacVal = bDay && bDay !== '未填写' ? getZodiacFromBirthday(bDay) : (selectedPerson.zodiac || '未知');

    onUpdate({
      name: cleanName,
      relationship: cleanRel,
      group: editPersonGroup || selectedPerson.group || '未分组',
      birthday: bDay || '未填写',
      zodiac: zodiacVal,
      knownDate: selectedPerson.knownDate || '2021-09-01',
      wechat: wechat.trim(),
      qq: qq.trim(),
      phone: phone.trim(),
      hobbies: hobbies.trim() || '未填写',
      color: '暖杏粉',
      bio: bio.trim() || `${cleanRel} · 珍贵回忆的同路人`,
      avatar: finalAvatar,
      customFields: {
        ...(selectedPerson.customFields || {}),
        '认识地点': knowWhere.trim() || '时光长廊'
      }
    });
  };

  return (
    <div className="absolute inset-0 bg-[#2B332E]/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn font-sans">
      <div className="bg-[#FAF8F5] dark:bg-[#141B18] text-[#2B332E] dark:text-[#FAF8F5] w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6 rounded-t-[32px] sm:rounded-3xl border border-black/10 dark:border-white/15 shadow-2xl space-y-4 paper-texture pb-8">
        {/* Apple Sheet Pull Indicator */}
        <div className="w-10 h-1 bg-black/15 dark:bg-white/20 rounded-full mx-auto -mt-1 mb-2 sm:hidden" />
        <div className="flex justify-between items-center border-b border-black/5 dark:border-white/10 pb-3">
          <h3 className="font-bold text-base flex items-center gap-2 font-serif" style={{ color: currentTheme.primary }}>
            <UserPlus className="w-4 h-4" />
            <span>编辑【{selectedPerson.name}】档案</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[#6E7C75] hover:text-[#2B332E] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {/* Hero Avatar & Name Section */}
          <div className="flex flex-col items-center gap-2 pt-1">
            <LocalImageUploader
              value={avatar || selectedPerson.avatar}
              onChange={(val) => {
                setAvatar(val);
                if (val && uploadPersonAvatarToCloud) {
                  uploadPersonAvatarToCloud(val).catch(() => {});
                }
              }}
              mode="avatar"
              required={true}
            />
            <div className="w-full text-center">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={(e) => setName(e.currentTarget.value.trim())}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                required
                placeholder="好友姓名..."
                className="w-full text-center text-xl font-serif font-bold bg-transparent border-b-2 border-stone-200/90 dark:border-white/10 pb-1 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50"
              />
            </div>
          </div>

          {/* Card 1: 身名与岁月坐标 (Identity, Group & Milestones) */}
          <div className="bg-white/90 dark:bg-white/[0.04] rounded-2xl border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10 shadow-2xs">
            {/* Relationship Row */}
            <div className="flex items-center justify-between p-3 gap-2">
              <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">身份关系</span>
              <input
                required
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                onBlur={(e) => setRelationship(e.currentTarget.value.trim())}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="输入身份关系 (如: 挚友)"
                className="w-36 sm:w-44 text-right text-xs bg-stone-50/90 dark:bg-black/20 p-2 rounded-xl border border-stone-200/80 dark:border-white/10 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none focus:border-[#5B7B6D] placeholder-[#6E7C75]/50 font-serif"
              />
            </div>

            {/* Group Row */}
            <div className="flex items-center justify-between p-3">
              <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">所属分组</span>
              <button
                type="button"
                onClick={() => setFormGroupPickerTarget('edit')}
                className="font-mono text-xs text-[#2B332E] dark:text-[#FAF8F5] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100/80 dark:bg-white/10 border border-stone-200 dark:border-white/10 hover:border-primary transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Folder className="w-3.5 h-3.5 text-[#5B7B6D]" />
                <span>{editPersonGroup || selectedPerson.group || '未分组'}</span>
                <ChevronDown className="w-3 h-3 text-[#6E7C75]" />
              </button>
            </div>

            {/* Known Date Row */}
            <div className="flex items-center justify-between p-3">
              <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">相识时日</span>
              <button
                type="button"
                onClick={() => {
                  setDatePickerConfig({
                    isOpen: true,
                    title: '修改相识起始日期',
                    value: selectedPerson.knownDate || '2021-09-01',
                    mode: 'full',
                    onConfirm: () => {}
                  });
                }}
                className="font-mono text-xs text-[#2B332E] dark:text-[#FAF8F5] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100/80 dark:bg-white/10 border border-stone-200 dark:border-white/10 hover:border-primary transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5 text-[#5B7B6D]" />
                <span>{selectedPerson.knownDate || '2021-09-01'}</span>
              </button>
            </div>

            {/* Birthday Row */}
            <div className="flex items-center justify-between p-3">
              <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">好友生辰</span>
              <button
                type="button"
                onClick={() => {
                  setDatePickerConfig({
                    isOpen: true,
                    title: '修改好友生日',
                    value: selectedPerson.birthday === '未填写' ? '' : selectedPerson.birthday,
                    mode: 'month-day',
                    onConfirm: () => {}
                  });
                }}
                className="font-mono text-xs text-[#2B332E] dark:text-[#FAF8F5] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100/80 dark:bg-white/10 border border-stone-200 dark:border-white/10 hover:border-primary transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5 text-[#E88765]" />
                <span>{selectedPerson.birthday || '选填生日'}</span>
              </button>
            </div>

            {/* Know Where Row */}
            <div className="flex items-center justify-between p-3 gap-2">
              <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">初遇地点</span>
              <input
                value={knowWhere}
                onChange={(e) => setKnowWhere(e.target.value)}
                placeholder="选填地点"
                className="w-40 sm:w-44 text-right text-xs bg-stone-50/90 dark:bg-black/20 p-2 rounded-xl border border-stone-200/80 dark:border-white/10 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50 font-serif"
              />
            </div>
          </div>

          {/* Card 2: 联络方式 (Contacts) */}
          <div className="bg-white/90 dark:bg-white/[0.04] p-3.5 rounded-2xl border border-black/5 dark:border-white/10 space-y-2 shadow-2xs">
            <span className="text-[11px] font-serif font-medium text-[#526058] dark:text-[#A7B4AD]">联络方式 (选填)</span>
            <div className="grid grid-cols-3 gap-2">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="电话 (选填)"
                className="w-full p-2.5 text-xs font-serif rounded-xl border border-stone-200/80 dark:border-white/10 bg-stone-50/90 dark:bg-black/20 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50"
              />
              <input
                value={wechat}
                onChange={(e) => setWechat(e.target.value)}
                placeholder="微信 (选填)"
                className="w-full p-2.5 text-xs font-serif rounded-xl border border-stone-200/80 dark:border-white/10 bg-stone-50/90 dark:bg-black/20 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50"
              />
              <input
                value={qq}
                onChange={(e) => setQq(e.target.value)}
                placeholder="QQ (选填)"
                className="w-full p-2.5 text-xs font-serif rounded-xl border border-stone-200/80 dark:border-white/10 bg-stone-50/90 dark:bg-black/20 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50"
              />
            </div>
          </div>

          {/* Card 3: 寄语与简述 */}
          <div className="bg-white/90 dark:bg-white/[0.04] p-3.5 rounded-2xl border border-black/5 dark:border-white/10 space-y-2 shadow-2xs">
            <span className="text-[11px] font-serif font-medium text-[#526058] dark:text-[#A7B4AD]">一句话寄语与简述</span>
            <input
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="知心挚友，同路前行"
              className="w-full p-2.5 text-xs font-serif rounded-xl border border-stone-200/80 dark:border-white/10 bg-stone-50/90 dark:bg-black/20 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 text-white font-serif font-bold text-xs rounded-2xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            style={{ backgroundColor: currentTheme.primary }}
          >
            保存档案修订
          </button>
        </form>
      </div>
    </div>
  );
};
