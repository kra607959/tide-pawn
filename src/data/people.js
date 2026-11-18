// 镇上的人。look 交给 art/people.js 画。
// hair: bun 发髻 / short 短发 / bald 光头 / bob 齐耳 / messy 乱发 / tuft 小揪 / braid 辫子 / side 分头 / slick 背头
// hat: bowler 圆礼帽 / fedora 软呢帽 / conical 斗笠 / skullcap 瓜皮帽 / police 警帽 / scarf 头巾 / student 学生帽 / sailor 水手帽 / flatcap 鸭舌帽
// collar: mandarin 立领长衫 / jacket 对襟短褂 / suit 西装 / uniform 制服 / apron 围裙 / open 敞怀
export const PEOPLE = {
  zheng: { name: '郑三爷', color: '#8a3b2e', look: { skin: '#e2b994', hair: '#1d1a18', hairStyle: 'slick', hat: 'fedora', hatColor: '#3a332e', cloth: '#26211e', collar: 'mandarin', beard: 'moustache', glasses: true, age: .45, build: 'wide', chain: true } },
  shitou: { name: '小石头', color: '#4f7a3a', look: { skin: '#c98d5e', hair: '#1a1410', hairStyle: 'tuft', cloth: '#6b7d8c', collar: 'open', age: 0, build: 'kid', patch: true, cheeks: true } },
  lin: { name: '林阿婆', color: '#5a6a8a', look: { skin: '#dcb38e', hair: '#bdb6ad', hairStyle: 'bun', cloth: '#2f4058', collar: 'jacket', age: .9, build: 'thin', pinless: true } },
  afeng: { name: '阿凤', color: '#b0476a', look: { skin: '#f0cfae', hair: '#1c1614', hairStyle: 'bob', cloth: '#c5687a', collar: 'mandarin', age: .1, build: 'thin', cheeks: true, clip: true } },
  haisheng: { name: '海生', color: '#2f6f8f', look: { skin: '#b9845a', hair: '#15110e', hairStyle: 'short', hat: 'sailor', hatColor: '#f2efe6', cloth: '#2c4a6e', collar: 'open', age: .15, build: 'normal' } },
  shouhou: { name: '瘦猴', color: '#7a6a3a', look: { skin: '#d6ae86', hair: '#2a2420', hairStyle: 'short', hat: 'flatcap', hatColor: '#5a5650', cloth: '#7b776e', collar: 'open', beard: 'stubble', age: .3, build: 'thin', eye: 'shifty' } },
  hong: { name: '洪伯', color: '#4a5a6a', look: { skin: '#d2a07c', hair: '#c9c4bc', hairStyle: 'messy', cloth: '#2e3b4c', collar: 'uniform', beard: 'stubble', age: .85, build: 'normal', nose: true, eye: 'tired' } },
  hong2: { name: '洪伯', color: '#4a5a6a', look: { skin: '#d2a07c', hair: '#c9c4bc', hairStyle: 'side', cloth: '#2e3b4c', collar: 'uniform', age: .85, build: 'normal', eye: 'tired' } },
  su: { name: '苏先生', color: '#3a6a5a', look: { skin: '#ecc9a6', hair: '#1f1b18', hairStyle: 'side', cloth: '#56708a', collar: 'mandarin', glasses: true, age: .3, build: 'thin' } },
  ma: { name: '老马', color: '#2f3a4f', look: { skin: '#d6a77f', hair: '#2a2420', hairStyle: 'short', hat: 'police', hatColor: '#1f2633', cloth: '#232c3c', collar: 'uniform', beard: 'moustache', age: .55, build: 'wide' } },
  he: { name: '何先生', color: '#6a4a8a', look: { skin: '#efd3b5', hair: '#3a2e26', hairStyle: 'slick', hat: 'bowler', hatColor: '#1e1b1a', cloth: '#4a4136', collar: 'suit', beard: 'moustache', age: .5, build: 'normal', glasses: true } },
  hu: { name: '胡郎中', color: '#8a6a2a', look: { skin: '#dbb28a', hair: '#2a2420', hairStyle: 'short', hat: 'scarf', hatColor: '#8c3a2a', cloth: '#6e5a3a', collar: 'mandarin', beard: 'goatee', age: .5, build: 'thin', eye: 'smile' } },

  // —— 街坊（随机客人）——
  wang: { name: '王老大', color: '#3f5f6f', pool: 'sea', look: { skin: '#b07a50', hair: '#2a2420', hairStyle: 'short', hat: 'conical', hatColor: '#c9a463', cloth: '#3d5566', collar: 'open', beard: 'full', age: .55, build: 'wide' } },
  zhangshen: { name: '张婶', color: '#7a4a5a', pool: 'home', look: { skin: '#dcb08a', hair: '#2a2420', hairStyle: 'bun', hat: 'scarf', hatColor: '#3f6b5c', cloth: '#7c5a48', collar: 'jacket', age: .5, build: 'wide', cheeks: true } },
  liu: { name: '刘水手', color: '#2a5a7a', pool: 'sea', look: { skin: '#b9845a', hair: '#15110e', hairStyle: 'short', hat: 'sailor', hatColor: '#f2efe6', cloth: '#26456a', collar: 'open', beard: 'stubble', age: .3, build: 'normal' } },
  chen: { name: '陈同学', color: '#4a6a3a', pool: 'scholar', look: { skin: '#efd0b0', hair: '#1a1614', hairStyle: 'short', hat: 'student', hatColor: '#202a3a', cloth: '#26314a', collar: 'uniform', glasses: true, age: .05, build: 'thin' } },
  zhao: { name: '赵货郎', color: '#7a5a2a', pool: 'any', look: { skin: '#c99a6e', hair: '#2a2420', hairStyle: 'bald', hat: 'skullcap', hatColor: '#2a2624', cloth: '#8a6a44', collar: 'jacket', beard: 'moustache', age: .5, build: 'normal', eye: 'smile' } },
  agui: { name: '阿贵', color: '#5a6a2a', pool: 'sea', look: { skin: '#a8724a', hair: '#1a1410', hairStyle: 'messy', cloth: '#5f6b4a', collar: 'open', age: .25, build: 'normal' } },
  lisis: { name: '李太太', color: '#8a3a6a', pool: 'home', rich: true, look: { skin: '#f3d9bf', hair: '#14100e', hairStyle: 'bun', cloth: '#5b2d4a', collar: 'mandarin', age: .4, build: 'normal', earrings: true } },
  wu: { name: '吴秀才', color: '#4a4a6a', pool: 'scholar', look: { skin: '#e3c09c', hair: '#9d968d', hairStyle: 'braid', hat: 'skullcap', hatColor: '#1e1c1c', cloth: '#4b5568', collar: 'mandarin', beard: 'goatee', glasses: true, age: .8, build: 'thin' } },
  majie: { name: '马大姐', color: '#6a5a3a', pool: 'home', look: { skin: '#cf9f78', hair: '#211b17', hairStyle: 'bun', cloth: '#6a7a6a', collar: 'apron', age: .45, build: 'wide', cheeks: true } },
  zhou: { name: '周木匠', color: '#6a4a2a', pool: 'any', look: { skin: '#c48f63', hair: '#2a2420', hairStyle: 'short', cloth: '#8b7355', collar: 'apron', beard: 'stubble', age: .6, build: 'wide' } },
  kexiang: { name: '外乡客', color: '#3a3a5a', pool: 'any', rich: true, look: { skin: '#e8c6a2', hair: '#1f1a17', hairStyle: 'side', hat: 'fedora', hatColor: '#6a5a48', cloth: '#5a5246', collar: 'suit', age: .35, build: 'normal' } },
  xiaomei: { name: '小梅', color: '#8a5a6a', pool: 'home', look: { skin: '#f0d0b0', hair: '#1a1412', hairStyle: 'braid', cloth: '#d69a5a', collar: 'jacket', age: .05, build: 'thin', cheeks: true } },
};

export const TOWNSFOLK = Object.keys(PEOPLE).filter(k => PEOPLE[k].pool);
