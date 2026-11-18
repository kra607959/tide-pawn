// 物品模板。
// 每件东西有几个面（faces）。细节（details）的 x、y 是它在那一面画布上的相对位置（0–1），
// r 是放大镜要对准的半径（同一单位）。
//   mod    乘到真实价值上的系数        looks  外行看上去的系数（假货用）
//   fake   假货的破绽                  g      同组细节（同一个毛病的几处破绽，价值只算一次）
//   tool   'weigh' 表示掂量才知道      p      随机生成时出现的概率
//   req    跟着另一处细节一起出现      not    那处细节在时不出现
//   excl   同一互斥组只出一个          only   只在这些变体上出现
//   mark   画在物件上的痕迹类型（见 art/items.js）  mt  痕迹上的字
//   note   看出来时的说法              clue   看出来就记进笔记的线索
const W = 'weigh';

export const CATS = ['首饰', '表', '玉', '瓷', '钱', '船具', '文玩', '杂'];

export const ITEMS = {
  seaglass: {
    name: '海玻璃', cat: '杂', draw: 'seaglass', faces: ['front'], desc: '被海浪磨圆了棱角的碎玻璃。',
    variants: { green: { name: '绿海玻璃', base: 2, w: 4 }, brown: { name: '茶色海玻璃', base: 2, w: 3 }, white: { name: '白海玻璃', base: 1, w: 3 }, blue: { name: '钴蓝海玻璃', base: 5, w: 1 } },
    pool: [
      { id: 'thread', face: 'front', x: .34, y: .36, r: .1, mark: 'thread', mod: 1.8, p: .25, note: '一角留着半圈螺纹——是老瓶口磨成的，收海玻璃的人专要这个。' },
    ],
  },
  button: {
    name: '铜纽扣', cat: '杂', draw: 'button', faces: ['front', 'back'], base: 2, desc: '一枚发乌的铜扣子。',
    pool: [
      { id: 'anchor', face: 'front', x: .5, y: .5, r: .13, mark: 'anchor', mt: '招商轮船', mod: 3, p: .3, note: '扣面压着船锚，外圈一行小字「招商轮船」——轮船公司的制服扣，有人专收。' },
      { id: 'shank', face: 'back', x: .5, y: .5, r: .1, mark: 'broken', mod: .7, p: .25, note: '背后的扣鼻断了，钉不回衣服上。' },
    ],
  },
  dollar: {
    name: '银元', cat: '钱', draw: 'dollar', faces: ['front', 'back'], base: 14, desc: '一块银洋，头像磨得发亮。',
    pool: [
      { id: 'seam', face: 'front', x: .87, y: .5, r: .08, mark: 'seam', g: 'fake', fake: true, mod: .08, p: .22, note: '边齿是铸出来的，侧边还留着一道合模线——假洋。' },
      { id: 'lead', tool: W, g: 'fake', fake: true, mod: .08, req: 'seam', note: '掂着发飘，比真洋轻一截——铅芯镀银。' },
      { id: 'year3', face: 'back', x: .5, y: .3, r: .09, mark: 'stamp', mt: '三年', mod: 1.5, p: .25, not: 'seam', note: '背面「中华民国三年」，老版子，比寻常的好出手。' },
      { id: 'worn', face: 'front', x: .42, y: .42, r: .1, mark: 'scratch', mod: .8, p: .3, note: '磨得厉害，头像的发丝都平了。' },
    ],
  },
  cash: {
    name: '老铜钱', cat: '钱', draw: 'cash', faces: ['front', 'back'], base: 2, desc: '一枚方孔铜钱，绿锈斑斑。',
    pool: [
      { id: 'xianfeng', face: 'front', x: .5, y: .5, r: .2, mark: 'none', mod: 12, p: .14, note: '「咸丰重宝」，背后「当百」——大钱，藏家肯出价。' },
      { id: 'patina', face: 'back', x: .3, y: .62, r: .1, mark: 'patina', mod: .8, p: .4, note: '锈吃进了字口，品相差些。' },
    ],
  },
  ring: {
    name: '戒指', cat: '首饰', draw: 'ring', faces: ['front', 'inside'], desc: '一枚戒指，戴得很久了。',
    variants: { gold: { name: '金戒指', base: 45, w: 2 }, silver: { name: '银戒指', base: 10, w: 3 } },
    pool: [
      { id: 'plated', face: 'front', x: .3, y: .64, r: .09, mark: 'wear', only: ['gold'], g: 'plated', fake: true, mod: .12, p: .25, note: '戒圈底下磨掉一小块，露出红铜色——是包金的。' },
      { id: 'light', tool: W, only: ['gold'], g: 'plated', fake: true, mod: .12, req: 'plated', note: '分量不对，比真金轻一截。' },
      { id: 'zujin', face: 'inside', x: .38, y: .5, r: .1, mark: 'stamp', mt: '足金', only: ['gold'], not: 'plated', mod: 1.15, p: .7, note: '里圈打着「足金」戳，字口清楚，是银楼的正经戳。' },
      { id: 'wenyin', face: 'inside', x: .38, y: .5, r: .1, mark: 'stamp', mt: '纹银', only: ['silver'], mod: 1.15, p: .5, note: '里圈「纹银」小戳。' },
      { id: 'scratch', face: 'front', x: .68, y: .6, r: .1, mark: 'scratch', mod: .88, p: .35, note: '戒面划痕不少，得抛一抛才卖得上价。' },
    ],
  },
  hairpin: {
    name: '发簪', cat: '首饰', draw: 'hairpin', faces: ['front', 'back'], desc: '一根发簪，簪头有花样。',
    variants: { silver: { name: '银簪', base: 14, w: 3 }, brass: { name: '铜簪', base: 3, w: 2 }, jade: { name: '玉头簪', base: 20, w: 1 } },
    pool: [
      { id: 'maker', face: 'front', x: .35, y: .64, r: .09, mark: 'stamp', mt: '宝成', only: ['silver'], mod: 1.4, p: .3, note: '簪身打着「宝成」字号——上海老银楼的东西。' },
      { id: 'solder', face: 'front', x: .6, y: .42, r: .09, mark: 'solder', mod: .65, p: .2, note: '簪身断过，用锡焊上了，焊口发灰。' },
      { id: 'glasshead', face: 'front', x: .78, y: .24, r: .09, mark: 'bubble', only: ['jade'], g: 'glass', fake: true, mod: .15, p: .35, note: '簪头里有一串小气泡——是料器，玻璃的。' },
    ],
  },
  bracelet: {
    name: '手镯', cat: '首饰', draw: 'bracelet', faces: ['front'], desc: '一只手镯，戴得发亮。',
    variants: { silver: { name: '银手镯', base: 18, w: 3 }, jade: { name: '翡翠手镯', base: 50, w: 2 }, gold: { name: '金手镯', base: 75, w: 1 } },
    pool: [
      { id: 'hollow', tool: W, only: ['silver', 'gold'], mod: .55, p: .25, note: '掂着轻——空心的，料不足。' },
      { id: 'crack', face: 'front', x: .71, y: .29, r: .09, mark: 'crack', only: ['jade'], mod: .35, p: .25, note: '对着光看，镯身有一道通裂。' },
      { id: 'bubble', face: 'front', x: .71, y: .71, r: .09, mark: 'bubble', only: ['jade'], g: 'glass', fake: true, mod: .06, p: .25, not: 'crack', note: '绿里裹着细细的圆气泡——玻璃仿的，不是翡翠。' },
      { id: 'gwear', face: 'front', x: .5, y: .8, r: .09, mark: 'wear', only: ['gold'], g: 'plated', fake: true, mod: .12, p: .3, note: '内侧磨出一块红铜色——包金镯子。' },
      { id: 'glight', tool: W, only: ['gold'], g: 'plated', fake: true, mod: .12, req: 'gwear', note: '真金镯子这么大，分量该沉手。这个轻。' },
      { id: 'stamp', face: 'front', x: .2, y: .5, r: .09, mark: 'stamp', mt: '足纹', only: ['silver'], mod: 1.1, p: .4, note: '「足纹」戳记，成色好。' },
    ],
  },
  jade: {
    name: '玉佩', cat: '玉', draw: 'jade', faces: ['front', 'back'], base: 32, desc: '一块玉佩，雕着一尾鱼，拴着红绳。',
    pool: [
      { id: 'bubble', face: 'front', x: .4, y: .56, r: .09, mark: 'bubble', g: 'glass', fake: true, mod: .06, p: .2, note: '玉里有圆圆的小气泡——玉不会有这个，是玻璃。' },
      { id: 'dyed', face: 'front', x: .68, y: .68, r: .09, mark: 'dye', g: 'dyed', fake: true, mod: .25, looks: 1.4, p: .2, not: 'bubble', note: '红沁浮在表面，裂缝里颜色最浓——是后染的「老沁」。' },
      { id: 'fine', face: 'back', x: .5, y: .5, r: .14, mark: 'carve', mod: 1.6, p: .2, note: '背面阴刻的水纹细如发丝，是老手艺。' },
      { id: 'chip', face: 'front', x: .5, y: .86, r: .08, mark: 'chip', mod: .6, p: .2, note: '下沿磕掉一块。' },
    ],
  },
  bowl: {
    name: '青花碗', cat: '瓷', draw: 'bowl', faces: ['front', 'bottom'], base: 16, desc: '一只青花小碗，画的是缠枝莲。',
    pool: [
      { id: 'qianlong', face: 'bottom', x: .5, y: .5, r: .13, mark: 'reign', mt: '大清乾隆年制', excl: 'reign', mod: 5, p: .1, note: '底款篆书笔意老辣，圈足露胎处泛着火石红——真正的老窑。' },
      { id: 'fakereign', face: 'bottom', x: .5, y: .5, r: .13, mark: 'reign', mt: '大清乾隆年制', excl: 'reign', fake: true, mod: .7, looks: 5, p: .3, note: '款字写得太工整，青花浮在釉上，圈足一点火石红都没有——新仿的。' },
      { id: 'crack', face: 'front', x: .66, y: .42, r: .09, mark: 'crack', mod: .4, p: .25, note: '碗沿往下一道冲线，弹一下声音发哑。' },
      { id: 'staple', face: 'front', x: .32, y: .52, r: .09, mark: 'staple', mod: .5, p: .15, not: 'crack', note: '锔过两枚铜钉，补过的碗只值一半。' },
      { id: 'chip', face: 'front', x: .8, y: .3, r: .08, mark: 'chip', mod: .75, p: .2, note: '口沿崩了米粒大一块。' },
    ],
  },
  watch: {
    name: '怀表', cat: '表', draw: 'watch', faces: ['front', 'back', 'inside'], desc: '一只怀表，链子断了。',
    variants: { silver: { name: '银壳怀表', base: 32, w: 3 }, brass: { name: '铜壳怀表', base: 12, w: 3 }, gold: { name: '金壳怀表', base: 85, w: 1 } },
    pool: [
      { id: 'swiss', face: 'inside', x: .78, y: .62, r: .09, mark: 'stamp', mt: 'SWISS', mod: 1.6, p: .35, not: 'gwear', note: '机芯夹板上打着「SWISS」钢印——正经瑞士货。' },
      { id: 'crack', face: 'front', x: .64, y: .42, r: .1, mark: 'crack', mod: .75, p: .3, note: '表蒙裂了一道，得换玻璃。' },
      { id: 'rust', face: 'inside', x: .66, y: .44, r: .09, mark: 'rust', mod: .45, p: .2, note: '机芯锈住了，摆轮推不动——修起来比买块新的还贵。' },
      { id: 'gwear', face: 'back', x: .3, y: .72, r: .09, mark: 'wear', only: ['gold'], g: 'plated', fake: true, mod: .15, p: .35, note: '后盖边缘磨出铜色——是镀金的铜壳。' },
      { id: 'glight', tool: W, only: ['gold'], g: 'plated', fake: true, mod: .15, req: 'gwear', note: '金壳表该压手，这只轻飘飘的。' },
    ],
  },
  compass: {
    name: '船用罗盘', cat: '船具', draw: 'compass', faces: ['front'], base: 24, desc: '木匣子里嵌着一只铜罗盘。',
    pool: [
      { id: 'maker', face: 'front', x: .5, y: .84, r: .09, mark: 'stamp', mt: 'KELVIN', mod: 1.5, p: .25, note: '匣子铜牌上刻着英国船厂的字号——洋船上拆下来的好货。' },
      { id: 'leak', face: 'front', x: .6, y: .4, r: .08, mark: 'bubble', mod: .7, p: .25, note: '玻璃底下有个大气泡——油漏了，指针发涩。' },
      { id: 'dent', face: 'front', x: .24, y: .36, r: .09, mark: 'dent', mod: .85, p: .3, note: '铜圈磕瘪了一块。' },
    ],
  },
  spyglass: {
    name: '单筒望远镜', cat: '船具', draw: 'spyglass', faces: ['front'], base: 28, desc: '三节黄铜望远镜，皮套磨破了。',
    pool: [
      { id: 'maker', face: 'front', x: .4, y: .44, r: .09, mark: 'stamp', mt: 'LONDON', mod: 1.5, p: .25, note: '镜筒上刻着「LONDON」——舶来的老镜子。' },
      { id: 'lens', face: 'front', x: .92, y: .5, r: .07, mark: 'crack', mod: .5, p: .25, note: '物镜裂了，看出去一道白线。' },
      { id: 'dent', face: 'front', x: .64, y: .56, r: .09, mark: 'dent', mod: .85, p: .3, note: '镜筒有个瘪坑，抽拉发卡。' },
    ],
  },
  fan: {
    name: '折扇', cat: '文玩', draw: 'fan', faces: ['front', 'back'], base: 10, desc: '一把竹骨折扇，扇面画着山水。',
    pool: [
      { id: 'signed', face: 'back', x: .3, y: .44, r: .09, mark: 'seal', mt: '澹', excl: 'sig', mod: 6, p: .1, note: '题款「澹庐」，印泥暗红发沉——是那位写字先生的真迹。' },
      { id: 'fakesig', face: 'back', x: .3, y: .44, r: .09, mark: 'seal2', mt: '澹', excl: 'sig', fake: true, mod: 1, looks: 6, p: .25, note: '印泥红得发亮，像昨天才盖上去的——冒的款。' },
      { id: 'torn', face: 'front', x: .7, y: .38, r: .09, mark: 'tear', mod: .5, p: .25, note: '扇面破了个口子。' },
    ],
  },
  pipe: {
    name: '烟斗', cat: '杂', draw: 'pipe', faces: ['front'], base: 8, desc: '一只石楠木烟斗。',
    pool: [
      { id: 'amber', face: 'front', x: .86, y: .44, r: .08, mark: 'none', mod: 2.4, p: .25, note: '烟嘴是真琥珀，对光里头有细细的流纹。' },
      { id: 'crack', face: 'front', x: .24, y: .4, r: .09, mark: 'crack', mod: .6, p: .25, note: '斗钵烧裂了。' },
    ],
  },
  lantern: {
    name: '马灯', cat: '船具', draw: 'lantern', faces: ['front'], base: 8, desc: '一盏防风马灯，玻璃罩熏黑了。',
    pool: [
      { id: 'maker', face: 'front', x: .5, y: .84, r: .09, mark: 'stamp', mt: '美孚', mod: 1.4, p: .3, note: '底座压着「美孚」字样，老牌子，耐用。' },
      { id: 'rust', face: 'front', x: .62, y: .2, r: .09, mark: 'rust', mod: .7, p: .35, note: '灯帽锈穿了。' },
    ],
  },
  musicbox: {
    name: '八音盒', cat: '文玩', draw: 'musicbox', faces: ['front', 'inside'], base: 26, desc: '一只镶贝壳的小木盒，打开会响。',
    pool: [
      { id: 'teeth', face: 'inside', x: .62, y: .62, r: .09, mark: 'broken', mod: .4, p: .3, note: '音梳断了三根齿，曲子缺音。' },
      { id: 'maker', face: 'inside', x: .3, y: .7, r: .09, mark: 'stamp', mt: 'REUGE', mod: 1.5, p: .25, note: '机芯底板刻着瑞士厂名——好货。' },
    ],
  },
  lock: {
    name: '长命锁', cat: '首饰', draw: 'lock', faces: ['front', 'back'], base: 15, desc: '一把小孩戴的长命锁，刻着「长命百岁」。',
    pool: [
      { id: 'cwear', face: 'front', x: .72, y: .64, r: .09, mark: 'wear', g: 'plated', fake: true, mod: .2, p: .25, note: '锁角磨出了黄铜色——铜胎镀银。' },
      { id: 'clight', tool: W, g: 'plated', fake: true, mod: .2, req: 'cwear', note: '掂着发飘，不是银的分量。' },
      { id: 'stamp', face: 'back', x: .5, y: .7, r: .09, mark: 'stamp', mt: '足纹', not: 'cwear', mod: 1.2, p: .4, note: '背面「足纹」戳。' },
    ],
  },
  snuff: {
    name: '鼻烟壶', cat: '文玩', draw: 'snuff', faces: ['front'], base: 22, desc: '一只扁圆的玻璃鼻烟壶。',
    pool: [
      { id: 'inner', face: 'front', x: .5, y: .56, r: .12, mark: 'inner', mod: 2.5, p: .2, not: 'mold', note: '壶里画着一叶小舟——是从壶口伸笔进去反着画的内画，费工夫。' },
      { id: 'mold', face: 'front', x: .7, y: .5, r: .08, mark: 'seam', fake: true, mod: .25, looks: 2.5, p: .25, note: '侧边一道模线，是模子吹出来的新货。' },
    ],
  },
  cigcase: {
    name: '烟盒', cat: '杂', draw: 'cigcase', faces: ['front', 'inside'], desc: '一只扁扁的烟盒，盖子上錾着花。',
    variants: { silver: { name: '银烟盒', base: 16, w: 2 }, tin: { name: '铁皮烟盒', base: 2, w: 2 } },
    pool: [
      { id: 'swear', face: 'front', x: .82, y: .78, r: .09, mark: 'wear', only: ['silver'], g: 'plated', fake: true, mod: .3, p: .25, note: '盒角磨出铜色，镀的银。' },
      { id: 'stamp', face: 'inside', x: .74, y: .66, r: .09, mark: 'stamp', mt: '纹银', only: ['silver'], not: 'swear', mod: 1.2, p: .5, note: '盒里打着「纹银」小戳。' },
    ],
  },
  seal: {
    name: '印章', cat: '文玩', draw: 'seal', faces: ['front', 'bottom'], base: 12, desc: '一方石印，钮上蹲着一只兽。',
    pool: [
      { id: 'good', face: 'front', x: .55, y: .6, r: .1, mark: 'grain', excl: 'stone', mod: 3, p: .15, note: '石质温润，里头有萝卜丝纹——好寿山石。' },
      { id: 'dyed', face: 'front', x: .4, y: .74, r: .09, mark: 'dye', excl: 'stone', fake: true, mod: .35, looks: 3, p: .2, note: '颜色浮在石皮上，刮一下底下发白——染的。' },
    ],
  },
  book: {
    name: '旧书', cat: '文玩', draw: 'book', faces: ['front', 'inside'], base: 6, desc: '一册线装旧书，书角卷了。',
    pool: [
      { id: 'rare', face: 'inside', x: .74, y: .3, r: .09, mark: 'seal', mt: '藏', mod: 6, p: .12, note: '扉页钤着藏书楼的印，是光绪年的刻本。' },
      { id: 'worm', face: 'front', x: .64, y: .64, r: .1, mark: 'holes', mod: .6, p: .3, note: '虫蛀了，一翻就掉渣。' },
    ],
  },
  shard: {
    name: '瓷片', cat: '瓷', draw: 'shard', faces: ['front'], base: 1, desc: '一块海里冲上来的碎瓷片。',
    pool: [
      { id: 'guan', face: 'front', x: .5, y: .5, r: .14, mark: 'crackle', mod: 14, p: .12, note: '釉面开着冰裂纹，断口露出铁黑的胎——宋代官窑的片子，研究瓷器的人肯出价。' },
    ],
  },
  junk: {
    name: '破烂', cat: '杂', draw: 'junk', faces: ['front'], desc: '海里冲上来的东西。',
    variants: { cap: { name: '锈瓶盖', base: 0, w: 2 }, nail: { name: '老船钉', base: 1, w: 2 }, sinker: { name: '铅坠', base: 1, w: 2 } },
    pool: [],
  },
  bottle: {
    name: '旧玻璃瓶', cat: '杂', draw: 'bottle', faces: ['front'], base: 1, desc: '一只沾满藤壶的旧瓶子。',
    pool: [],
  },
  porthole: {
    name: '铜舷窗', cat: '船具', draw: 'porthole', faces: ['front'], base: 30, desc: '一圈沉甸甸的铜舷窗，玻璃还在。',
    pool: [],
  },
  // —— 剧情物 ——
  lin_pin: {
    name: '林阿婆的银簪', cat: '首饰', draw: 'hairpin', v: 'silver', faces: ['front', 'back'], base: 12, story: true, desc: '一根老银簪，簪头是一朵梅花。',
    fixed: [
      { id: 'maker', face: 'front', x: .35, y: .64, r: .09, mark: 'stamp', mt: '宝成', mod: 1.3, note: '簪身打着「宝成」字号，成色足。' },
      { id: 'gift', face: 'back', x: .45, y: .55, r: .1, mark: 'engrave', mt: '月娥赠', note: '簪背刻着小小的三个字：「月娥赠」——是外婆送她的。' },
    ],
  },
  afeng_ring: {
    name: '阿凤的金戒指', cat: '首饰', draw: 'ring', v: 'gold', faces: ['front', 'inside'], base: 40, story: true, desc: '一枚素圈金戒指，擦得锃亮。',
    fixed: [
      { id: 'zujin', face: 'inside', x: .38, y: .5, r: .1, mark: 'stamp', mt: '足金', mod: 1.15, note: '里圈「足金」戳，字口清楚。' },
      { id: 'names', face: 'inside', x: .68, y: .5, r: .1, mark: 'engrave', mt: '凤·海生', note: '里圈刻着「凤 · 海生」。' },
    ],
  },
  zheng_case: {
    name: '银烟盒', cat: '杂', draw: 'cigcase', v: 'silver', faces: ['front', 'inside'], base: 16, story: true, desc: '一只沉手的银烟盒，錾着卷草纹。',
    fixed: [
      { id: 'zheng', face: 'front', x: .5, y: .42, r: .1, mark: 'engrave', mt: '郑', note: '盒盖正中錾着一个「郑」字——这不是瘦猴家的东西。' },
      { id: 'stamp', face: 'inside', x: .74, y: .66, r: .09, mark: 'stamp', mt: '纹银', mod: 1.2, note: '盒里打着「纹银」戳。' },
      { id: 'stub', face: 'inside', x: .3, y: .48, r: .11, mark: 'paper', clue: 'stub', note: '夹层里塞着一张发黄的存根：「源丰钱庄 · 壬子年七月十五 · 付洪 · 贰佰元 · 票号〇七一五—〇二三」。' },
    ],
  },
  hong_watch: {
    name: '洪伯的怀表', cat: '表', draw: 'watch', v: 'silver', faces: ['front', 'back', 'inside'], base: 28, story: true, hands: [11, 40], desc: '一只银壳怀表，表蒙发黄，链子断了。',
    fixed: [
      { id: 'stopped', face: 'front', x: .5, y: .54, r: .12, mark: 'none', clue: 'watch_stop', note: '指针停在十一点四十分。上弦也不走——是摔停的，二十年没修。' },
      { id: 'engrave', face: 'back', x: .5, y: .56, r: .11, mark: 'engrave', mt: '澜湾灯塔守灯人洪', clue: 'watch_engrave', note: '后盖刻着「澜湾灯塔 · 守灯人 洪」。' },
      { id: 'photo', face: 'inside', x: .28, y: .5, r: .12, mark: 'photo', clue: 'watch_photo', note: '表盖里嵌着一张小照片：梳辫子的姑娘，背后写着「小荷 · 十六岁」。' },
      { id: 'swiss', face: 'inside', x: .78, y: .62, r: .09, mark: 'stamp', mt: 'SWISS', mod: 1.6, note: '机芯打着「SWISS」钢印，是正经瑞士货。' },
    ],
  },
  hu_jade: {
    name: '「和田老玉」', cat: '玉', draw: 'jade', faces: ['front', 'back'], base: 40, story: true, desc: '一块油亮的玉佩，雕着鱼，红沁一片。',
    fixed: [
      { id: 'bubble', face: 'front', x: .4, y: .56, r: .09, mark: 'bubble', g: 'glass', fake: true, mod: .05, note: '玉肉里有一串圆气泡——这是玻璃。' },
      { id: 'warm', tool: W, g: 'glass', fake: true, mod: .05, note: '握在手里一会儿就热了，真玉凉得久——还是玻璃。' },
      { id: 'dyed', face: 'front', x: .68, y: .68, r: .09, mark: 'dye', note: '红沁全浮在面上，裂缝里颜色最深，是拿颜料煮出来的。' },
    ],
  },
  bottle_letter: {
    name: '藤壶瓶子', cat: '杂', draw: 'bottle', faces: ['front', 'inside'], base: 1, story: true, letter: true, desc: '一只封了蜡的旧瓶子，里头卷着纸。',
    fixed: [
      { id: 'wax', face: 'front', x: .86, y: .48, r: .08, mark: 'none', note: '瓶口封着蜡，蜡上按着一个指印。' },
      { id: 'letter', face: 'inside', x: .5, y: .5, r: .16, mark: 'paper', clue: 'bottle_letter', note: '「七月十五夜。灯塔黑了，四下什么也看不见。许船长一滴酒没沾，他在舵上喊了一路，让大家穿好救生衣。若有人捡到这封信，请告诉我娘，小满不怕。——周小满」' },
    ],
  },
  crew_photo: {
    name: '望舒号船员合影', cat: '杂', draw: 'photo', faces: ['front', 'back'], base: 1, story: true, desc: '一张发黄的合影，七个人站在船头。',
    fixed: [
      { id: 'captain', face: 'front', x: .5, y: .44, r: .1, mark: 'none', note: '正中那人戴着船长帽，眉眼和外婆柜上那张照片里的外公一模一样。' },
      { id: 'names', face: 'back', x: .5, y: .62, r: .14, mark: 'none', clue: 'crew_photo', note: '背后一排小字：「望舒号 壬子年夏 · 船长许长庚 大副林有福 …… 押货郑三」。「郑三」两个字下面，有人用铅笔划了一道。' },
    ],
  },
  porthole_ws: {
    name: '铜舷窗', cat: '船具', draw: 'porthole', faces: ['front'], base: 30, story: true, desc: '一圈沉甸甸的铜舷窗，玻璃还在。',
    fixed: [
      { id: 'name', face: 'front', x: .5, y: .86, r: .09, mark: 'engrave', mt: '望舒', clue: 'porthole', note: '窗框底下铸着两个字：「望舒」。' },
    ],
  },
  bell_ws: {
    name: '望舒号船钟', cat: '船具', draw: 'bell', faces: ['front'], base: 45, story: true, desc: '一口铜船钟，长满了藤壶和绿锈。',
    fixed: [
      { id: 'name', face: 'front', x: .5, y: .58, r: .12, mark: 'engrave', mt: '望舒 民国元年', clue: 'bell', note: '钟身铸着「望舒 · 民国元年」。敲一下，声音还亮。' },
    ],
  },
  logbook: {
    name: '铁匣里的航海日志', cat: '杂', draw: 'logbook', faces: ['front', 'inside'], base: 4, story: true, letter: true, desc: '一只锈死的洋铁匣，撬开来，里头的本子居然只湿了边。',
    fixed: [
      { id: 'cover', face: 'front', x: .5, y: .4, r: .12, mark: 'none', note: '封皮压着「望舒号 航海日志」。' },
      { id: 'last', face: 'inside', x: .5, y: .64, r: .16, mark: 'none', clue: 'logbook', note: '最后一页，字迹被水洇开：「七月十五。二十三时三十五分，澜湾灯塔灯灭。全速倒车不及。全员着救生衣。——许长庚」' },
    ],
  },
  iou: {
    name: '欠条', cat: '杂', draw: 'paper', faces: ['front'], base: 0, story: true, letter: true, desc: '郑三爷摊在柜上的一张欠条。',
    fixed: [
      { id: 'text', face: 'front', x: .5, y: .5, r: .2, mark: 'none', clue: 'iou', note: '「今借到郑记大洋叁佰元，七月十五日归还。逾期以潮生当铺面抵偿。立据人 沈月娥 · 三月初九」。' },
    ],
  },
};

// 随机物件的取用池：谁会拿什么来
export const ITEM_POOLS = {
  sea: ['compass', 'spyglass', 'lantern', 'dollar', 'pipe', 'watch', 'cigcase', 'cash'],
  home: ['ring', 'hairpin', 'bracelet', 'jade', 'bowl', 'lock', 'dollar', 'fan'],
  scholar: ['fan', 'seal', 'book', 'bowl', 'snuff', 'jade', 'musicbox'],
  any: ['ring', 'hairpin', 'bracelet', 'jade', 'bowl', 'watch', 'compass', 'spyglass', 'fan', 'pipe', 'lantern', 'musicbox', 'lock', 'snuff', 'cigcase', 'seal', 'book', 'dollar', 'cash'],
};

// 能拿来行骗的东西：强制带上哪处假货破绽
export const SCAMS = {
  jade: 'bubble', bracelet: 'bubble', bowl: 'fakereign', ring: 'plated', watch: 'gwear', dollar: 'seam', fan: 'fakesig', snuff: 'mold', seal: 'dyed', lock: 'cwear', hairpin: 'glasshead',
};
// 行骗时用的变体
export const SCAM_VARIANT = { bracelet: 'jade', ring: 'gold', watch: 'gold', hairpin: 'jade' };
