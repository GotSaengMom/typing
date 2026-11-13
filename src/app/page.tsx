import React, { useCallback, useEffect, useRef, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type RefObject } from "react";

/* ================= 타입 및 다국어 데이터 ================= */
type Lang = "en" | "ko";
type Mode = "word" | "sentence" | "venice";
type Screen = "menu" | Mode;
type SfxName = "정타" | "오타" | "파괴" | "물" | "용암" | "번개" | "황금" | "게임오버";
type PlayFn = (n: SfxName) => void;
type Stats = { total: number; wrong: number; committed: number };
type HallEntry = { name: string; lang: Lang; wpm: number; cpm: number; acc: number; date: string };
type GameCfg = { name: string; lang: Lang };
type ModeProps = { cfg: GameCfg; play: PlayFn; onExit: () => void; onRestart: () => void };

const PLAYERS = ["Tei", "Sia", "friend"] as const;
type Player = (typeof PLAYERS)[number];
const LANG_LABEL: Record<Lang, string> = { en: "🇺🇸 English", ko: "🇰🇷 한국어" };

// [2. Full UI Localization] 모든 UI 텍스트를 선택한 언어(en / ko)에 맞게 변환
const I18N = {
  en: {
    appTitle: "🎈 Kids Typing Arcade 🎮",
    soundOn: "🔊 Sound ON",
    soundOff: "🔇 Sound OFF",
    step1: "1. Choose Player 🧒",
    step2: "2. Choose Language 🌐",
    step3: "3. Select Game Mode 🚀 (Click to Start!)",
    friendBtn: "Friend (Custom) ✏️",
    friendPlaceholder: "Enter name (Default: Friend)",
    defaultFriend: "Friend",
    modes: {
      word: { label: "🍎 Word Practice", desc: "Type 10 fun words one by one!" },
      sentence: { label: "📝 Sentence Speed", desc: "Type a sentence and rank on the leaderboard!" },
      venice: { label: "🌋 Extreme Venezia", desc: "Defend the sea and volcano from falling words!" },
    },
    backToMain: "🏠 Main Menu",
    playAgain: "🔄 Play Again",
    wordComplete: "🎉 Word Practice Clear! 🎉",
    sentenceComplete: "🏅 Sentence Clear! 🏅",
    accuracy: "🎯 Accuracy",
    timeTaken: "⏱️ Time",
    firstCharHint: "✨ Timer starts as soon as you type the first letter!",
    hallTitle: (n: number) => `🏆 Hall of Fame Top ${n} (English)`,
    noRecords: "🌱 No records yet! Be the first hero!",
    veniceInputPlaceholder: "Type the word and press Enter! ⏎",
    gameOver: "💀 GAME OVER 💀",
    score: "⭐ Score",
    level: "Lv.",
    slow: "🐢 Slow",
    storm: "⚡ Storm x2",
    stageWater: (lv: number) => (lv >= 5 ? `🦈 Deep Shark Sea (Lv.${lv})` : `🐠 Coral Ocean (Lv.${lv})`),
    stageVolcano: (lv: number) => (lv >= 6 ? `☄️ Cataclysm Volcano (Lv.${lv})` : `🌋 Magma Caverns (Lv.${lv})`),
    surgeAlert: "⚠️ DANGER SURGE! FLOOR RISING!",
    multiHit: (n: number) => `🔥 ${n}x MULTI COMBO!`,
  },
  ko: {
    appTitle: "🎈 키즈 타자 아케이드 🎮",
    soundOn: "🔊 소리 켜짐",
    soundOff: "🔇 소리 꺼짐",
    step1: "1. 플레이어 선택 🧒",
    step2: "2. 언어 선택 🌐",
    step3: "3. 게임 모드 선택 🚀 (누르면 바로 시작!)",
    friendBtn: "친구 (직접입력) ✏️",
    friendPlaceholder: "이름 입력 (비우면 '친구')",
    defaultFriend: "친구",
    modes: {
      word: { label: "🍎 단어 연습", desc: "재미있는 초등 어휘 10개를 차례대로 쳐요!" },
      sentence: { label: "📝 속담 & 명언 연습", desc: "교훈이 담긴 문장으로 속도를 재고 랭킹에 도전해요!" },
      venice: { label: "🌋 익스트림 베네치아", desc: "바다와 화산으로 떨어지는 단어를 막아내요!" },
    },
    backToMain: "🏠 메인으로",
    playAgain: "🔄 다시 하기",
    wordComplete: "🎉 단어 연습 완료! 🎉",
    sentenceComplete: "🏅 문장 연습 완료! 🏅",
    accuracy: "🎯 정확도",
    timeTaken: "⏱️ 소요 시간",
    firstCharHint: "✨ 첫 글자를 치면 타이머가 시작돼요!",
    hallTitle: (n: number) => `🏆 명예의 전당 Top ${n} (한국어)`,
    noRecords: "🌱 아직 기록이 없어요! 첫 주인공이 되어보세요!",
    veniceInputPlaceholder: "단어를 입력하고 Enter를 누르세요! (동일 단어 동시 파괴!) ⏎",
    gameOver: "💀 게임 오버 💀",
    score: "⭐ 점수",
    level: "Lv.",
    slow: "🐢 슬로우",
    storm: "⚡ 번개 폭풍 x2",
    stageWater: (lv: number) => (lv >= 5 ? `🦈 심해 상어 해역 (Lv.${lv})` : `🐠 산호초 바다 (Lv.${lv})`),
    stageVolcano: (lv: number) => (lv >= 6 ? `☄️ 대분화 활화산 (Lv.${lv})` : `🌋 마그마 협곡 (Lv.${lv})`),
    surgeAlert: "⚠️ 위험! 수위가 급격히 차오릅니다!",
    multiHit: (n: number) => `🔥 ${n}연속 동시 파괴 보너스!`,
  },
} as const;

// [1. Rich Educational Database Expansion] 초등 1~6학년 어휘 대폭 확장 및 속담/어린왕자 명언 적용
const WORDS: Record<Lang, string[]> = {
  en: [
    "planet", "prince", "flower", "sunset", "desert", "wonder", "friend", "secret", "gentle", "spirit",
    "voyage", "forest", "island", "castle", "dragon", "knight", "wizard", "galaxy", "comet", "meteor",
    "rocket", "compass", "lantern", "whisper", "harmony", "courage", "wisdom", "justice", "promise", "miracle",
    "sunrise", "rainbow", "thunder", "glacier", "volcano", "canyon", "meadow", "blossom", "harvest", "breeze",
    "dolphin", "penguin", "cheetah", "giraffe", "peacock", "octopus", "butterfly", "firefly", "sparrow", "squirrel",
    "science", "history", "library", "museum", "concert", "painting", "sculpture", "melody", "rhythm", "poetry",
    "baobab", "asteroid", "fox", "rose", "crown", "stars", "pilot", "drawing", "sheep", "well",
  ],
  ko: [
    // 초등 1~2학년 기초 어휘
    "무지개", "민들레", "해바라기", "다람쥐", "부엉이", "돌고래", "카멜레온", "장수풍뎅이", "잠자리", "개구리",
    "비눗방울", "솜사탕", "회전목마", "도서관", "박물관", "식물원", "수족관", "천문대", "운동회", "학예회",
    "색종이", "크레파스", "물감", "스케치북", "줄넘기", "자전거", "킥보드", "실로폰", "탬버린", "피아노",
    // 초등 3~4학년 교과 어휘
    "나침반", "현미경", "망원경", "온도계", "자석", "화석", "지층", "화산", "지진", "생태계",
    "광합성", "증산작용", "먹이사슬", "환경보호", "재활용", "발명품", "문화재", "전통문화", "한글날", "거북선",
    "독립문", "태극기", "무궁화", "고구려", "백제", "신라", "훈민정음", "측우기", "해시계", "자격루",
    // 초등 5~6학년 심화/가치 어휘
    "민주주의", "인권존중", "평화통일", "지구온난화", "신재생에너지", "인공지능", "우주정거장", "인공위성", "은하수", "태양계",
    "협동심", "배려심", "책임감", "정직함", "성실함", "창의력", "상상력", "호기심", "도전정신", "우정",
  ],
};

