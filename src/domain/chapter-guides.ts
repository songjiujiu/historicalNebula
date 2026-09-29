import { earlyGuides } from './reading-guides/001-040';
import { middleGuides } from './reading-guides/041-085';
import { lateBiographies } from './reading-guides/086-130';

export interface ChapterGuide {
  volume: number;
  question: string;
  background: string;
  people: { name: string; role: string }[];
  sections: { title: string; text: string; block: string }[];
  takeaway: string;
  terms: { word: string; definition: string }[];
  caution?: string;
}
export const chapterGuides: ChapterGuide[] = [...earlyGuides, ...middleGuides, ...lateBiographies].sort((a, b) => a.volume - b.volume);
export const chapterGuide = (volume: number) => chapterGuides.find(guide => guide.volume === volume);

export interface ReadingRoute { id: string; title: string; description: string; volumes: number[] }
export const readingRoutes: ReadingRoute[] = [
  { id: 'first-stories', title: '第一次读，从人物开始', description: '先读几个有明确主角的故事，再逐步认识他们所处的时代。', volumes: [48, 7, 8, 55, 92, 81, 86, 47] },
  { id: 'dynasties', title: '顺着时代，看朝代更替', description: '从上古传说到西汉。先抓住谁接替谁、局面怎样变化。', volumes: Array.from({ length: 12 }, (_, i) => i + 1) },
  { id: 'states', title: '诸侯之间，怎样相处', description: '认识吴、齐、晋、楚等诸侯，沿各国的兴衰阅读春秋战国。', volumes: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46] },
  { id: 'han', title: '天下统一后，怎样治理', description: '开国功臣、外戚、诸侯王和官吏，从不同身份看汉朝的政治生活。', volumes: [49, 50, 51, 52, 53, 54, 56, 57, 58, 59, 60, 96, 97, 101, 102, 103, 107, 120, 121, 122] },
  { id: 'society', title: '制度与日常，如何运转', description: '礼乐、历法、河渠、财政与商业，按问题理解制度篇。', volumes: [23, 24, 25, 26, 27, 28, 29, 30, 119, 129] },
  { id: 'tables', title: '读过故事，再对照年表', description: '把人物放回同一时期，对照各国、诸侯和官职的变化。', volumes: Array.from({ length: 10 }, (_, i) => i + 13) },
  { id: 'voices', title: '不同的人，怎样被记住', description: '思想家、游说者、游侠、医生和商人；留意作者如何评价他们。', volumes: [61, 62, 63, 65, 67, 69, 70, 74, 84, 105, 124, 126, 129, 130] },
  { id: 'complete', title: '按原书顺序，读完 130 卷', description: '保留原书编排，依次阅读本纪、表、书、世家和列传。', volumes: Array.from({ length: 130 }, (_, i) => i + 1) },
];
export const readingRoute = (id: string | null) => readingRoutes.find(route => route.id === id) ?? readingRoutes[0];

export const categoryExplanations: Record<string, string> = {
  本纪: '以重要统治者串起时代，先看前后局面怎样改变。',
  表: '把同一时期的事情排在一起，适合对照着读。',
  书: '按主题讲制度与社会生活，先抓住它讨论的问题。',
  世家: '看诸侯家族与重要人物的经历，也关注世代更替。',
  列传: '从不同人物的经历看历史，有的篇章会合写多人。',
};
