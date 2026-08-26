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
  birthday: string;
  zodiac: string;
  hobbies: string;
  color: string;
  customFields?: Record<string, string>;
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