const SENTENCES: Record<Lang, string[]> = {
  en: [
    "What is essential is invisible to the eye.",
    "It is only with the heart that one can see rightly.",
    "You become responsible forever for what you have tamed.",
    "It is the time you have wasted for your rose that makes your rose so important.",
    "All grown-ups were once children, bit few of them remember it.",
    "The stars are beautiful because of a flower that cannot be seen.",
    "What makes the desert beautiful is that somewhere it hides a well.",
    "Words are the source of misunderstandings.",
    "One runs the risk of weeping a little, if one lets himself be tamed.",
    "Wait for me for a little while under the golden stars.",
    "If you love a flower that lives on a star, it is sweet to look at the sky at night.",
    "Straight ahead of him, nobody can go very far.",
    "It is much more difficult to judge oneself than to judge others.",
    "Eyes are blind. One must look with the heart.",
    "Only the children know what they are looking for.",
    "Where are the people? It is a little lonely in the desert.",
    "It is also lonely among men, the snake said.",
    "To me, you will be unique in all the world.",
    "No one is ever satisfied where he is.",
    "Walk slowly towards a fountain of fresh water.",
  ],
  ko: [
    "가는 말이 고와야 오는 말이 곱다.",
    "천 리 길도 한 걸음부터 시작된다.",
    "낮말은 새가 듣고 밤말은 쥐가 듣는다.",
    "백지장도 맞들면 훨씬 낫다.",
    "벼는 익을수록 고개를 숙인다.",
    "티끌 모아 태산이 된다.",
    "세 살 버릇이 여든까지 간다.",
    "원숭이도 나무에서 떨어질 때가 있다.",
    "우물 안 개구리는 넓은 바다를 모른다.",
    "구슬이 서 말이라도 꿰어야 보배다.",
    "돌다리도 두들겨 보고 건너라.",
    "바늘 도둑이 소도둑 된다.",
    "발 없는 말이 천 리를 간다.",
    "소 잃고 외양간 고친다.",
    "시작이 반이라는 말이 있다.",
    "작은 고추가 더 맵다.",
    "하늘은 스스로 돕는 자를 돕는다.",
    "호랑이에게 물려가도 정신만 차리면 산다.",
    "콩 심은 데 콩 나고 팥 심은 데 팥 난다.",
    "고생 끝에 낙이 온다.",
  ],
};

const LONG_WORDS: Record<Lang, string[]> = {
  en: WORDS.en.filter((w) => w.length >= 7),
  ko: WORDS.ko.filter((w) => w.length >= 4),
};

const WORD_COUNT = 10;
const HALL_KEY = "kidtype-hall-of-fame-v1";
const HALL_SIZE = 5;
const HEARTS_MAX = 5;

// [3. Dramatic Rising Floor Physics] 5=10%, 4=30%, 3=50%, 2=70%, 1=85%, 0=100%
const FLOOR_HEIGHT_BY_HEARTS: Record<number, number> = {
  5: 10,
  4: 30,
  3: 50,
  2: 70,
  1: 85,
  0: 100,
};
const getFloorHeight = (hearts: number) => FLOOR_HEIGHT_BY_HEARTS[Math.max(0, Math.min(5, hearts))] ?? 10;
const getFloorSurfaceY = (hearts: number) => 100 - getFloorHeight(hearts);

// [1. Kids-Friendly UI/UX] 3D 젤리 버튼 스타일
const JELLY_BASE = "rounded-3xl px-6 py-3.5 text-xl font-black transition-all duration-150 transform hover:-translate-y-1 active:translate-y-1.5 disabled:opacity-50 select-none cursor-pointer";
const JELLY_WHITE = `${JELLY_BASE} bg-white text-slate-700 border-2 border-slate-200 shadow-[0_6px_0_#cbd5e1,0_10px_15px_rgba(0,0,0,0.08)] active:shadow-[0_0px_0_#cbd5e1]`;
const JELLY_BLUE = `${JELLY_BASE} bg-gradient-to-b from-sky-400 to-blue-500 text-white border-2 border-sky-300 shadow-[0_6px_0_#0284c7,0_10px_15px_rgba(2,132,199,0.3)] active:shadow-[0_0px_0_#0284c7]`;
const JELLY_GREEN = `${JELLY_BASE} bg-gradient-to-b from-emerald-400 to-green-500 text-white border-2 border-emerald-300 shadow-[0_6px_0_#15803d,0_10px_15px_rgba(21,128,61,0.3)] active:shadow-[0_0px_0_#15803d]`;
const JELLY_PINK = `${JELLY_BASE} bg-gradient-to-b from-pink-400 to-rose-500 text-white border-2 border-pink-300 shadow-[0_6px_0_#be123c,0_10px_15px_rgba(190,18,60,0.3)] active:shadow-[0_0px_0_#be123c]`;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Jua&family=Fredoka:wght@600;700&display=swap');

.kt-font {
  font-family: 'Fredoka', 'Jua', sans-serif;
}

@keyframes kt-shake {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  15% { transform: translate(-12px, 6px) rotate(-1.5deg); }
  30% { transform: translate(12px, -6px) rotate(1.5deg); }
  45% { transform: translate(-10px, -4px) rotate(-1deg); }
  60% { transform: translate(10px, 4px) rotate(1deg); }
  75% { transform: translate(-6px, 2px) rotate(-0.5deg); }
}
.kt-shake { animation: kt-shake 0.55s ease-in-out; }

@keyframes kt-shake-violent {
  0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  10% { transform: translate(-22px, 12px) rotate(-3deg) scale(1.02); }
  25% { transform: translate(22px, -14px) rotate(3deg) scale(0.99); }
  40% { transform: translate(-18px, -10px) rotate(-2.5deg) scale(1.01); }
  55% { transform: translate(18px, 10px) rotate(2.5deg); }
  70% { transform: translate(-12px, 6px) rotate(-1.5deg); }
  85% { transform: translate(10px, -6px) rotate(1deg); }
}
.kt-shake-violent { animation: kt-shake-violent 0.7s cubic-bezier(0.36, 0.07, 0.19, 0.97); }

/* [3. Dramatic Rising Floor Surge Animation] 수위가 솟구칠 때 강렬하게 출렁이는 서지 효과 */
@keyframes kt-floor-surge {
  0% { transform: scaleY(1); filter: brightness(1); }
  35% { transform: scaleY(1.14) translateY(-10px); filter: brightness(1.45) saturate(1.4); }
  65% { transform: scaleY(0.96) translateY(3px); filter: brightness(1.15); }
  100% { transform: scaleY(1) translateY(0); filter: brightness(1); }
}
.kt-floor-surge {
  animation: kt-floor-surge 0.65s cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: bottom center;
}

@keyframes kt-flash { from { opacity: 0.85; } to { opacity: 0; } }
.kt-flash { animation: kt-flash 0.35s ease-out forwards; }

.kt-fx { position: absolute; transform: translate(-50%, -50%); pointer-events: none; z-index: 25; }

