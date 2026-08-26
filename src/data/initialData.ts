import { AppData } from '../types';

export const INITIAL_SEED: AppData = {
  timeline: [
    {
      id: 't-102',
      title: '第一次团队项目获一等奖',
      date: '2022-11-15',
      location: '创新设计实验室',
      content: '熬了三个通宵改出来的建筑建模方案，当听到颁奖台上念出我们组名字时，大家相视一笑，那一刻所有的疲倦都化成了无比温暖的成就感。',
      tag: '高光',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 't-103',
      title: '夏日海边毕业旅行',
      date: '2024-06-20',
      location: '威海海滨栈道',
      content: '赤脚走在沙滩上，看日落把整片天空染成瑰丽的紫橙色。我们对着大海高喊未来见，海风把大家的笑声传得很远很远。',
      tag: '旅程',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 't-104',
      title: '搬入第一间属于自己的小公寓',
      date: '2025-03-15',
      location: '城南旧街小露台',
      content: '亲手摆好第一盆绿植和复古落地灯。当夜幕降临，窝在柔软的沙发里喝上一杯热可可，第一次切身体会到了独立生活的踏实与安宁。',
      tag: '成长',
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&auto=format&fit=crop&q=80'
    }
  ],
  people: [
    {
      id: 'p-201',
      name: '周梓童',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      bio: '大学最默契的室友兼设计搭档，共同度过了无数通宵做方案的夜。',
      relationship: '大学挚友 / 设计搭档',
      birthday: '10月24日',
      zodiac: '天蝎座',
      hobbies: '建筑摄影、黑胶唱片、深夜长跑',
      color: '鼠尾草绿 (#5B7B6D)',
      customFields: { '认识地点': '新生报到宿舍楼下', '共同记忆': '威海海边日落' },
      impressions: [
        { id: 'imp-1', year: '2021', text: '初见时有点清冷害羞，手里拿着一本建筑杂志，很有自己的想法。' },
        { id: 'imp-2', year: '2023', text: '变得极其靠谱且富有幽默感，是深夜通宵做方案时最值得信赖的战友。' },
        { id: 'imp-3', year: '2025', text: '入职了心仪的设计事务所，依然保持着对生活的赤诚与对美的敏感度。' }
      ]
    },
    {
      id: 'p-202',
      name: '陈导师',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      bio: '毕业设计指导老师，极具温情与严谨爱心的学术与人生引路人。',
      relationship: '大学导师 / 恩师',
      birthday: '04月15日',
      zodiac: '白羊座',
      hobbies: '古建筑研究、茶道、古典音乐',
      color: '沉木灰 (#3E564B)',
      customFields: { '认识地点': '建筑学基础研讨课', '办公室': '老系馆302' },
      impressions: [
        { id: 'imp-4', year: '2022', text: '学术极其严谨，对细节有近乎完美的追求，但对学生充满关怀。' },
        { id: 'imp-5', year: '2024', text: '临别之际赠言：“保持好奇心，做有温度的产品与设计”。' }
      ]
    },
    {
      id: 'p-203',
      name: '林夏',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
      bio: '高中同桌，见证了我整个青涩懵懂青春时期的欢笑与眼泪。',
      relationship: '高中同桌 / 闺蜜',
      birthday: '07月08日',
      zodiac: '巨蟹座',
      hobbies: '烘焙甜品、手帐创作、猫咪发呆',
      color: '暖杏粉 (#E88765)',
      customFields: { '认识地点': '高中高一(3)班后座', '约定': '每年跨年聚会' },
      impressions: [
        { id: 'imp-6', year: '2018', text: '总是会在课桌底下藏各种好吃的曲奇饼干，笑容格外治愈。' },
        { id: 'imp-7', year: '2024', text: '即便身在不同的城市，每次通电话依然能无话不谈，默契如初。' }
      ]
    }
  ],
  stories: [
    {
      id: 's-301',
      chapter: '第一章',
      title: '梧桐树下的初秋记忆',
      content: '那是一个格外晴朗的早晨。空气里弥漫着炒栗子和落叶的甜香。\n我们坐在图书馆后院的长椅上，讨论着十年后的自己会变成什么样。\n当时觉得十年漫长得如同遥远的星空，而如今回看，那些闪闪发光的瞬间早已铸就了今天的我们。',
      date: '2021-09-15'
    },
    {
      id: 's-302',
      chapter: '第二章',
      title: '深夜实验室与极光色台灯',
      content: '键盘敲击声在安静的房间里起伏。桌角的小台灯散发着暖黄的光芒。\n外面不知何时下起了小雨，雨滴打在窗檐上发出淅淅沥沥的声音。那一刻没有对未来的焦虑，只有专注于眼前创造的平静与充实。',
      date: '2023-04-12'
    },
    {
      id: 's-303',
      chapter: '第三章',
      title: '跨越三千公里的旧信件',
      content: '整理旧物时翻出了一封寄自大理的书信，信封边缘微微泛黄。\n信里记载着那年夏天古城小院里的风声、吉他声与繁星点点的夜空。字里行间涌动的情感，让时光仿佛重新倒流回了那个热烈而真诚的时刻。',
      date: '2024-11-02'
    }
  ],
  artifacts: [
    {
      id: 'a-401',
      name: '2021年演唱会旧票根',
      date: '2021-10-24',
      story: '在夹层钱包里藏了很久的演唱会门票。票面字迹已经有些褪色，但全场万人合唱《温柔》时的感动与闪烁星海依然清晰如初。',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80'
    },
    {
      id: 'a-402',
      name: '手作黄铜复古书签',
      date: '2022-05-20',
      story: '生日时收到的精美手作黄铜书签，上面刻着“岁岁年年，万事胜意”。它陪我静静读完了整整三十多本关于岁月与建筑的书籍。',
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80'
    },
    {
      id: 'a-403',
      name: '奶奶留下的胶片相机',
      date: '2023-02-14',
      story: '台机械感满满的凤凰牌胶片相机，快门按下的机械咔哒声极其治愈。用它记录了许多生活里未加滤镜的最真实温情画面。',
      image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=80'
    }
  ],
  letters: [
    {
      id: 'l-501',
      title: '致三十岁的自己',
      unlockDate: '2030-01-01',
      content: '你好呀，三十岁的自己！希望当你打开这封信时，依然保持着对生活的热心与赤子之心。不要忘记年轻时许下的那些关于远方与自由的承诺。',
      isUnlocked: false
    },
    {
      id: 'l-502',
      title: '写给大学刚毕业时的告别信',
      unlockDate: '2024-06-01',
      content: '再见了，象牙塔。前方的路也许充满迷雾，但请勇敢地往前走，你所经历的一切都会成为你最坚实的铠甲。',
      isUnlocked: true
    }
  ]
};
