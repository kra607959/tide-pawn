// 剧情客人。每段是一个 async 函数，拿到的 c 是「柜台」：
//   c.S                   本局状态
//   await c.enter(pid)    客人进门         await c.leave()        客人出门
//   await c.say(who, 话, mood)   who 为人物 id，'me' 是心里话，'nar' 是旁白
//   await c.choose([选项…]) → 下标（第 0 项是默认的、厚道的那条路）
//   await c.deal({kind:'pawn'|'buy', item, who, ask, limit, patience, term, persona}) → {ok, price}
//   await c.sell({who, want, persona}) → {ok, item, price}     客人来买
//   await c.show(item)    摊在柜上给你细看（不成交）
//   c.gain(item) c.drop(item) c.redeem(item) c.clue(id) c.rep(n) c.cash(n) c.flag(k) c.set(k, v) c.mood(m)
// 浏览器里由 ui/counter.js 实现，node 模拟里由 tools/bot.mjs 实现。
import { makeItem, hasItem, shopItem, own, findItem } from '../logic/state.js';
import { trueValue, redeemPrice, fairness } from '../logic/econ.js';

const fair = (c, key, price, item, n = 2) => {
  if (fairness(price, item) === 'fair') { c.set(key, true); c.rep(n); return true; }
  if (fairness(price, item) === 'gouge') c.rep(-n - 1);
  return false;
};