/* 단어 정답 팝 효과 */
@keyframes kt-pop {
  0% { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
  60% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.9; }
  100% { transform: translate(-50%, -50%) scale(2.1); opacity: 0; }
}
.kt-pop { animation: kt-pop 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

/* 바다 물보라 & 물방울 파편 애니메이션 */
@keyframes kt-splash-core {
  0% { transform: translate(-50%, -20%) scale(0.3); opacity: 1; }
  45% { transform: translate(-50%, -95%) scale(1.4); opacity: 1; }
  100% { transform: translate(-50%, -140%) scale(1.9); opacity: 0; }
}
.kt-splash { animation: kt-splash-core 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

@keyframes kt-droplet-l {
  0% { transform: translate(0, 0) scale(0.5); opacity: 1; }
  50% { transform: translate(-55px, -75px) scale(1.3) rotate(-25deg); opacity: 1; }
  100% { transform: translate(-90px, 25px) scale(0.4) rotate(-45deg); opacity: 0; }
}
@keyframes kt-droplet-r {
  0% { transform: translate(0, 0) scale(0.5); opacity: 1; }
  50% { transform: translate(55px, -75px) scale(1.3) rotate(25deg); opacity: 1; }
  100% { transform: translate(90px, 25px) scale(0.4) rotate(45deg); opacity: 0; }
}
@keyframes kt-droplet-c {
  0% { transform: translate(0, 0) scale(0.6); opacity: 1; }
  50% { transform: translate(0, -100px) scale(1.45); opacity: 1; }
  100% { transform: translate(0, -10px) scale(0.3); opacity: 0; }
}
.kt-drop-l { animation: kt-droplet-l 0.65s ease-out forwards; }
.kt-drop-r { animation: kt-droplet-r 0.65s ease-out forwards; }
.kt-drop-c { animation: kt-droplet-c 0.65s ease-out forwards; }

/* 화산 스테이지 용암 폭발 & 화염 파편 애니메이션 */
@keyframes kt-explode {
  0% { transform: translate(-50%, -20%) scale(0.3) rotate(0deg); opacity: 1; }
  40% { transform: translate(-50%, -90%) scale(1.75) rotate(10deg); opacity: 1; }
  100% { transform: translate(-50%, -155%) scale(2.5) rotate(-10deg); opacity: 0; }
}
.kt-explode { animation: kt-explode 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

/* 연속으로 물결치는 파도 및 부글거리는 용암 CSS 애니메이션 */
@keyframes kt-wave-move {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes kt-wave-bob {
  0%, 100% { transform: translateY(0px) scaleY(1); }
  50% { transform: translateY(5px) scaleY(1.12); }
}
.kt-wave-slow { animation: kt-wave-move 6.5s linear infinite; }
.kt-wave-fast { animation: kt-wave-move 3.8s linear infinite reverse; }
.kt-wave-bob { animation: kt-wave-bob 2.2s ease-in-out infinite; }

@keyframes kt-lava-pulse {
  0%, 100% { filter: brightness(1) saturate(1); }
  50% { filter: brightness(1.28) saturate(1.35); }
}
.kt-lava-pulse { animation: kt-lava-pulse 1.5s ease-in-out infinite; }

@keyframes kt-bubble-rise {
  0% { transform: translateY(100%) scale(0.4); opacity: 0; }
  30% { opacity: 0.9; }
  80% { opacity: 0.9; }
  100% { transform: translateY(-180%) scale(1.45); opacity: 0; }
}
.kt-bubble-1 { animation: kt-bubble-rise 2.4s ease-in infinite; }
.kt-bubble-2 { animation: kt-bubble-rise 3.1s ease-in 0.7s infinite; }
.kt-bubble-3 { animation: kt-bubble-rise 2.0s ease-in 1.3s infinite; }
.kt-bubble-4 { animation: kt-bubble-rise 2.8s ease-in 0.3s infinite; }

/* [4. Ocean & Volcano Background Entities] 물고기/상어 유영 및 화산 불티/잿더미 애니메이션 */
@keyframes kt-swim-right {
  0% { transform: translateX(-15vw) translateY(0px) scaleX(-1); }
  25% { transform: translateX(20vw) translateY(-12px) scaleX(-1); }
  50% { transform: translateX(55vw) translateY(10px) scaleX(-1); }
  75% { transform: translateX(85vw) translateY(-8px) scaleX(-1); }
  100% { transform: translateX(115vw) translateY(0px) scaleX(-1); }
}
@keyframes kt-swim-left {
  0% { transform: translateX(115vw) translateY(0px) scaleX(1); }
  25% { transform: translateX(80vw) translateY(14px) scaleX(1); }
  50% { transform: translateX(45vw) translateY(-10px) scaleX(1); }
  75% { transform: translateX(15vw) translateY(8px) scaleX(1); }
  100% { transform: translateX(-15vw) translateY(0px) scaleX(1); }
}
.kt-swim-r-1 { animation: kt-swim-right 14s linear infinite; }
.kt-swim-r-2 { animation: kt-swim-right 18s linear 4s infinite; }
.kt-swim-l-1 { animation: kt-swim-left 16s linear 2s infinite; }
.kt-swim-l-2 { animation: kt-swim-left 12s linear 7s infinite; }
.kt-shark-r { animation: kt-swim-right 11s ease-in-out infinite; }
.kt-shark-l { animation: kt-swim-left 13s ease-in-out 3s infinite; }

@keyframes kt-ember-float {
  0% { transform: translateY(20px) translateX(0px) scale(0.6) rotate(0deg); opacity: 0; }
  20% { opacity: 0.95; }
  80% { opacity: 0.85; }
  100% { transform: translateY(-360px) translateX(45px) scale(1.3) rotate(180deg); opacity: 0; }
}
.kt-ember-1 { animation: kt-ember-float 3.2s ease-out infinite; }
.kt-ember-2 { animation: kt-ember-float 2.6s ease-out 0.9s infinite; }
.kt-ember-3 { animation: kt-ember-float 3.8s ease-out 1.7s infinite; }
.kt-ember-4 { animation: kt-ember-float 2.2s ease-out 0.4s infinite; }
.kt-ember-5 { animation: kt-ember-float 2.9s ease-out 1.2s infinite; }

@keyframes kt-ash-drift {
  0%, 100% { transform: translateX(-15px) translateY(0px); }
  50% { transform: translateX(20px) translateY(8px); }
}
.kt-ash { animation: kt-ash-drift 6s ease-in-out infinite; }
`;

/* ================= 유틸 ================= */
const newStats = (): Stats => ({ total: 0, wrong: 0, committed: 0 });
const accOf = (st: Stats) => (st.total === 0 ? 100 : Math.round(((st.total - st.wrong) / st.total) * 100));

function ingest(v: string, target: string, st: Stats) {
  if (v.length < st.committed) st.committed = v.length;
  for (let i = st.committed; i < v.length; i++) {
    st.total++;
    if (v[i] !== target[i]) st.wrong++;
  }
  st.committed = v.length;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function loadHall(): HallEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HALL_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/* ================= 효과음 (Web Audio) ================= */
function tone(ctx: AudioContext, type: OscillatorType, from: number, to: number, start: number, dur: number, vol: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), start + dur);
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function playSfx(ctx: AudioContext, name: SfxName) {
  const t = ctx.currentTime;
  switch (name) {
    case "정타":
      tone(ctx, "sine", 880, 1320, t, 0.12, 0.25);
      break;
    case "오타":
      tone(ctx, "square", 180, 120, t, 0.2, 0.12);
      break;
    case "파괴":
      tone(ctx, "sawtooth", 260, 40, t, 0.4, 0.25);
      tone(ctx, "square", 120, 30, t, 0.4, 0.1);
      break;
    case "물":
      tone(ctx, "sine", 350, 700, t, 0.25, 0.2);
      tone(ctx, "sine", 700, 300, t + 0.12, 0.25, 0.12);
      break;
    case "용암":
      tone(ctx, "sawtooth", 120, 30, t, 0.7, 0.3);
      tone(ctx, "square", 60, 25, t, 0.6, 0.15);
      break;
    case "번개":
      tone(ctx, "square", 1400, 80, t, 0.35, 0.15);
      tone(ctx, "sawtooth", 900, 60, t + 0.08, 0.3, 0.1);
      break;
    case "황금":
      [660, 880, 1320].forEach((f, i) => tone(ctx, "sine", f, f * 1.01, t + i * 0.09, 0.18, 0.2));
      break;
    case "게임오버":
      tone(ctx, "triangle", 400, 90, t, 1.0, 0.3);
      break;
  }
}

/* ================= 공통 UI ================= */
function TypeInput({
  inputRef,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { inputRef: RefObject<HTMLInputElement | null> }) {
  return (
    <input
      ref={inputRef}
      autoFocus
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      onBlur={() => setTimeout(() => inputRef.current?.focus(), 0)}
      className="w-full max-w-xl rounded-full border-4 border-sky-400 bg-white px-6 py-4 text-center text-3xl sm:text-4xl font-black text-slate-800 placeholder-slate-300 shadow-[0_8px_0_#38bdf8,0_15px_20px_rgba(0,0,0,0.1)] outline-none transition-all focus:border-pink-400 focus:shadow-[0_8px_0_#f472b6,0_15px_25px_rgba(244,114,182,0.25)] focus:scale-[1.02]"
      {...rest}
    />
  );
}

function CharLine({ target, value, size }: { target: string; value: string; size: string }) {
  return (
    <p className={`break-keep text-center font-black leading-relaxed tracking-wide ${size}`}>
      {target.split("").map((ch, i) => {
        const typed = value[i];
        const cls =
          typed === undefined
            ? "text-slate-300"
            : typed === ch
              ? "text-emerald-500 drop-shadow-[0_2px_0_rgba(16,185,129,0.2)]"
              : "text-rose-500 underline decoration-wavy";
        return (
          <span key={i} className={cls}>
            {ch}
          </span>
        );
      })}
      {value.length > target.length && <span className="text-rose-500">{value.slice(target.length)}</span>}
    </p>
  );
}

function GameShell({
  label,
  backLabel,
  onExit,
  children,
}: {
  label: string;
  backLabel: string;
  onExit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6">
      <div className="flex w-full items-center justify-between gap-2">
        <button className={`${JELLY_WHITE} !px-5 !py-2.5 !text-lg`} onClick={onExit}>
          {backLabel}
        </button>
        <span className="rounded-full border-4 border-white bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 text-lg sm:text-xl font-black text-white shadow-md">
          {label}
        </span>
      </div>
      {children}
    </section>
  );
}

function ResultCard({
  title,
  rows,
  lang,
  onRestart,
  onExit,
  children,
}: {
  title: string;
  rows: [string, string][];
  lang: Lang;
  onRestart: () => void;
  onExit: () => void;
  children?: ReactNode;
}) {
  const t = I18N[lang];
  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6 rounded-[2rem] border-4 border-amber-300 bg-white/95 p-8 shadow-[0_12px_0_#fcd34d,0_20px_30px_rgba(0,0,0,0.12)]">
      <h2 className="text-3xl sm:text-4xl font-black text-indigo-600 drop-shadow-sm">{title}</h2>
      <div className="grid w-full max-w-md gap-3 rounded-3xl bg-sky-50 p-5 border-2 border-sky-100 text-center">
        {rows.map(([k, v]) => (
          <p key={k} className="flex items-center justify-between px-4 text-2xl">
            <span className="font-bold text-slate-600">{k}</span>
            <span className="text-3xl font-black text-indigo-600">{v}</span>
          </p>
        ))}
      </div>
      {children}
      <div className="flex flex-wrap justify-center gap-4 pt-2">
        <button className={JELLY_GREEN} onClick={onRestart}>
          {t.playAgain}
        </button>
        <button className={JELLY_WHITE} onClick={onExit}>
          {t.backToMain}
        </button>
      </div>
    </div>
  );
}

function HallBoard({ lang, hall }: { lang: Lang; hall: HallEntry[] }) {
  const t = I18N[lang];
  const top = hall
    .filter((h) => h.lang === lang)
    .sort((a, b) => b.wpm - a.wpm)
    .slice(0, HALL_SIZE);
  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
  return (
    <div className="w-full rounded-3xl border-4 border-amber-200 bg-gradient-to-b from-amber-50 to-orange-50 p-5 shadow-inner">
      <h3 className="mb-3 text-center text-2xl font-black text-amber-800">{t.hallTitle(HALL_SIZE)}</h3>
      {top.length === 0 ? (
        <p className="py-4 text-center text-lg font-bold text-slate-400">{t.noRecords}</p>
      ) : (
        <ol className="grid gap-2.5 text-xl">
          {top.map((h, i) => (
            <li
              key={`${h.date}-${i}`}
              className="flex items-center justify-between rounded-2xl border-2 border-amber-100 bg-white px-4 py-2.5 shadow-sm"
            >
              <span className="font-black text-slate-700">
                {medals[i] ?? `${i + 1}.`} {h.name}
              </span>
              <span className="font-bold text-indigo-600">
                ⚡ {h.wpm} WPM{h.lang === "ko" ? ` · ${h.cpm} CPM` : ""} · 🎯 {h.acc}%
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ================= 모드 1: 단어 연습 ================= */
function WordMode({ cfg, play, onExit, onRestart }: ModeProps) {
  const t = I18N[cfg.lang];
  const [targets] = useState(() => shuffle(WORDS[cfg.lang]).slice(0, WORD_COUNT));
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<{ acc: number; secs: number } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const statsRef = useRef<Stats>(newStats());
  const startRef = useRef<number | null>(null);
  const target = targets[idx];

  const feed = (v: string, composing: boolean) => {
    if (result) return;
    const st = statsRef.current;
    if (startRef.current === null && v) startRef.current = performance.now();
    const wrongBefore = st.wrong;
    ingest(composing ? v.slice(0, -1) : v, target, st);
    if (st.wrong > wrongBefore) play("오타");
    if (!composing && v === target) {
      play("정타");
      if (idx + 1 >= WORD_COUNT) {
        const ms = performance.now() - (startRef.current ?? performance.now());
        setResult({ acc: accOf(st), secs: ms / 1000 });
      } else {
        st.committed = 0;
        setIdx(idx + 1);
      }
      setValue("");
      return;
    }
    setValue(v);
  };

  if (result) {
    const unit = cfg.lang === "ko" ? "초" : "s";
    const rows: [string, string][] = [
      [t.accuracy, `${result.acc}%`],
      [t.timeTaken, `${result.secs.toFixed(1)}${unit}`],
    ];
    return <ResultCard title={t.wordComplete} rows={rows} lang={cfg.lang} onRestart={onRestart} onExit={onExit} />;
  }

  return (
    <GameShell
      label={`${t.modes.word.label} · ${idx + 1} / ${WORD_COUNT}`}
      backLabel={t.backToMain}
      onExit={onExit}
    >
      <div className="flex w-full flex-col items-center gap-4 rounded-[2rem] border-4 border-sky-200 bg-white p-10 shadow-[0_10px_0_#bae6fd,0_15px_25px_rgba(0,0,0,0.08)]">
        <div className="flex gap-1.5">
          {targets.map((_, i) => (
            <span
              key={i}
              className={`h-3.5 w-6 rounded-full transition-all ${
                i < idx ? "bg-emerald-400" : i === idx ? "bg-sky-400 scale-125" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
        <CharLine target={target} value={value} size="text-6xl sm:text-7xl py-4" />
      </div>
      <TypeInput
        inputRef={inputRef}
        value={value}
        onChange={(e: any) => feed(e.target.value, Boolean(e.nativeEvent.isComposing))}
        onCompositionEnd={(e: any) => feed(e.currentTarget.value, false)}
      />
    </GameShell>
  );
}

/* ================= 모드 2: 문장 연습 ================= */
type SentenceResult = { wpm: number; cpm: number; acc: number; secs: number };

function SentenceMode({
  cfg,
  play,
  hall,
  onSave,
  onExit,
  onRestart,
}: ModeProps & { hall: HallEntry[]; onSave: (e: HallEntry) => void }) {
  const t = I18N[cfg.lang];
  const [target] = useState(() => pick(SENTENCES[cfg.lang]));
  const [value, setValue] = useState("");
  const [result, setResult] = useState<SentenceResult | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const statsRef = useRef<Stats>(newStats());
  const startRef = useRef<number | null>(null);

  const feed = (v: string, composing: boolean) => {
    if (result) return;
    const st = statsRef.current;
    if (startRef.current === null && v) startRef.current = performance.now();
    const wrongBefore = st.wrong;
    ingest(composing ? v.slice(0, -1) : v, target, st);
    if (st.wrong > wrongBefore) play("오타");
    if (!composing && v === target) {
      const ms = performance.now() - (startRef.current ?? performance.now());
      const mins = Math.max(ms / 60000, 0.01);
      const r: SentenceResult = {
        wpm: Math.round(target.length / 5 / mins),
        cpm: Math.round(target.length / mins),
        acc: accOf(st),
        secs: ms / 1000,
      };
      play("정타");
      onSave({
        name: cfg.name,
        lang: cfg.lang,
        wpm: r.wpm,
        cpm: r.cpm,
        acc: r.acc,
        date: new Date().toISOString().slice(0, 10),
      });
      setResult(r);
      setValue("");
      return;
    }
    setValue(v);
  };

  if (result) {
    const unit = cfg.lang === "ko" ? "초" : "s";
    const rows: [string, string][] = [
      ["⚡ WPM", String(result.wpm)],
      [t.accuracy, `${result.acc}%`],
      [t.timeTaken, `${result.secs.toFixed(2)}${unit}`],
    ];
    if (cfg.lang === "ko") rows.splice(1, 0, ["🔥 CPM (타수)", String(result.cpm)]);
    return (
      <ResultCard title={t.sentenceComplete} rows={rows} lang={cfg.lang} onRestart={onRestart} onExit={onExit}>
        <HallBoard lang={cfg.lang} hall={hall} />
      </ResultCard>
    );
  }

  return (
    <GameShell
      label={`${t.modes.sentence.label} · ${LANG_LABEL[cfg.lang]}`}
      backLabel={t.backToMain}
      onExit={onExit}
    >
      <div className="w-full rounded-[2rem] border-4 border-pink-200 bg-white p-8 shadow-[0_10px_0_#fbcfe8,0_15px_25px_rgba(0,0,0,0.08)]">
        <CharLine target={target} value={value} size="text-3xl sm:text-4xl" />
      </div>
      <p className="rounded-full bg-white/80 px-5 py-2 text-lg font-bold text-indigo-600 shadow-sm">
        {t.firstCharHint}
      </p>
      <TypeInput
        inputRef={inputRef}
        value={value}
        onChange={(e: any) => feed(e.target.value, Boolean(e.nativeEvent.isComposing))}
        onCompositionEnd={(e: any) => feed(e.currentTarget.value, false)}
      />
    </GameShell>
  );
}

/* ================= 모드 3: 익스트림 베네치아 ================= */
type Falling = { id: number; text: string; x: number; y: number; kind: "normal" | "golden" | "boss" };
type Fx = { id: number; kind: "splash" | "lava" | "burst" | "gold"; x: number; y: number; born: number; power?: number };
type VGame = {
  words: Falling[];
  fx: Fx[];
  hearts: number;
  score: number;
  nextId: number;
  spawnT: number;
  slowUntil: number;
  stormUntil: number;
  flashUntil: number;
  shakeUntil: number;
  surgeUntil: number;
  comboMsgUntil: number;
  comboCount: number;
  last: number | null;
  over: boolean;
};
type VSnap = {
  words: Falling[];
  fx: Fx[];
  hearts: number;
  score: number;
  level: number;
  slowLeft: number;
  storm: boolean;
  flash: boolean;
  shake: boolean;
  surge: boolean;
  comboCount: number;
  over: boolean;
};

const newGame = (): VGame => ({
  words: [],
  fx: [],
  hearts: HEARTS_MAX,
  score: 0,
  nextId: 1,
  spawnT: 0,
  slowUntil: 0,
  stormUntil: 0,
  flashUntil: 0,
  shakeUntil: 0,
  surgeUntil: 0,
  comboMsgUntil: 0,
  comboCount: 0,
  last: null,
  over: false,
});

const EMPTY_SNAP: VSnap = {
  words: [],
  fx: [],
  hearts: HEARTS_MAX,
  score: 0,
  level: 1,
  slowLeft: 0,
  storm: false,
  flash: false,
  shake: false,
  surge: false,
  comboCount: 0,
  over: false,
};

// [4. Distinct & Alternating Stages] 150점마다 레벨업, 홀수 레벨은 바다(Ocean), 짝수 레벨은 화산(Volcano) 교차!
const levelOf = (score: number) => Math.min(10, 1 + Math.floor(score / 150));
const isVolcanoStage = (level: number) => level % 2 === 0;

function difficulty(level: number) {
  const t = (level - 1) / 9;
  return {
    maxWords: Math.round(3 + 5 * t), // 동시 낙하 단어 3 → 8
    interval: 1.85 - 1.05 * t, // 생성 간격(초)
    speed: 6.5 + 6.5 * t, // 기본 낙하 속도(%/초)
    event: 0.1 + 0.15 * t, // 황금/보스/번개 이벤트 확률
  };
}

function FallingWord({ w, value }: { w: Falling; value: string }) {
  const n = w.text.startsWith(value) ? value.length : 0;
  const boss = w.kind === "boss";
  const golden = w.kind === "golden";
  const tone = golden
    ? "bg-gradient-to-b from-yellow-200 to-amber-400 text-amber-950 border-4 border-yellow-100 shadow-[0_6px_0_#d97706]"
    : boss
      ? "bg-gradient-to-b from-purple-500 to-indigo-700 text-white border-4 border-purple-300 shadow-[0_8px_0_#3b0764]"
      : "bg-white text-slate-800 border-4 border-sky-200 shadow-[0_6px_0_#7dd3fc]";
  const hit = boss ? "text-lime-300" : golden ? "text-rose-600" : "text-emerald-500";
  const prefix = golden ? "🌟 " : boss ? "👾 " : "";

  return (
    <div
      className={`absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-3xl px-4 py-2 font-black ${
        boss ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"
      } ${tone}`}
      style={{ left: `${w.x}%`, top: `${w.y}%` }}
    >
      {prefix}
      <span className={hit}>{w.text.slice(0, n)}</span>
      {w.text.slice(n)}
    </div>
  );
}

function Effect({ f }: { f: Fx }) {
  const scale = f.power ?? 1;
  if (f.kind === "splash") {
    return (
      <div className="kt-fx" style={{ left: `${f.x}%`, top: `${f.y}%`, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <span className="kt-drop-l absolute -left-4 -top-4 text-3xl">💧</span>
        <span className="kt-drop-r absolute -right-4 -top-4 text-3xl">🌊</span>
        <span className="kt-drop-c absolute left-0 -top-6 text-4xl">💦</span>
        <div className="kt-splash flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 border-white bg-gradient-to-t from-blue-600/90 via-sky-400/90 to-cyan-100/95 shadow-[0_0_30px_rgba(56,189,248,0.95)]">
          <span className="text-4xl">🌊</span>
          <span className="text-xs font-black tracking-wider text-sky-950">SPLASH!</span>
        </div>
      </div>
    );
  }
  if (f.kind === "lava") {
    return (
      <div className="kt-fx" style={{ left: `${f.x}%`, top: `${f.y}%`, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <span className="kt-drop-l absolute -left-6 -top-6 text-4xl">🔥</span>
        <span className="kt-drop-r absolute -right-6 -top-6 text-4xl">☄️</span>
        <span className="kt-drop-c absolute left-0 -top-8 text-4xl">🌋</span>
        <div className="kt-explode flex h-36 w-36 flex-col items-center justify-center rounded-full border-4 border-yellow-200 bg-gradient-to-t from-red-800 via-orange-500 to-yellow-300 shadow-[0_0_45px_rgba(249,115,22,1)]">
          <span className="text-5xl">💥</span>
          <span className="text-xs font-black tracking-wider text-white drop-shadow">ERUPT!</span>
        </div>
      </div>
    );
  }
  if (f.kind === "gold") {
    return (
      <div
        className="kt-fx kt-pop flex items-center justify-center rounded-full bg-yellow-300/90 h-28 w-28 border-4 border-white shadow-[0_0_25px_#fde047]"
        style={{ left: `${f.x}%`, top: `${f.y}%` }}
      >
        <span className="text-4xl">🌟</span>
      </div>
    );
  }
  return (
    <div
      className="kt-fx kt-pop flex items-center justify-center rounded-full bg-pink-300/90 h-24 w-24 border-4 border-white shadow-[0_0_20px_#f472b6]"
      style={{ left: `${f.x}%`, top: `${f.y}%` }}
    >
      <span className="text-3xl">✨</span>
    </div>
  );
}

/* [4. Stage Background Entities] 바다(물고기 vs 상어) & 화산(마그마 협곡 & 화산재/불티) 배경 연출 */
function StageEnvironment({ level, isVolcano }: { level: number; isVolcano: boolean }) {
  if (!isVolcano) {
    // 홀수 레벨: 바다 스테이지 (Lv.1, 3은 귀여운 열대어 떼 / Lv.5 이상은 거대 상어 출현!)
    const isSharkSea = level >= 5;
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* 수중 빛줄기(Sunbeams) 및 산호초 실루엣 */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "repeating-linear-gradient(115deg, rgba(255,255,255,0.22) 0px, rgba(255,255,255,0.22) 28px, transparent 28px, transparent 90px)",
          }}
        />
        {/* 수중 기포 */}
        <span className="kt-bubble-1 absolute bottom-[20%] left-[18%] text-2xl opacity-50">🫧</span>
        <span className="kt-bubble-2 absolute bottom-[15%] left-[52%] text-3xl opacity-50">🫧</span>
        <span className="kt-bubble-3 absolute bottom-[25%] left-[78%] text-xl opacity-50">🫧</span>

        {isSharkSea ? (
          /* 고급 바다 스테이지(Lv.5+): 위협적인 거대 상어들과 심해 생물 */
          <>
            <div className="kt-shark-r absolute top-[18%] left-0 flex items-center gap-2 opacity-85 drop-shadow-[0_6px_12px_rgba(0,0,0,0.5)]">
              <span className="text-7xl sm:text-8xl">🦈</span>
              <span className="rounded-full bg-red-600/80 px-2.5 py-0.5 text-xs font-black text-white">DANGER</span>
            </div>
            <div className="kt-shark-l absolute top-[44%] left-0 flex items-center gap-2 opacity-75 drop-shadow-[0_6px_12px_rgba(0,0,0,0.5)]">
              <span className="text-6xl sm:text-7xl">🦈</span>
            </div>
            <div className="kt-swim-r-2 absolute top-[62%] left-0 text-5xl opacity-60">🐙</div>
          </>
        ) : (
          /* 초반 바다 스테이지(Lv.1, 3): 평화롭게 헤엄치는 작은 물고기 떼 */
          <>
            <div className="kt-swim-r-1 absolute top-[16%] left-0 flex gap-3 text-4xl opacity-80">
              <span>🐠</span>
              <span className="mt-3 text-3xl">🐟</span>
            </div>
            <div className="kt-swim-l-1 absolute top-[35%] left-0 flex gap-2 text-3xl opacity-75">
              <span>🐡</span>
              <span className="-mt-2 text-4xl">🐠</span>
              <span>🐟</span>
            </div>
            <div className="kt-swim-r-2 absolute top-[55%] left-0 flex gap-4 text-3xl opacity-70">
              <span>🐢</span>
              <span className="text-2xl">🐟</span>
            </div>
            <div className="kt-swim-l-2 absolute top-[24%] left-0 text-3xl opacity-65">🐬</div>
          </>
        )}
      </div>
    );
  }

  // 짝수 레벨: 화산 스테이지 (레벨이 높을수록 더 격렬한 화산 분화구, 화산재 구름, 솟구치는 불티)
  const intense = level >= 6;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 마그마 암벽 텍스처 패턴 */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 80%, rgba(251, 146, 60, 0.45) 0%, transparent 45%), radial-gradient(circle at 80% 70%, rgba(239, 68, 68, 0.5) 0%, transparent 50%)",
        }}
      />

      {/* 상단 검은 화산재 구름 (Dark Ash Clouds) */}
      <div className="kt-ash absolute -top-4 inset-x-0 flex justify-around opacity-75">
        <div className="h-20 w-48 rounded-full bg-stone-900/80 blur-md" />
        <div className="h-24 w-64 rounded-full bg-neutral-900/85 blur-md" />
        <div className="h-20 w-52 rounded-full bg-stone-800/80 blur-md" />
      </div>

      {/* 배경 거대 화산 실루엣 & 분화구 용암 빛 */}
      <svg className="absolute bottom-0 left-0 w-full h-[55%] opacity-45" viewBox="0 0 800 300" preserveAspectRatio="none">
        <polygon points="40,300 220,70 400,300" fill="#1c1917" />
        <polygon points="195,100 220,70 245,100 230,125 210,120" fill="#f97316" />
        <polygon points="350,300 560,40 760,300" fill="#292524" />
        <polygon points="530,78 560,40 590,78 575,115 545,110" fill="#ef4444" />
      </svg>

      {/* 공중으로 솟아오르는 불티(Embers)와 화산탄 */}
      <span className={`kt-ember-1 absolute bottom-[22%] left-[15%] ${intense ? "text-4xl" : "text-2xl"}`}>🔥</span>
      <span className={`kt-ember-2 absolute bottom-[18%] left-[35%] ${intense ? "text-4xl" : "text-xl"}`}>☄️</span>
      <span className={`kt-ember-3 absolute bottom-[25%] left-[58%] ${intense ? "text-5xl" : "text-2xl"}`}>🔥</span>
      <span className={`kt-ember-4 absolute bottom-[20%] left-[78%] ${intense ? "text-4xl" : "text-2xl"}`}>✨</span>
      {intense && (
        <>
          <span className="kt-ember-5 absolute bottom-[28%] left-[46%] text-5xl">🌋</span>
          <span className="kt-ember-2 absolute bottom-[30%] left-[88%] text-4xl">☄️</span>
        </>
      )}
    </div>
  );
}

