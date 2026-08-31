// ══ 靈修冒險 core.js — 零 DOM 依賴的純邏輯（issue #6 漸進模組化）═══════════
//
// 這裡放的是「本來就純」的函式：只看參數（和 content.js 的五張內容表）算結果，
// 不碰 document、不碰 state、不碰 Firebase。好處：
//   · Node 能 require 進來測（test/core.test.js），遊戲規則終於有東西可被 import
//   · bible-game-v2.html 的 onclick 仍呼叫同名全域函式，玩家零感知
// 規則：需要 state 的邏輯請把 state 的那一塊（例如 state.completed）當參數傳進來，
//       HTML 端留一行薄包裝（例 getBookProgress(book) → bookProgress(book, state.completed)）。
// 內容表 BOOKS / CHAPTERS / SCHEDULE 是 content.js 宣告的全域（defer 載入），
// 這裡只在函式被呼叫時才讀，不在載入當下讀；Node 測試前先把表掛到 globalThis 即可。
//
// 部署：正本在 repo 根目錄（GitHub Pages 正式站直接讀根目錄），deploy.sh sync_public 會複製到 public/。
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;   // Node（測試）
  else Object.assign(root, api);                                             // 瀏覽器：掛成全域，名字與舊寫法相同
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── 章節 key ─────────────────────────────────────────────
  // 存檔 key：數字＝使徒行傳（ACT10），字串 key（ROM3 / COR1_2 / GAL5 …）原樣回傳
  function chapterKey(ch) {
    if (typeof ch === 'string') return ch;
    return `ACT${ch}`;
  }

  // 章節查表唯一入口（issue #3）：接受三種形態 10（數字）、'10'（字串化數字）、'ACT10' / 'ROM3'（存檔 key）。
  // 索引在第一次查詢時才建（content.js 是 defer 載入，core.js 載入當下 CHAPTERS 還不在）。
  let CHAPTERS_BY_KEY = null;
  function getChapter(ch) {
    if (!CHAPTERS_BY_KEY) {
      CHAPTERS_BY_KEY = new Map();
      CHAPTERS.forEach(c => {
        CHAPTERS_BY_KEY.set(String(c.chapter), c);      // 10 → '10'；'ROM3' → 'ROM3'
        CHAPTERS_BY_KEY.set(chapterKey(c.chapter), c);  // 10 → 'ACT10'（字串 key 兩者相同，覆寫無害）
      });
    }
    return CHAPTERS_BY_KEY.get(String(ch)) || null;
  }
  function resetChapterIndex() { CHAPTERS_BY_KEY = null; }  // 測試換表／內容熱更新時用

  // ── 日期與日曆 ────────────────────────────────────────────
  function dateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function calDateStr(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  function calWeekOfMonth(y, m, d) {
    return Math.floor((d + new Date(y, m, 1).getDay() - 1) / 7);
  }
  function calWeeksInMonth(y, m) {
    const days = new Date(y, m + 1, 0).getDate();
    const first = new Date(y, m, 1).getDay();
    return Math.ceil((days + first) / 7);
  }
  // 時段：morning 05–11、afternoon 12–17、evening 18–21、night 22–04
  function timeOfDay(h) {
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 18) return 'afternoon';
    if (h >= 18 && h < 22) return 'evening';
    return 'night';
  }
  function formatThreadTime(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ── 章節顯示名（讀 BOOKS 的 prefix / shortName / name）──────
  // 章節短標籤（日曆方格／列表用）— 例如「徒10」、「林前1」、「羅3」；加新書卷只要 BOOKS 有 prefix + shortName
  function chapterLabel(ch) {
    if (typeof ch === 'number') return `徒${ch}`;
    for (const book of BOOKS) {
      if (book.prefix && typeof ch === 'string' && ch.startsWith(book.prefix)) {
        return `${book.shortName}${ch.slice(book.prefix.length)}`;
      }
    }
    return ch;  // 找不到對應書卷時原樣回傳避免崩潰
  }
  // 章節完整中文（標題用）— 例如「使徒行傳 第10章」
  function chapterFull(ch) {
    if (typeof ch === 'number') return `使徒行傳 第${ch}章`;
    for (const book of BOOKS) {
      if (book.prefix && typeof ch === 'string' && ch.startsWith(book.prefix)) {
        return `${book.name} 第${ch.slice(book.prefix.length)}章`;
      }
    }
    return ch;
  }

  // 章節所屬書卷（BOOKS 反查）；數字／純數字字串＝使徒行傳；找不到回 null
  function bookOfChapter(ch) {
    const key = /^\d+$/.test(String(ch)) ? `ACT${ch}` : chapterKey(ch);
    return BOOKS.find(b => b.entries.some(en => chapterKey(en) === key)) || null;
  }

  // ── 排程（讀 SCHEDULE）─────────────────────────────────────
  function getScheduleChapters(date) {
    return SCHEDULE[date] || [];
  }
  // 反查章節所在的 SCHEDULE 日期；找不到回 null（譬如未排程的補讀章節）
  function findScheduleDate(ch) {
    return Object.keys(SCHEDULE).find(d => getScheduleChapters(d).some(c => c === ch)) || null;
  }
  // 是否補讀：章節排定日期 < today（'YYYY-MM-DD'）
  function isMakeupChapterOn(ch, today) {
    const key = chapterKey(ch);
    const scheduledDate = Object.keys(SCHEDULE).find(d =>
      (SCHEDULE[d] || []).some(c => chapterKey(c) === key)
    );
    return scheduledDate ? scheduledDate < today : false;
  }

  // ── 進度（completed ＝ state.completed，{ [chapterKey]: 'YYYY-MM-DD' }）──
  function isChapterDoneIn(ch, completed) {
    return !!(completed || {})[chapterKey(ch)];
  }
  function bookProgress(book, completed) {
    completed = completed || {};
    // mergedActive:false 的書卷（entries 已補滿、廢除 merged 倍數）：用 entries.length 當分母
    // 預設（mergedActive 未設定或 true）：保留舊邏輯 — entries × merged 倍數 vs totalChapters
    if (book.mergedActive === false) {
      const doneEntries = book.entries.filter(ch => completed[chapterKey(ch)]).length;
      return { done: doneEntries, total: book.entries.length, complete: doneEntries >= book.entries.length };
    }
    let doneChapters = 0;
    book.entries.forEach(ch => {
      if (completed[chapterKey(ch)]) doneChapters += ((book.merged && (book.merged[ch] || book.merged[String(ch)])) || 1);
    });
    return { done: doneChapters, total: book.totalChapters, complete: doneChapters >= book.totalChapters };
  }
  // 預設章節挑選：合併日優先挑「第一個未完成」，全完成則回第一個（重讀模式）
  function pickDefaultChapterFrom(chapters, completed) {
    if (!chapters || chapters.length === 0) return null;
    // v2.12 hotfix: 同 selectChapter 的型別寬鬆化處理
    const undone = chapters.find(c => !isChapterDoneIn(c, completed) && getChapter(c));
    if (undone) return undone;
    const firstAvail = chapters.find(c => getChapter(c));
    return firstAvail || null;
  }
  // 今日章節：今天排程有內容就挑；沒有就退回最近一個有內容的過去日期；再沒有就第一章
  function todayChapterFor(today, completed) {
    const todays = getScheduleChapters(today).filter(c => getChapter(c));
    const pick = pickDefaultChapterFrom(todays, completed);
    if (pick) return pick;
    const availableDates = Object.keys(SCHEDULE)
      .filter(d => d <= today && getScheduleChapters(d).some(c => getChapter(c)))
      .sort();
    if (availableDates.length > 0) {
      const lastChapters = getScheduleChapters(availableDates[availableDates.length - 1])
        .filter(c => getChapter(c));
      return pickDefaultChapterFrom(lastChapters, completed) || CHAPTERS[0].chapter;
    }
    return CHAPTERS[0].chapter;
  }

  // ── 稱號（PR ③b 2026-08-29）：綁「完走卷數」的絕對累計里程碑，不綁比例（內容會一直加）、不綁等級。
  //    稱號是第五個裝備部位（slot:'title'），解鎖後入袋、衣櫃可換；desc 經文皆過 CUNP1 逐字核對。
  //    終點 66 卷＝整本聖經（教會一年約 24 卷，約 2.5–3 年）。
  const TITLE_LADDER = [
    { books: 1,  emoji: '🥾', name: '啟程者',   desc: '「你要離開本地、本族、父家，往我所要指示你的地去。」', ref: '創 12:1' },
    { books: 3,  emoji: '🏕️', name: '客旅',     desc: '「承認自己在世上是客旅，是寄居的。」', ref: '來 11:13' },
    { books: 6,  emoji: '🤝', name: '同行者',   desc: '「耶穌親自就近他們，和他們同行」', ref: '路 24:15' },
    { books: 10, emoji: '📖', name: '門徒',     desc: '「你們若常常遵守我的道，就真是我的門徒」', ref: '約 8:31' },
    { books: 15, emoji: '🕊️', name: '見證人',   desc: '「直到地極，作我的見證。」', ref: '徒 1:8' },
    { books: 20, emoji: '✉️', name: '使者',     desc: '「所以，我們作基督的使者」', ref: '林後 5:20' },
    { books: 30, emoji: '🏰', name: '守望者',   desc: '「人子啊，我立你作以色列家守望的人」', ref: '結 3:17' },
    { books: 45, emoji: '🐑', name: '牧者',     desc: '「務要牧養在你們中間神的群羊」', ref: '彼前 5:2' },
    { books: 66, emoji: '📜', name: '走遍全書的人', desc: '「聖經都是神所默示的」', ref: '提後 3:16' },
  ];
  // 完走 n 卷應持有的稱號清單（累計、不歸零）
  function titlesForBooks(n) {
    return TITLE_LADDER.filter(t => t.books <= n).map(t => ({ ...t, slot: 'title', chapter: 'title' }));
  }
  // 從 prev 卷到 now 卷之間新解鎖的稱號（領獎畫面用）
  function titlesUnlockedBetween(prev, now) {
    return TITLE_LADDER.filter(t => t.books > prev && t.books <= now).map(t => ({ ...t, slot: 'title', chapter: 'title' }));
  }
  // 下一個里程碑（書卷頁「再 M 卷成為 X」）；已到頂回 null
  function nextTitle(n) {
    return TITLE_LADDER.find(t => t.books > n) || null;
  }

  // ── 完成一章的純計算（裝備／xp／升級／streak／合併日判定）────
  function resolveItem(itemData, gender) {
    if (!itemData) return null;
    if (itemData.default) return itemData[gender] || itemData.default;
    return itemData;
  }
  function computeCompletion({ data, chapter, hasBonus, gender, xp, level, completed, dayChapters, today }) {
    const newItem = { ...resolveItem(data.baseItem, gender), chapter };
    const bonusItem = hasBonus ? { ...resolveItem(data.bonusItem, gender), chapter } : null;
    // xp / 升級：有默想 +35、無 +20，封頂 100 即升級並回到 10
    let nextXp = Math.min(xp + (hasBonus ? 35 : 20), 100);
    let nextLevel = level;
    if (nextXp >= 100) { nextLevel++; nextXp = 10; }
    // streak：合併日同日內若已完成另一章，第二章不重複 +streak（今日仍算一次靈修）
    const sameDayOtherChapters = dayChapters.filter(c => c !== chapter);
    const sameDayAlreadyDoneToday = sameDayOtherChapters.some(c => completed[chapterKey(c)] === today);
    // 合併日完成第二章判定：本章 + 同日其他章全完成 + 該日章數 >= 2
    const completedAfter = { ...completed, [chapterKey(chapter)]: today };
    const isMergedDayAllDone = dayChapters.length >= 2
      && dayChapters.every(c => completedAfter[chapterKey(c)]);
    return {
      newItem, bonusItem,
      xp: nextXp, level: nextLevel,
      streakInc: sameDayAlreadyDoneToday ? 0 : 1,
      completedKey: chapterKey(chapter),
      isMergedDayAllDone,
    };
  }

  // ── 累積靈修天數（2026-08-27 PR ①：🔥「連續」→「累積」）──────
  // 口徑：completed 各章記錄的完成日期去重後的天數；合併日兩章同日只算 1 天。
  // 不因 streak 中斷歸零（ADR 0001 視覺成長三原則：累計成就不歸零）。
  function totalDevotionDays(completed) {
    const seen = new Set();
    Object.values(completed || {}).forEach(d => { if (/^\d{4}-\d{2}-\d{2}$/.test(d)) seen.add(d); });
    return seen.size;
  }

  // ── 身上裝備的經文（AI 看裝備，2026-08-27 PR ①）───────────────
  // 回傳目前穿戴四件裝備的 desc 經文字串（去重、去空、最多 4 句），只給經文不給名稱／emoji。
  // 穿戴狀態存的是 emoji（hat/body/item/bg），從背包 items 反查同 slot 同 emoji 的物件。
  function equippedVerses({ hat, body, item, bg, title, items }) {
    const worn = { hat, body, hand: item, bg, title };
    const out = [];
    (items || []).forEach(it => {
      if (!it || !it.desc) return;
      const wornVal = it.slot === 'title' ? it.name : it.emoji;   // 稱號以名稱比對（emoji 可能重複）
      if (worn[it.slot] !== wornVal) return;
      const d = String(it.desc).trim();
      if (d && !out.includes(d)) out.push(d);
    });
    return out.slice(0, 4);
  }

  // ── 字串 ────────────────────────────────────────────────
  function escapeHtmlMyMsg(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return {
    chapterKey, getChapter, resetChapterIndex,
    dateStr, calDateStr, calWeekOfMonth, calWeeksInMonth, timeOfDay, formatThreadTime,
    chapterLabel, chapterFull, bookOfChapter,
    getScheduleChapters, findScheduleDate, isMakeupChapterOn,
    isChapterDoneIn, bookProgress, pickDefaultChapterFrom, todayChapterFor,
    TITLE_LADDER, titlesForBooks, titlesUnlockedBetween, nextTitle, resolveItem, computeCompletion, escapeHtmlMyMsg,
    totalDevotionDays, equippedVerses,
  };
});