export const SCRIPTS = {
  async zheng_intro(c) {
    await c.say('nar', '外婆走后第七天，你回到澜湾，卸下了「潮生当」的门板。');
    await c.say('nar', '柜台还是那么高。算盘、戥子、一沓空当票都在原处，像她只是出门买菜去了。');
    await c.enter('zheng');
    await c.say('zheng', '哟，月娥婶子的孙辈？节哀，节哀。');
    await c.say('zheng', '我是海和商行的郑三。你外婆三月里在我这儿借了三百块，拿这间铺子作的押。');
    const iou = makeItem(c.S, 'iou');
    await c.show(iou, '郑三爷把一张欠条摊在柜上。');
    const k = await c.choose(['我会还上的。', '外婆为什么借钱？']);
    if (k === 1) await c.say('zheng', '治病呗。老太太倔，宁可借我的，也不肯把铺子卖给我。');
    else await c.say('zheng', '有志气。', 'happy');
    await c.say('zheng', '七月十五，中元那天，我来收账。钱不够——铺子归商行。');
    await c.say('zheng', '十天。当铺嘛，低价收、高价出，你外婆干了四十年，你也学得会。');
    await c.say('zheng', '对了，这几天潮一天比一天大，十五是今年最大的潮。滩上捡着什么稀罕东西，先拿来给我瞧瞧。');
    await c.leave();
    await c.say('me', '三百块。抽屉里只有四十块钱，和一本外婆的旧当簿。');
  },

  async shitou_1(c) {
    await c.enter('shitou', 'happy');
    await c.say('shitou', '阿婆！——哦，你是新掌柜？阿婆以前收我的海玻璃，你收不收？');
    await c.say('nar', '他把一块蓝玻璃、一枚铜扣子拍在柜上。');
    await c.tip('beginner');
    const glass = makeItem(c.S, 'seaglass', { v: 'blue', force: ['thread'] });
    const r1 = await c.deal({ kind: 'buy', item: glass, who: 'shitou', ask: 1, limit: 1, patience: 4, persona: { naive: true } });
    const button = makeItem(c.S, 'button', { force: ['anchor'], noFake: true, clean: true });
    if (r1.ok) await c.say('shitou', '还有这个！扣子上有个锚。');
    const r2 = await c.deal({ kind: 'buy', item: button, who: 'shitou', ask: 1, limit: 1, patience: 4, persona: { naive: true } });
    const paid = (r1.ok ? r1.price : 0) + (r2.ok ? r2.price : 0);
    const worth = (r1.ok ? trueValue(glass) : 0) + (r2.ok ? trueValue(button) : 0);
    if (paid && paid >= worth * 0.45) {
      c.set('shitouFair', true); c.rep(3);
      await c.say('shitou', `${paid}块？！阿婆也是这么给的！`, 'happy');
      await c.say('shitou', '掌柜的，落潮的时候我带你下滩。滩上冒泡的地方有蛤，闪光的地方有好东西！');
    } else if (paid) {
      await c.say('shitou', '……噢。', 'sad');
      await c.say('me', '他攥着钱走了，没再回头。');
    } else {
      await c.say('shitou', '不收啊……', 'sad');
    }
    await c.leave();
  },

  async lin_pawn(c) {
    await c.enter('lin');
    await c.say('lin', '你就是月娥的孙辈吧？眉眼真像她。');
    await c.say('lin', '阿婆跟你不客气了——孙子烧了三天，郎中开的药……这根簪子，你先替我收着。');
    const pin = makeItem(c.S, 'lin_pin');
    const r = await c.deal({ kind: 'pawn', item: pin, who: 'lin', ask: 9, limit: 6, patience: 4, term: 4, persona: { dear: true } });
    if (r.ok) {
      if (r.price >= 8) { c.set('linFair', true); c.rep(2); await c.say('lin', '好孩子……初十我来赎。', 'happy'); }
      else await c.say('lin', '也好，也好。初十我来赎。');
    } else {
      c.set('linRefused', true); c.rep(-3);
      await c.say('lin', '……不碍事，不碍事。我再想想办法。', 'sad');
    }
    await c.leave();
  },

  async afeng_pawn(c) {
    await c.enter('afeng', 'nervous');
    await c.say('afeng', '掌柜……这个，能当多少？');
    await c.say('afeng', '是海生给的。他跟海燕号跑南洋，说十二那天船回来。家里要给弟弟交学堂的钱……');
    const ring = makeItem(c.S, 'afeng_ring');
    const r = await c.deal({ kind: 'pawn', item: ring, who: 'afeng', ask: 26, limit: 17, patience: 3, term: 5, persona: { dear: true } });
    if (r.ok) {
      if (r.price >= 22) { c.set('afengFair', true); c.rep(2); await c.say('afeng', '谢谢您！十二那天，我一定来赎。', 'happy'); }
      else await c.say('afeng', '……十二那天，我来赎。');
    } else {
      c.set('afengRefused', true);
      await c.say('afeng', '那、那我再去别处问问。', 'sad');
    }
    await c.leave();
  },

  async shouhou_case(c) {
    await c.enter('shouhou');
    await c.say('shouhou', '掌柜的，好东西——纯银的烟盒，祖传的。');
    await c.say('shouhou', '急着用钱，便宜给你。');
    const box = makeItem(c.S, 'zheng_case');
    const r = await c.deal({ kind: 'buy', item: box, who: 'shouhou', ask: 15, limit: 9, patience: 3, persona: { thief: true } });
    if (r.ok) {
      c.set('boughtCase', true);
      await c.say('shouhou', '爽快！', 'happy');
      await c.leave();
      if (box.f.includes('zheng')) await c.say('me', '祖传的？盖子上錾的可是个「郑」字。');
    } else {
      c.set('refusedCase', true);
      if (box.f.includes('zheng')) { c.rep(2); await c.say('shouhou', '嘿……眼尖。', 'nervous'); }
      else await c.say('shouhou', '不识货！', 'angry');
      await c.leave();
    }
  },

  async hong_watch(c) {
    await c.enter('hong');
    await c.say('nar', '进来的人一身酒气，灯塔看守的旧制服洗得发白。');
    await c.say('hong', '收……收表不？');
    await c.say('hong', '洋表，正经货。不当，卖。不赎了。');
    const watch = makeItem(c.S, 'hong_watch');
    const r = await c.deal({ kind: 'buy', item: watch, who: 'hong', ask: 24, limit: 14, patience: 3, persona: {} });
    if (r.ok) {
      c.set('hasWatch', true);
      await c.say('hong', '……别拿去修。就让它停着。');
    } else {
      await c.say('hong', '哼，不收拉倒。', 'angry');
    }
    await c.leave();
    if (r.ok) await c.say('me', '他的手一直在抖。');
  },

  async hu_jade(c) {
    await c.enter('hu', 'happy');
    await c.say('hu', '小掌柜，有缘！这一块是和田老玉，宫里出来的人手上收的。');
    await c.say('hu', '要不是赶船急用钱，我是舍不得的。');
    const jade = makeItem(c.S, 'hu_jade');
    const r = await c.deal({ kind: 'buy', item: jade, who: 'hu', ask: 38, limit: 16, patience: 4, persona: { scam: true } });
    if (r.ok) {
      c.set('boughtJade', true);
      if (r.price > 4) c.S.stats.scammed++;
      await c.say('hu', '好眼力，好眼力！', 'happy');
    } else if (jade.f.includes('bubble') || jade.f.includes('warm')) {
      c.rep(1);
      await c.say('hu', '……识货的。告辞。', 'nervous');
    } else {
      await c.say('hu', '可惜，可惜。', 'sad');
    }
    await c.leave();
  },

  async ma_check(c) {
    await c.enter('ma');
    await c.say('ma', '新掌柜，我姓马，这一片归我管。');
    const box = shopItem(c.S, 'zheng_case');
    if (box) {
      await c.say('ma', '郑家前几天报了案，丢了一只银烟盒。有人看见瘦猴往你这儿跑。');
      const k = await c.choose(['把烟盒交出来', '没见过']);
      if (k === 0) {
        c.drop(box); c.set('gaveCase', true); c.rep(-2);
        await c.say('ma', '收赃的事，下不为例。东西我拿回去。');
        if (box.f.includes('stub')) await c.say('me', '烟盒里那张存根，他没打开看。');
      } else {
        c.set('liedMa', true); c.rep(-2);
        await c.say('ma', '……行。我信你一回。', 'angry');
      }
    } else if (c.flag('refusedCase')) {
      c.rep(1);
      await c.say('ma', '听说瘦猴来过，你没收他的东西。好，像你外婆。', 'happy');
    }
    await c.say('ma', '望舒号？二十年前的事了。卷宗在海事公所，判得清清楚楚——船长喝醉了。');
    await c.say('me', '外公。');
    await c.leave();
  },

  async su_intro(c) {
    await c.enter('su');
    await c.say('su', '在下苏明远，镇上学堂教书，也给《澜湾小报》写点东西。');
    await c.say('su', '你外婆生前托过我一件事：查望舒号。她说，二十年了，该有人说句公道话。');
    await c.say('su', '这是当年海事公所的判词，我抄来的。');
    c.clue('su_story');
    await c.say('su', '判词上两个证人：守灯人洪某，郑记押货郑三。一个现在天天喝醉，一个现在是商行的三爷。');
    const k = await c.choose(['我留心。', '外婆为什么不自己查？']);
    if (k === 1) await c.say('su', '她查了二十年。病倒那天还在问我：十五的大潮，几点落到底。', 'sad');
    await c.say('su', '当铺嘛，镇上的东西早晚都要过一遍手。看到和望舒号有关的，记下来。');
    if (c.flag('hasWatch')) await c.say('su', '……洪伯把表卖给你了？他那块表，二十年没离过身。', 'nervous');
    const books = own(c.S, 'shop').filter(it => ['book', 'fan', 'seal'].includes(it.t));
    if (books.length) {
      await c.say('su', '对了，柜上那几样文房的东西，能让我挑挑吗？');
      await c.sell({ who: 'su', want: ['文玩'], persona: {} });
    }
    await c.leave();
  },

  async lin_redeem(c) {
    const pin = c.S.items.find(it => it.t === 'lin_pin' && it.own === 'pawn');
    await c.enter('lin', pin ? 'happy' : null);
    if (pin) {
      await c.say('lin', '药吃下去，烧退了。我来赎簪子。');
      const pay = c.redeem(pin);
      await c.say('nar', `林阿婆数出 ${pay} 块，把簪子插回了发髻。`);
    } else {
      await c.say('lin', '孙子的烧退了，借的是隔壁的钱。');
    }
    c.clue('lin_story');
    await c.say('lin', '你外公的船——望舒号——开船前拍过一张照。我那口子是大副。');
    const photo = makeItem(c.S, 'crew_photo');
    if (c.flag('linFair')) {
      await c.say('lin', '这张照片，你收着。你外婆照顾了我们家二十年。', 'happy');
      c.gain(photo);
      await c.show(photo, '照片上七个人站在船头。');
    } else {
      await c.say('lin', '……这照片，我留着也是看一回哭一回。你要想看看你外公，五块钱拿去。');
      const r = await c.deal({ kind: 'buy', item: photo, who: 'lin', ask: 5, limit: 5, patience: 2, persona: {} });
      if (!r.ok) { await c.say('lin', '那我收回去了。', 'sad'); await c.leave(); return; }
    }
    await c.say('lin', '那天三少爷本来也该在船上的。开船前，他说货单落在岸上，跳回去了。');
    await c.say('lin', '第二天，他就去公所作证，说许船长喝了酒。我不信。你外婆也不信。', 'sad');
    await c.leave();
  },

  async shitou_2(c) {
    const fair1 = c.flag('shitouFair');
    await c.enter('shitou', fair1 ? 'happy' : null);
    if (!hasItem(c.S, 'bottle_letter') && !c.S.clues.bottle_letter) {
      await c.say('shitou', '掌柜的！初九落潮我在黑礁边上捡的瓶子，封着蜡，里头好像有纸！');
      const b = makeItem(c.S, 'bottle_letter');
      const r = await c.deal({ kind: 'buy', item: b, who: 'shitou', ask: 2, limit: 1, patience: 3, persona: { naive: true } });
      if (r.ok && r.price >= 3) { c.set('shitouFair2', true); c.rep(2); await c.say('shitou', '嘿嘿！', 'happy'); }
    } else {
      await c.say('shitou', '掌柜的，今天滩上就捡着这个。');
      const coin = makeItem(c.S, 'cash', { force: c.flag('shitouFair') ? ['xianfeng'] : [] });
      const r = await c.deal({ kind: 'buy', item: coin, who: 'shitou', ask: 1, limit: 1, patience: 3, persona: { naive: true } });
      if (r.ok) fair(c, 'shitouFair2', r.price, coin, 2);
    }
    await c.leave();
  },

  async zheng_ledger(c) {
    await c.say('nar', '风裹着雨抽在门板上。今天没有船出海。');
    await c.enter('zheng');
    await c.say('zheng', '这雨下的。小掌柜，听说你这几天见了不少人——苏先生、老马、林家老太太。');
    await c.say('zheng', '我也不绕弯子。你外婆有本旧当簿，我念旧，想收着做个念想。');
    await c.say('zheng', '一百二十块，现钱。', 'happy');
    const k = await c.choose(['不卖。', '卖给他（得 120 元）']);
    if (k === 1) {
      c.set('ledgerSold', true); c.cash(120);
      await c.say('zheng', '识时务。', 'happy');
      await c.say('me', '当簿后面那几页，我还没来得及看。');
    } else {
      await c.say('zheng', '……那你可收好了。', 'angry');
    }
    await c.leave();
  },

  async afeng_redeem(c) {
    const ring = c.S.items.find(it => it.t === 'afeng_ring' && it.own === 'pawn');
    if (!ring) {
      if (!c.flag('afengRefused')) return;
      await c.enter('afeng', 'happy');
      await c.say('afeng', '海生回来了！那天的事……您别往心里去。');
      await c.leave();
      return;
    }
    await c.enter('haisheng', 'happy');
    await c.say('haisheng', '掌柜的，我是海生。阿凤的戒指，我来赎。');
    const pay = c.redeem(ring);
    await c.say('nar', `他把 ${pay} 块钱一枚一枚码在柜上，海风吹得发硬的手指头有点抖。`);
    if (c.flag('afengFair')) {
      c.set('wedding', true);
      await c.say('haisheng', '阿凤说，那天您给的钱够她弟弟交一学期。八月初八我们办酒，您一定来。', 'happy');
    }
    await c.say('haisheng', '对了，船进港的时候，我看见黑礁那边露出一截桅杆。二十年没见过潮落得那么低。');
    await c.leave();
  },

  async hong_return(c) {
    const watch = c.S.items.find(it => it.t === 'hong_watch');
    if (!watch) return;
    await c.enter('hong2');
    await c.say('nar', '洪伯刮了胡子，旧制服扣到了最上面一颗。');
    if (watch.own !== 'shop') {
      await c.say('hong2', '那块表……卖了？', 'sad');
      await c.say('hong2', '……也好。');
      await c.leave();
      await c.say('me', '他在门口站了很久，才走。');
      return;
    }
    await c.say('hong2', '那块表，还在吗？我想……再看看她。');
    const k = await c.choose(['把表还给他，不要钱', `按原价卖回给他（${watch.cost} 元）`, '不给']);
    if (k === 0) {
      c.drop(watch); c.rep(3); c.set('watchBack', true);
      await c.say('hong2', '……', 'sad');
      await c.say('hong2', '小荷十六岁，在城里念书，那天搭望舒号回家过节。');
      await c.say('hong2', '郑三给了我二百块，让我十一点半熄灯，熄半个钟头，他的船要摸黑进港。我想，半个钟头，出不了事。');
      await c.say('hong2', '望舒号提前回来了。我听见汽笛，往塔上跑，摔了一跤，表就停在那会儿。');
      await c.say('hong2', '许船长没喝酒。堂上那些话，是郑三教我说的。二十年了……我说出来了。', 'sad');
      c.clue('hong_confess_full');
    } else if (k === 1) {
      const pay = Math.min(watch.cost || 15, 15);
      c.drop(watch); c.cash(pay); c.set('watchSold', true);
      await c.say('hong2', `我只有 ${pay} 块……够不够？`);
      await c.say('hong2', '灯……是我灭的。', 'sad');
      c.clue('hong_confess');
    } else {
      await c.say('hong2', '……是我不配。', 'sad');
    }
    await c.leave();
  },

  async su_plan(c) {
    await c.enter('su');
    await c.say('su', '明天十五，今年最大的潮。黑礁那片滩会全露出来——二十年来头一回。');
    await c.say('su', '望舒号就沉在黑礁外头。要是船上的日志还在……');
    await c.say('su', '天一亮就得下滩。大潮退得快，涨得也快。');
    await c.say('su', '把你记下的东西给我看看。');
    await c.hints();
    await c.say('su', '明晚我叫上老马，到你铺子里来。');
    await c.leave();
  },

  async zheng_warn(c) {
    await c.enter('zheng');
    await c.say('zheng', `明天就十五了。钱凑得怎么样？${c.S.cash >= c.S.debt ? '' : '我看柜上可不太够。'}`);
    await c.say('zheng', '明早大潮，黑礁那边水急，别乱跑。淹死过人的。');
    await c.leave();
  },

  async zheng_final(c) {
    const log = c.S.items.find(it => it.t === 'logbook' && it.own === 'shop');
    if (!log) return;
    await c.enter('zheng');
    await c.say('zheng', '听说你今早下了黑礁，扛回来一只铁匣子。');
    await c.say('zheng', '明人不说暗话。匣子给我，欠条当场撕了，再给你五十块。', 'happy');
    await c.say('zheng', '你外婆跟我斗了二十年，斗到最后，借的还是我的钱。你想想。');
    const k = await c.choose(['不给。', '把铁匣给他']);
    if (k === 1) {
      c.drop(log); c.set('soldLog', true); c.S.debt = 0; c.cash(50);
      await c.say('zheng', '懂事。', 'happy');
    } else {
      await c.say('zheng', '那晚上见。', 'angry');
    }
    await c.leave();
  },
};