/* [3. Dramatic Rising Floor Physics] 5=10%, 4=30%, 3=50%, 2=70%, 1=85% + Surge 시각 효과 */
function LiquidFloor({ hearts, isVolcano, surge }: { hearts: number; isVolcano: boolean; surge: boolean }) {
  const heightPct = getFloorHeight(hearts);
  const dangerCritical = hearts <= 2;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 ${isVolcano ? "kt-lava-pulse" : ""} ${
        surge ? "kt-floor-surge" : ""
      }`}
      style={{
        height: `${heightPct}%`,
        transition: "height 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {/* 상단 물결/용암 파도 SVG 레이어 */}
      <div className="kt-wave-bob absolute -top-8 left-0 right-0 h-9 overflow-hidden">
        {/* 뒷면 파도 */}
        <svg
          className="kt-wave-slow absolute top-1 left-0 h-full w-[200%] opacity-75"
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
        >
          <path
            d="M0,30 C150,68 300,-8 450,30 C600,68 750,-8 900,30 C1050,68 1200,-8 1200,30 L1200,60 L0,60 Z"
            fill={isVolcano ? "#f97316" : "#38bdf8"}
          />
        </svg>
        {/* 앞면 메인 파도 */}
        <svg
          className="kt-wave-fast absolute top-2 left-0 h-full w-[200%]"
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
        >
          <path
            d="M0,30 C100,-8 200,68 300,30 C400,-8 500,68 600,30 C700,-8 800,68 900,30 C1000,-8 1100,68 1200,30 L1200,60 L0,60 Z"
            fill={isVolcano ? "#dc2626" : "#0284c7"}
          />
        </svg>
      </div>

      {/* 액체 본체 그라데이션 & 수위 눈금 표시 */}
      <div
        className={`relative h-full w-full overflow-hidden ${
          isVolcano
            ? "bg-gradient-to-b from-red-600 via-orange-700 to-stone-950 shadow-[inset_0_12px_30px_rgba(253,224,71,0.55)]"
            : "bg-gradient-to-b from-sky-600 via-blue-800 to-slate-950 shadow-[inset_0_12px_30px_rgba(186,230,253,0.65)]"
        }`}
      >
        {/* 수면 빛 반사 하이라이트 */}
        <div
          className={`h-2.5 w-full opacity-90 ${
            isVolcano
              ? "bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-300"
              : "bg-gradient-to-r from-cyan-200 via-white to-cyan-200"
          }`}
        />

        {/* 우측 수위 경고 게이지 눈금 (현재 차오른 %를 직관적으로 표시) */}
        <div className="absolute right-3 top-3 rounded-full bg-black/45 px-3 py-1 text-xs sm:text-sm font-black text-white backdrop-blur-sm border border-white/30">
          {isVolcano ? "🌋 LAVA" : "🌊 WATER"} {heightPct}%
        </div>

        {/* 내부에서 솟아오르는 기포(바다) 또는 마그마 방울(화산) */}
        <div className="absolute inset-0">
          <span
            className={`kt-bubble-1 absolute bottom-2 left-[15%] rounded-full ${
              isVolcano
                ? "h-7 w-7 bg-yellow-300/80 shadow-[0_0_16px_#fde047]"
                : "h-5 w-5 border-2 border-white/80 bg-cyan-200/40"
            }`}
          />
          <span
            className={`kt-bubble-2 absolute bottom-4 left-[38%] rounded-full ${
              isVolcano
                ? "h-9 w-9 bg-orange-300/80 shadow-[0_0_20px_#fb923c]"
                : "h-7 w-7 border-2 border-white/70 bg-sky-200/30"
            }`}
          />
          <span
            className={`kt-bubble-3 absolute bottom-2 left-[64%] rounded-full ${
              isVolcano
                ? "h-6 w-6 bg-yellow-200/85 shadow-[0_0_14px_#fef08a]"
                : "h-4 w-4 border-2 border-white/80 bg-cyan-100/40"
            }`}
          />
          <span
            className={`kt-bubble-4 absolute bottom-3 left-[84%] rounded-full ${
              isVolcano
                ? "h-8 w-8 bg-amber-400/80 shadow-[0_0_18px_#f59e0b]"
                : "h-6 w-6 border-2 border-white/75 bg-sky-100/35"
            }`}
          />
        </div>

        {/* 수위가 70% 이상(하트 2개 이하)일 때 강렬한 위험 경고 점멸 */}
        {dangerCritical && <div className="absolute inset-0 animate-pulse bg-red-500/30" />}
      </div>
    </div>
  );
}

function VeniceMode({ cfg, play, onExit, onRestart }: ModeProps) {
  const t = I18N[cfg.lang];
  const gameRef = useRef<VGame | null>(null);
  if (gameRef.current === null) gameRef.current = newGame();
  const [snap, setSnap] = useState<VSnap>(EMPTY_SNAP);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const g = gameRef.current as VGame;
    let raf = 0;
    const frame = (now: number) => {
      if (g.last === null) g.last = now;
      const dt = Math.min(0.05, (now - g.last) / 1000);
      g.last = now;
      const currentLevel = levelOf(g.score);
      const isVolcano = isVolcanoStage(currentLevel); // [4. Stage Alternation] 홀수=바다, 짝수=화산
      const p = difficulty(currentLevel);
      const mult = (now < g.slowUntil ? 0.4 : 1) * (now < g.stormUntil ? 1.8 : 1);

      // 단어 생성 (동일 단어 동시 파괴 재미를 위해 가끔 현재 화면에 있는 단어가 한 번 더 등장할 확률 부여)
      if (!g.over) {
        g.spawnT += dt;
        if (g.spawnT >= p.interval && g.words.length < p.maxWords) {
          g.spawnT = 0;
          let kind: Falling["kind"] = "normal";
          if (Math.random() < p.event) {
            const roll = Math.random();
            if (roll < 0.45) kind = "golden";
            else if (roll < 0.75) kind = "boss";
            else {
              g.stormUntil = now + 3000;
              g.flashUntil = now + 300;
              play("번개");
            }
          }
          const x = 10 + Math.random() * 80;
          const pool = kind === "boss" ? LONG_WORDS[cfg.lang] : WORDS[cfg.lang];
          const duplicateChance = g.words.length > 0 && kind === "normal" && Math.random() < 0.28;
          const chosenText = duplicateChance ? pick(g.words).text : pick(pool);
          g.words.push({ id: g.nextId++, text: chosenText, x, y: 0, kind });
        }
      }

      // 단어 낙하
      for (const w of g.words) w.y += p.speed * (w.kind === "boss" ? 0.6 : 1) * mult * dt;

      // [3. Dramatic Rising Surface + Impact Effect]
      const surfaceY = getFloorSurfaceY(g.hearts);
      const landed = g.words.filter((w) => w.y >= surfaceY - 4);
      if (landed.length) {
        g.words = g.words.filter((w) => w.y < surfaceY - 4);
        // 레벨이 높을수록 폭발 크기(power)와 흔들림 강도 증가
        const powerScale = 1 + (currentLevel - 1) * 0.08;
        for (const w of landed) {
          const impactY = getFloorSurfaceY(g.hearts);
          if (isVolcano) {
            g.fx.push({ id: g.nextId++, kind: "lava", x: w.x, y: impactY, born: now, power: powerScale });
            play("용암");
            g.shakeUntil = now + (currentLevel >= 6 ? 750 : 550);
          } else {
            g.fx.push({ id: g.nextId++, kind: "splash", x: w.x, y: impactY, born: now, power: powerScale });
            play("물");
            g.shakeUntil = now + 350;
          }
          g.hearts = Math.max(0, g.hearts - 1);
          g.surgeUntil = now + 680; // 수위가 급격히 차오르는 서지(Surge) 애니메이션 발동
        }
      }

      g.fx = g.fx.filter((f) => now - f.born < 750);
      if (!g.over && g.hearts <= 0) {
        g.hearts = 0;
        g.over = true;
        play("게임오버");
      }

      setSnap({
        words: g.words.map((w) => ({ ...w })),
        fx: g.fx.map((f) => ({ ...f })),
        hearts: g.hearts,
        score: g.score,
        level: levelOf(g.score),
        slowLeft: Math.max(0, (g.slowUntil - now) / 1000),
        storm: now < g.stormUntil,
        flash: now < g.flashUntil,
        shake: now < g.shakeUntil,
        surge: now < g.surgeUntil,
        comboCount: now < g.comboMsgUntil ? g.comboCount : 0,
        over: g.over,
      });
      if (!g.over) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [cfg.lang, play]);

  // [2. Multi-Target Destruction] 입력한 단어와 일치하는 화면상의 모든 단어를 동시에 파괴!
  const submit = (raw: string) => {
    const g = gameRef.current as VGame;
    const text = raw.trim();
    setValue("");
    if (g.over || !text) return;

    const matched = g.words.filter((w) => w.text === text);
    if (matched.length === 0) {
      play("오타");
      return;
    }

    // 일치하는 모든 단어 제거
    g.words = g.words.filter((w) => w.text !== text);
    const now = performance.now();
    let playedSpecial = false;

    for (const w of matched) {
      if (w.kind === "golden") {
        g.score += 150;
        g.slowUntil = now + 5000;
        play("황금");
        playedSpecial = true;
      } else if (w.kind === "boss") {
        g.score += 200;
        play("파괴");
        playedSpecial = true;
      } else {
        g.score += 50;
      }
      g.fx.push({ id: g.nextId++, kind: w.kind === "golden" ? "gold" : "burst", x: w.x, y: w.y, born: now });
    }

    // 2개 이상 동시 파괴 시 추가 보너스 점수 및 멀티 콤보 배너 표시
    if (matched.length >= 2) {
      g.score += matched.length * 30;
      g.comboCount = matched.length;
      g.comboMsgUntil = now + 1500;
      if (!playedSpecial) play("황금");
    } else if (!playedSpecial) {
      play("정타");
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    if (e.repeat) return;
    submit(e.currentTarget.value);
  };

  const isVolcano = isVolcanoStage(snap.level);
  const violentShake = isVolcano && snap.level >= 6;
  const stageBg = isVolcano
    ? snap.level >= 6
      ? "bg-gradient-to-b from-stone-950 via-red-950 to-orange-700"
      : "bg-gradient-to-b from-rose-950 via-red-800 to-orange-600"
    : snap.level >= 5
      ? "bg-gradient-to-b from-slate-900 via-cyan-900 to-blue-700"
      : "bg-gradient-to-b from-sky-200 via-cyan-300 to-blue-500";

  return (
    <GameShell
      label={`${t.modes.venice.label} · ${LANG_LABEL[cfg.lang]}`}
      backLabel={t.backToMain}
      onExit={onExit}
    >
      <div
        className={`relative w-full overflow-hidden rounded-[2rem] border-4 ${
          isVolcano ? "border-orange-500 shadow-[0_10px_0_#c2410c]" : "border-sky-300 shadow-[0_10px_0_#0284c7]"
        } ${snap.shake ? (violentShake ? "kt-shake-violent" : "kt-shake") : ""}`}
      >
        {/* 상단 상태바 */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 px-5 py-3 text-lg sm:text-xl font-black text-white">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-indigo-500 px-3 py-1">
              {t.level}{snap.level}
            </span>
            <span
              className={`rounded-xl px-3 py-1 text-base sm:text-lg transition-colors duration-500 ${
                isVolcano ? "bg-red-600 text-yellow-200" : "bg-sky-500 text-white"
              }`}
            >
              {isVolcano ? t.stageVolcano(snap.level) : t.stageWater(snap.level)}
            </span>
          </div>
          <span className="text-amber-300">
            {t.score}: {snap.score}
          </span>
          <span className="text-2xl tracking-widest">
            {"❤️".repeat(snap.hearts)}
            {"🖤".repeat(HEARTS_MAX - snap.hearts)}
          </span>
          {snap.slowLeft > 0 && (
            <span className="rounded-full bg-cyan-500/30 px-3 py-0.5 text-cyan-300">
              {t.slow} {snap.slowLeft.toFixed(1)}s
            </span>
          )}
          {snap.storm && (
            <span className="rounded-full bg-yellow-500/30 px-3 py-0.5 text-yellow-300">{t.storm}</span>
          )}
        </div>

        {/* 게임 필드: 매 레벨 바다(홀수) <-> 화산(짝수) 교차 및 배경 생물/효과 */}
        <div className={`relative h-[60vh] min-h-[420px] transition-colors duration-700 ${stageBg}`}>
          <StageEnvironment level={snap.level} isVolcano={isVolcano} />

          {/* 수위 급상승(Surge) 경고 배너 */}
          {snap.surge && !snap.over && (
            <div className="pointer-events-none absolute top-4 inset-x-0 z-30 flex justify-center">
              <span className="animate-bounce rounded-full border-2 border-yellow-200 bg-red-600/90 px-5 py-1.5 text-lg font-black text-white shadow-lg">
                {t.surgeAlert}
              </span>
            </div>
          )}

          {/* 동시 파괴 멀티 콤보 배너 */}
          {snap.comboCount >= 2 && !snap.over && (
            <div className="pointer-events-none absolute top-16 inset-x-0 z-30 flex justify-center">
              <span className="rounded-full border-2 border-white bg-gradient-to-r from-amber-400 to-pink-500 px-5 py-1.5 text-xl font-black text-white shadow-lg">
                {t.multiHit(snap.comboCount)}
              </span>
            </div>
          )}

          {snap.words.map((w) => (
            <FallingWord key={w.id} w={w} value={value} />
          ))}
          {snap.fx.map((f) => (
            <Effect key={f.id} f={f} />
          ))}

          {/* [3. Dramatic Rising Liquid Floor] 10% -> 30% -> 50% -> 70% -> 85% -> 100% */}
          <LiquidFloor hearts={snap.hearts} isVolcano={isVolcano} surge={snap.surge} />

          {snap.flash && <div className="kt-flash absolute inset-0 z-20 bg-yellow-200" />}

          {snap.over && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-slate-950/80 p-6 text-white backdrop-blur-sm">
              <h2 className="text-5xl font-black text-rose-400 drop-shadow">{t.gameOver}</h2>
              <p className="text-3xl font-bold">
                {t.score}: <span className="font-black text-yellow-300">{snap.score}</span> · {t.level}
                {snap.level}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button className={JELLY_GREEN} onClick={onRestart}>
                  {t.playAgain}
                </button>
                <button className={JELLY_WHITE} onClick={onExit}>
                  {t.backToMain}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!snap.over && (
        <TypeInput
          inputRef={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t.veniceInputPlaceholder}
        />
      )}
    </GameShell>
  );
}

/* ================= 메인 메뉴 ================= */
function Panel({ title, color, children }: { title: string; color: string; children: ReactNode }) {
  return (
    <div className={`rounded-[2rem] border-4 ${color} bg-white/90 p-6 shadow-xl`}>
      <h2 className="mb-4 text-2xl sm:text-3xl font-black text-slate-800">{title}</h2>
      {children}
    </div>
  );
}

function MainMenu({
  player,
  setPlayer,
  friend,
  setFriend,
  lang,
  setLang,
  onLaunch,
}: {
  player: Player;
  setPlayer: (p: Player) => void;
  friend: string;
  setFriend: (s: string) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  onLaunch: (m: Mode) => void;
}) {
  const t = I18N[lang];
  const modeIds: Mode[] = ["word", "sentence", "venice"];
  const modeStyles: Record<Mode, string> = {
    word: JELLY_GREEN,
    sentence: JELLY_BLUE,
    venice: JELLY_PINK,
  };

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Panel title={t.step1} color="border-sky-300 shadow-[0_8px_0_#7dd3fc]">
        <div className="flex flex-wrap gap-3">
          {PLAYERS.map((p) => {
            const label = p === "Tei" ? "🦁 Tei" : p === "Sia" ? "🐰 Sia" : t.friendBtn;
            return (
              <button
                key={p}
                className={player === p ? JELLY_BLUE : JELLY_WHITE}
                onClick={() => setPlayer(p)}
              >
                {label}
              </button>
            );
          })}
        </div>
        {player === "friend" && (
          <input
            className="mt-4 w-full max-w-md rounded-2xl border-4 border-sky-300 bg-sky-50/50 px-4 py-2.5 text-2xl font-bold outline-none focus:border-pink-400 focus:bg-white"
            value={friend}
            maxLength={8}
            placeholder={t.friendPlaceholder}
            onChange={(e) => setFriend(e.target.value)}
          />
        )}
      </Panel>

      <Panel title={t.step2} color="border-purple-300 shadow-[0_8px_0_#d8b4fe]">
        <div className="flex flex-wrap gap-3">
          {(Object.keys(LANG_LABEL) as Lang[]).map((l) => (
            <button
              key={l}
              className={lang === l ? JELLY_PINK : JELLY_WHITE}
              onClick={() => setLang(l)}
            >
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title={t.step3} color="border-amber-300 shadow-[0_8px_0_#fcd34d]">
        <div className="grid gap-4">
          {modeIds.map((id) => {
            const m = t.modes[id];
            return (
              <button
                key={id}
                className={`${modeStyles[id]} flex flex-col items-start text-left !py-4`}
                onClick={() => onLaunch(id)}
              >
                <span className="text-2xl sm:text-3xl drop-shadow-sm">{m.label}</span>
                <span className="mt-1 text-base sm:text-lg font-bold text-white/95">{m.desc}</span>
              </button>
            );
          })}
        </div>
      </Panel>
    </section>
  );
}

/* ================= 루트 ================= */
export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [player, setPlayer] = useState<Player>("Tei");
  const [friend, setFriend] = useState("");
  const [lang, setLang] = useState<Lang>("ko");
  const [sound, setSound] = useState(true);
  const [runKey, setRunKey] = useState(0);
  const [hall, setHall] = useState<HallEntry[]>([]);
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(true);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);
  useEffect(() => {
    setHall(loadHall());
  }, []);

  const play: PlayFn = useCallback((n: SfxName) => {
    if (!soundRef.current) return;
    if (!audioRef.current) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioRef.current = new Ctor();
    }
    const ctx = audioRef.current;
    if (ctx.state === "suspended") void ctx.resume();
    playSfx(ctx, n);
  }, []);

  const saveHall = (entry: HallEntry) =>
    setHall((prev) => {
      const next = [...prev, entry];
      localStorage.setItem(HALL_KEY, JSON.stringify(next));
      return next;
    });

  const t = I18N[lang];
  const cfg: GameCfg = {
    name: player === "friend" ? friend.trim() || t.defaultFriend : player,
    lang,
  };
  const launch = (m: Mode) => {
    setRunKey((k) => k + 1);
    setScreen(m);
  };
  const restart = () => setRunKey((k) => k + 1);
  const toMenu = () => setScreen("menu");

  return (
    <main className="kt-font min-h-screen bg-gradient-to-b from-sky-200 via-purple-100 to-pink-200 px-4 py-6 text-slate-800">
      <style>{CSS}</style>
      <header className="mx-auto mb-6 flex max-w-4xl flex-wrap items-center justify-between gap-4 rounded-[2rem] border-4 border-white bg-white/75 px-6 py-4 shadow-lg backdrop-blur-sm">
        <h1 className="text-3xl font-black text-indigo-600 drop-shadow-sm sm:text-4xl">{t.appTitle}</h1>
        <button className={`${JELLY_WHITE} !px-5 !py-2.5 !text-lg`} onClick={() => setSound((s) => !s)}>
          {sound ? t.soundOn : t.soundOff}
        </button>
      </header>

      {screen === "menu" && (
        <MainMenu
          player={player}
          setPlayer={setPlayer}
          friend={friend}
          setFriend={setFriend}
          lang={lang}
          setLang={setLang}
          onLaunch={launch}
        />
      )}
      {screen === "word" && <WordMode key={runKey} cfg={cfg} play={play} onExit={toMenu} onRestart={restart} />}
      {screen === "sentence" && (
        <SentenceMode
          key={runKey}
          cfg={cfg}
          play={play}
          hall={hall}
          onSave={saveHall}
          onExit={toMenu}
          onRestart={restart}
        />
      )}
      {screen === "venice" && <VeniceMode key={runKey} cfg={cfg} play={play} onExit={toMenu} onRestart={restart} />}
    </main>
  );
}