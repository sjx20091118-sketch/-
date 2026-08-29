export interface TimelineItem {
  id: string;
  title: string;
  date: string;
  location: string;
  content: string;
  tag: string;
  image?: string;
}

export interface Impression {
  id: string;
  year: string;
  text: string;
}

export interface Person {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  relationship: string;
  group?: string;
  birthday: string;
  zodiac: string;
  hobbies: string;
  color: string;
  knownDate?: string; // 相识起始日期，如 "2021-09-01"
  wechat?: string;    // 微信号
  qq?: string;        // QQ号
  phone?: string;     // 手机号/电话
  customFields?: Record<string, string>;
  photos?: string[];   // 人物相册照片数组（本地压缩存储）
  impressions: Impression[];
}

export interface Story {
  id: string;
  chapter: string;
  title: string;
  content: string;
  date: string;
}

export interface Artifact {
  id: string;
  name: string;
  date: string;
  story: string;
  image: string;
}

export interface Letter {
  id: string;
  title: string;
  unlockDate: string;
  content: string;
  isUnlocked: boolean;
}

export interface AppData {
  timeline: TimelineItem[];
  people: Person[];
  stories: Story[];
  artifacts: Artifact[];
  letters: Letter[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface HealingTheme {
  id: string;
  name: string;
  enName: string;
  quote: string;
  primary: string;       // Primary brand color
  primaryDark: string;   // Hover or deep state
  accent: string;        // Accent / highlight color
  accentLight: string;   // Soft badge background
  paper: string;         // Light container background
  canvas: string;        // Body & Card canvas
  primaryRgb: string;    // R, G, B for opacity
  primaryDarkRgb: string;
  accentRgb: string;
}
