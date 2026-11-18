// 十天的日程：七月初六到十五。潮一天比一天大，十五是今年最大的潮。
// amp：落潮时滩涂露出来多少（0–1），决定赶海能走多远。
// rand：随机客人的基数。events：当天的剧情客人（按顺序；at:'last' 排在最后）。
export const DAYS = [
  { date: '七月初六', amp: .36, low: '06:10', boat: true, rand: 1, weather: '晴', events: ['zheng_intro', 'shitou_1', 'lin_pawn'], noBeach: true },
  { date: '七月初七', amp: .30, low: '06:40', rand: 3, weather: '晴', events: ['afeng_pawn', 'shouhou_case'] },
  { date: '七月初八', amp: .26, low: '07:15', rand: 2, weather: '多云', tide: '小潮', events: ['hong_watch', 'hu_jade'] },
  { date: '七月初九', amp: .34, low: '07:50', boat: true, rand: 2, weather: '晴', events: ['ma_check', 'su_intro'] },
  { date: '七月初十', amp: .44, low: '08:20', rand: 3, weather: '晴', events: ['lin_redeem', 'shitou_2'] },
  { date: '七月十一', amp: .52, low: '08:55', rand: 3, weather: '风雨', storm: true, events: ['zheng_ledger'], noBeach: true },
  { date: '七月十二', amp: .63, low: '09:25', boat: true, rand: 3, weather: '雨后', events: ['afeng_redeem'] },
  { date: '七月十三', amp: .75, low: '05:40', rand: 3, weather: '晴', events: ['hong_return'] },
  { date: '七月十四', amp: .87, low: '06:15', rand: 2, weather: '晴', events: ['su_plan', 'zheng_warn'] },
  { date: '七月十五', amp: 1.0, low: '06:50', boat: true, rand: 2, weather: '晴', tide: '大潮', events: ['zheng_final'], last: true },
];

export const LAST_DAY = DAYS.length - 1;
