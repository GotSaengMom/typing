"use client";

import { useCallback, useEffect, useRef, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type RefObject } from "react";

/* ================= 데이터 ================= */
type Lang = "en" | "ko";
type Mode = "word" | "sentence" | "venice";
type Screen = "menu" | Mode;
type SfxName = "정타" | "오타" | "파괴" | "물" | "용암" | "번개" | "황금" | "게임오버";
type PlayFn = (n: SfxName) => void;
type Stats = { total: number; wrong: number; committed: number };
type HallEntry = { name: string; lang: Lang; wpm: number; cpm: number; acc: number; date: string };
type GameCfg = { name: string; lang: Lang };
type ModeProps = { cfg: GameCfg; play: PlayFn; onExit: () => void; onRestart: () => void };

const PLAYER_FRIEND = "친구(직접입력)";
const PLAYERS = ["Tei", "Sia", PLAYER_FRIEND] as const;
type Player = (typeof PLAYERS)[number];
const LANG_LABEL: Record<Lang, string> = { en: "English", ko: "한국어" };
const MODES: { id: Mode; label: string; desc: string }[] = [
  { id: "word", label: "단어 연습", desc: "단어 10개를 차례대로 쳐요" },
  { id: "sentence", label: "문장 연습", desc: "문장 하나로 속도를 재요 (스피드 랭킹)" },
  { id: "venice", label: "익스트림 베네치아", desc: "떨어지는 단어를 Enter로 부숴요" },
];

const WORDS: Record<Lang, string[]> = {
  en: [
    "cat", "dog", "sun", "moon", "star", "fish", "bird", "tree", "book", "door",
    "ball", "cake", "milk", "rain", "snow", "wind", "lake", "road", "home", "love",
    "game", "play", "jump", "run", "walk", "swim", "color", "light", "water", "apple",
    "bread", "chair", "table", "green", "happy", "smile", "sleep", "dream", "river", "flower",
    "animal", "bottle", "pencil", "window", "garden", "friend", "family", "school", "rabbit", "tiger",
  ],
  ko: [
    "사과", "바나나", "포도", "수박", "딸기", "우유", "빵", "케이크", "김밥", "라면",
    "강아지", "고양이", "토끼", "거북이", "호랑이", "사자", "코끼리", "기린", "원숭이", "펭귄",
    "나무", "꽃", "하늘", "바다", "구름", "비", "눈", "바람", "햇님", "달님",
    "별", "산", "강", "학교", "친구", "가족", "선생님", "연필", "지우개", "공책",
    "가방", "자동차", "기차", "비행기", "자전거", "버스", "병원", "도서관", "운동장", "신발",
  ],
};
const SENTENCES: Record<Lang, string[]> = {
  en: [
    "The cat sat on the mat.",
    "I like to play with my dog.",
    "The sun is hot today.",
    "We go to school by bus.",
    "She has a red ball.",
    "Birds can fly high in the sky.",
    "My mom makes good soup.",
    "Let us walk to the park.",
    "The fish swims in the blue water.",
    "I brush my teeth every night.",
    "He likes to read big books.",
    "The moon is bright at night.",
    "We ate apples and bananas.",
    "Please close the door gently.",
    "My friend and I play soccer.",
    "The rain stopped and the sun came out.",
    "I can count from one to ten.",
    "Our family went to the beach.",
    "The little rabbit hops in the garden.",
    "Be kind to your friends.",
  ],
  ko: [
    "오늘은 날씨가 참 좋아요.",
    "나는 친구와 함께 공원에 가요.",
    "고양이가 창가에서 낮잠을 자요.",
    "엄마가 맛있는 김밥을 만들어 주셨어요.",
    "우리 가족은 주말에 바다에 갔어요.",
    "나는 매일 아침 일찍 일어나요.",
    "강아지가 공을 가지고 뛰어가요.",
    "하늘에 무지개가 떠 있어요.",
    "책을 읽으면 마음이 편해져요.",
    "동생과 함께 그림을 그렸어요.",
    "비가 그쳐서 밖에 나가 놀았어요.",
    "선생님께 감사한 마음을 전했어요.",
    "나는 수학 문제를 열심히 풀어요.",
    "달님이 밤하늘을 환하게 비춰요.",
    "우리 반 친구들은 모두 착해요.",
    "새들이 나무 위에서 노래해요.",
    "손을 씻고 밥을 먹어요.",
    "나는 커서 과학자가 되고 싶어요.",
    "버스를 타고 도서관에 갔어요.",
    "함께 하면 더 즐거워요.",
  ],
};
const LONG_WORDS: Record<Lang, string[]> = {
  en: WORDS.en.filter((w) => w.length >= 6),
  ko: WORDS.ko.filter((w) => w.length >= 3),
};

const WORD_COUNT = 10;
const HALL_KEY = "kidtype-hall-of-fame-v1";
const HALL_SIZE = 5;
const HEARTS_MAX = 5;
const FLOOR_Y = 92; // 바닥 위치 (필드 높이 %)
const WATER_MAX_X = 60; // X < 60 → Water, 그 이상 → Volcano
const BTN = "rounded-2xl px-5 py-3 text-xl font-black shadow-md transition active:scale-95 disabled:opacity-50";

const CSS = `
@keyframes kt-shake{0%,100%{transform:translate(0,0)}20%{transform:translate(-10px,5px)}40%{transform:translate(10px,-5px)}60%{transform:translate(-8px,3px)}80%{transform:translate(8px,-3px)}}
.kt-shake{animation:kt-shake .6s ease-in-out}
@keyframes kt-flash{from{opacity:.85}to{opacity:0}}
.kt-flash{animation:kt-flash .3s ease-out forwards}
.kt-fx{position:absolute;margin:-56px 0 0 -56px;pointer-events:none}
@keyframes kt-pop{from{transform:scale(.2);opacity:1}to{transform:scale(2);opacity:0}}
.kt-pop{animation:kt-pop .6s ease-out forwards}
@keyframes kt-lava{0%{transform:translateY(0) scale(.4);opacity:1}100%{transform:translateY(-120px) scale(1.5);opacity:0}}
.kt-lava{animation:kt-lava .6s ease-out forwards}
`;

/* ================= 유틸 ================= */
const newStats = (): Stats => ({ total: 0, wrong: 0, committed: 0 });
const accOf = (st: Stats) => (st.total === 0 ? 100 : Math.round(((st.total - st.wrong) / st.total) * 100));

// 확정된 글자만 판정 (IME 조합 중인 글자는 제외)
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

/* ================= 효과음 (Web Audio, 파일 없음) ================= */
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
      className="w-full max-w-xl rounded-2xl border-4 border-indigo-300 bg-white px-4 py-3 text-center text-4xl font-bold outline-none focus:border-indigo-500"
      {...rest}
    />
  );
}

function CharLine({ target, value, size }: { target: string; value: string; size: string }) {
  return (
    <p className={`break-keep text-center font-black leading-relaxed ${size}`}>
      {target.split("").map((ch, i) => {
        const typed = value[i];
        const cls = typed === undefined ? "text-slate-300" : typed === ch ? "text-emerald-500" : "text-red-500";
        return (
          <span key={i} className={cls}>
            {ch}
          </span>
        );
      })}
      {value.length > target.length && <span className="text-red-500">{value.slice(target.length)}</span>}
    </p>
  );
}

function GameShell({ label, onExit, children }: { label: string; onExit: () => void; children: ReactNode }) {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6">
      <div className="flex w-full items-center justify-between">
        <button className={`${BTN} bg-white text-lg`} onClick={onExit}>
          ← 메인
        </button>
        <span className="text-xl font-bold">{label}</span>
      </div>
      {children}
    </section>
  );
}

function ResultCard({
  title,
  rows,
  onRestart,
  onExit,
  children,
}: {
  title: string;
  rows: [string, string][];
  onRestart: () => void;
  onExit: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6 rounded-3xl bg-white/90 p-8 shadow-xl">
      <h2 className="text-4xl font-black">{title}</h2>
      <div className="grid gap-3 text-center">
        {rows.map(([k, v]) => (
          <p key={k} className="text-2xl">
            <span className="font-bold">{k}</span>: <span className="text-3xl font-black text-indigo-600">{v}</span>
          </p>
        ))}
      </div>
      {children}
      <div className="flex gap-3">
        <button className={`${BTN} bg-emerald-500 text-white`} onClick={onRestart}>
          다시 하기
        </button>
        <button className={`${BTN} bg-white`} onClick={onExit}>
          메인으로
        </button>
      </div>
    </div>
  );
}

function HallBoard({ lang, hall }: { lang: Lang; hall: HallEntry[] }) {
  const top = hall
    .filter((h) => h.lang === lang)
    .sort((a, b) => b.wpm - a.wpm)
    .slice(0, HALL_SIZE);
  return (
    <div className="w-full rounded-3xl bg-amber-50 p-5 shadow-inner">
      <h3 className="mb-3 text-2xl font-black">
        🏆 명예의 전당 Top {HALL_SIZE} ({LANG_LABEL[lang]})
      </h3>
      {top.length === 0 ? (
        <p className="text-lg text-slate-500">아직 기록이 없어요</p>
      ) : (
        <ol className="grid gap-2 text-xl">
          {top.map((h, i) => (
            <li key={`${h.date}-${i}`} className="flex items-center justify-between rounded-xl bg-white px-4 py-2">
              <span className="font-black">
                {i + 1}. {h.name}
              </span>
              <span className="font-bold">
                {h.wpm} WPM{h.lang === "ko" ? ` · ${h.cpm} CPM` : ""} · {h.acc}%
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
    const rows: [string, string][] = [
      ["정확도", `${result.acc}%`],
      ["소요 시간", `${result.secs.toFixed(1)}초`],
    ];
    return <ResultCard title="단어 연습 완료!" rows={rows} onRestart={onRestart} onExit={onExit} />;
  }

  return (
    <GameShell label={`단어 연습 · ${idx + 1} / ${WORD_COUNT}`} onExit={onExit}>
      <div className="w-full rounded-3xl bg-white p-10 shadow-xl">
        <CharLine target={target} value={value} size="text-6xl sm:text-7xl" />
      </div>
      <TypeInput
        inputRef={inputRef}
        value={value}
        onChange={(e) => feed(e.target.value, Boolean((e.nativeEvent as InputEvent).isComposing))}
        onCompositionEnd={(e) => feed(e.currentTarget.value, false)}
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
    const rows: [string, string][] = [
      ["WPM", String(result.wpm)],
      ["정확도", `${result.acc}%`],
      ["소요 시간", `${result.secs.toFixed(2)}초`],
    ];
    if (cfg.lang === "ko") rows.splice(1, 0, ["CPM", String(result.cpm)]);
    return (
      <ResultCard title="문장 완료!" rows={rows} onRestart={onRestart} onExit={onExit}>
        <HallBoard lang={cfg.lang} hall={hall} />
      </ResultCard>
    );
  }

  return (
    <GameShell label={`문장 연습 · ${LANG_LABEL[cfg.lang]}`} onExit={onExit}>
      <div className="w-full rounded-3xl bg-white p-8 shadow-xl">
        <CharLine target={target} value={value} size="text-3xl sm:text-4xl" />
      </div>
      <p className="text-lg text-slate-600">첫 글자를 치면 시간이 시작돼요</p>
      <TypeInput
        inputRef={inputRef}
        value={value}
        onChange={(e) => feed(e.target.value, Boolean((e.nativeEvent as InputEvent).isComposing))}
        onCompositionEnd={(e) => feed(e.currentTarget.value, false)}
      />
    </GameShell>
  );
}

/* ================= 모드 3: 익스트림 베네치아 ================= */
type Falling = { id: number; text: string; x: number; y: number; kind: "normal" | "golden" | "boss" };
type Fx = { id: number; kind: "splash" | "lava" | "burst" | "gold"; x: number; y: number; born: number };
type VGame = {
  words: Falling[];
  fx: Fx[];
  hearts: number;
  score: number;
  danger: number;
  nextId: number;
  spawnT: number;
  slowUntil: number;
  stormUntil: number;
  flashUntil: number;
  shakeUntil: number;
  last: number | null;
  over: boolean;
};
type VSnap = {
  words: Falling[];
  fx: Fx[];
  hearts: number;
  score: number;
  danger: number;
  level: number;
  slowLeft: number;
  storm: boolean;
  flash: boolean;
  shake: boolean;
  over: boolean;
};

const newGame = (): VGame => ({
  words: [],
  fx: [],
  hearts: HEARTS_MAX,
  score: 0,
  danger: 0,
  nextId: 1,
  spawnT: 0,
  slowUntil: 0,
  stormUntil: 0,
  flashUntil: 0,
  shakeUntil: 0,
  last: null,
  over: false,
});
const EMPTY_SNAP: VSnap = {
  words: [],
  fx: [],
  hearts: HEARTS_MAX,
  score: 0,
  danger: 0,
  level: 1,
  slowLeft: 0,
  storm: false,
  flash: false,
  shake: false,
  over: false,
};
const levelOf = (score: number) => Math.min(10, 1 + Math.floor(score / 400));

// 레벨(1~10)에 따른 난이도 곡선
function difficulty(level: number) {
  const t = (level - 1) / 9;
  return {
    volcano: 0.2 + 0.5 * t, // 화산 쪽 낙하 확률 20% → 70%
    maxWords: Math.round(2 + 5 * t), // 동시 낙하 단어 2 → 7
    interval: 2 - 1.2 * t, // 생성 간격(초)
    speed: 5 + 5 * t, // 기본 낙하 속도(%/초)
    event: 0.05 + 0.15 * t, // 특수 이벤트 확률
  };
}

function FallingWord({ w, value }: { w: Falling; value: string }) {
  const n = w.text.startsWith(value) ? value.length : 0;
  const boss = w.kind === "boss";
  const tone =
    w.kind === "golden"
      ? "bg-amber-300 text-amber-900 ring-4 ring-yellow-200"
      : boss
        ? "bg-purple-700 text-white ring-4 ring-purple-300"
        : "bg-white text-slate-800";
  const hit = boss ? "text-lime-300" : "text-emerald-600";
  return (
    <div
      className={`absolute -translate-x-1/2 whitespace-nowrap rounded-2xl px-4 py-2 font-black shadow-lg ${boss ? "text-5xl" : "text-3xl"} ${tone}`}
      style={{ left: `${w.x}%`, top: `${w.y}%` }}
    >
      <span className={hit}>{w.text.slice(0, n)}</span>
      {w.text.slice(n)}
    </div>
  );
}

function Effect({ f }: { f: Fx }) {
  const cls = {
    splash: "kt-pop bg-sky-300/80",
    lava: "kt-lava rounded-[40%] bg-gradient-to-t from-orange-500 to-red-600",
    burst: "kt-pop bg-pink-300/90",
    gold: "kt-pop bg-yellow-300/90",
  }[f.kind];
  return <div className={`kt-fx h-28 w-28 rounded-full ${cls}`} style={{ left: `${f.x}%`, top: `${f.y}%` }} />;
}

function VeniceMode({ cfg, play, onExit, onRestart }: ModeProps) {
  const gameRef = useRef<VGame | null>(null);
  if (gameRef.current === null) gameRef.current = newGame();
  const [snap, setSnap] = useState<VSnap>(EMPTY_SNAP);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 게임 루프: 위치·충돌·이벤트는 ref에서, 렌더용 스냅샷만 state로 갱신
  useEffect(() => {
    const g = gameRef.current as VGame;
    let raf = 0;
    const frame = (now: number) => {
      if (g.last === null) g.last = now;
      const dt = Math.min(0.05, (now - g.last) / 1000);
      g.last = now;
      const p = difficulty(levelOf(g.score));
      const mult = (now < g.slowUntil ? 0.4 : 1) * (now < g.stormUntil ? 2 : 1);

      // 생성
      if (!g.over) {
        g.spawnT += dt;
        if (g.spawnT >= p.interval && g.words.length < p.maxWords) {
          g.spawnT = 0;
          let kind: Falling["kind"] = "normal";
          if (Math.random() < p.event) {
            const roll = Math.random();
            if (roll < 0.4) kind = "golden";
            else if (roll < 0.7) kind = "boss";
            else {
              g.stormUntil = now + 3000;
              g.flashUntil = now + 300;
              play("번개");
            }
          }
          const volcano = Math.random() < p.volcano;
          const x = volcano ? 62 + Math.random() * 33 : 5 + Math.random() * 53;
          const pool = kind === "boss" ? LONG_WORDS[cfg.lang] : WORDS[cfg.lang];
          g.words.push({ id: g.nextId++, text: pick(pool), x, y: 0, kind });
        }
      }

      // 낙하
      for (const w of g.words) w.y += p.speed * (w.kind === "boss" ? 0.5 : 1) * mult * dt;

      // 바닥 충돌
      const landed = g.words.filter((w) => w.y >= FLOOR_Y);
      if (landed.length) {
        g.words = g.words.filter((w) => w.y < FLOOR_Y);
        for (const w of landed) {
          if (w.x < WATER_MAX_X) {
            g.fx.push({ id: g.nextId++, kind: "splash", x: w.x, y: FLOOR_Y, born: now });
            play("물");
            if (w.kind === "boss") g.hearts -= 2;
            else {
              g.danger += 25;
              if (g.danger >= 100) {
                g.hearts -= 1;
                g.danger = 0;
              }
            }
          } else {
            g.fx.push({ id: g.nextId++, kind: "lava", x: w.x, y: FLOOR_Y, born: now });
            play("용암");
            g.shakeUntil = now + 600;
            g.hearts -= w.kind === "boss" ? 2 : 1;
          }
        }
      }

      g.fx = g.fx.filter((f) => now - f.born < 700);
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
        danger: g.danger,
        level: levelOf(g.score),
        slowLeft: Math.max(0, (g.slowUntil - now) / 1000),
        storm: now < g.stormUntil,
        flash: now < g.flashUntil,
        shake: now < g.shakeUntil,
        over: g.over,
      });
      if (!g.over) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [cfg.lang, play]);

  const submit = (raw: string) => {
    const g = gameRef.current as VGame;
    const text = raw.trim();
    setValue("");
    if (g.over || !text) return;
    // 일치하는 단어가 여럿이면 가장 아래(y 최대) 것부터 파괴
    let best = -1;
    g.words.forEach((w, i) => {
      if (w.text === text && (best < 0 || w.y > g.words[best].y)) best = i;
    });
    if (best < 0) {
      play("오타");
      return;
    }
    const [w] = g.words.splice(best, 1);
    const now = performance.now();
    if (w.kind === "golden") {
      g.score += 300;
      g.slowUntil = now + 5000;
      play("황금");
    } else if (w.kind === "boss") {
      g.score += 500;
      play("파괴");
    } else {
      g.score += 10;
      play("정타");
    }
    g.fx.push({ id: g.nextId++, kind: w.kind === "golden" ? "gold" : "burst", x: w.x, y: w.y, born: now });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (e.nativeEvent.isComposing || e.keyCode === 229) return; // 한글 조합 중 Enter 무시
    e.preventDefault();
    if (e.repeat) return;
    submit(e.currentTarget.value);
  };

  return (
    <GameShell label={`익스트림 베네치아 · ${LANG_LABEL[cfg.lang]}`} onExit={onExit}>
      <div className={`relative w-full overflow-hidden rounded-3xl ${snap.shake ? "kt-shake" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/85 px-4 py-2 text-lg font-bold text-white">
          <span>Lv.{snap.level}</span>
          <span>점수 {snap.score}</span>
          <span>
            {"❤️".repeat(snap.hearts)}
            {"🖤".repeat(HEARTS_MAX - snap.hearts)}
          </span>
          <span className="flex items-center gap-2">
            위험
            <span className="inline-block h-4 w-28 overflow-hidden rounded bg-white/30">
              <span className="block h-full bg-red-500" style={{ width: `${snap.danger}%` }} />
            </span>
          </span>
          {snap.slowLeft > 0 && <span className="text-cyan-300">🐢 슬로우 {snap.slowLeft.toFixed(1)}s</span>}
          {snap.storm && <span className="text-yellow-300">⚡ 번개 폭풍 x2</span>}
        </div>
        <div className="relative h-[62vh] min-h-[420px] bg-gradient-to-b from-sky-200 via-indigo-200 to-indigo-400">
          {snap.words.map((w) => (
            <FallingWord key={w.id} w={w} value={value} />
          ))}
          {snap.fx.map((f) => (
            <Effect key={f.id} f={f} />
          ))}
          <div className="absolute inset-x-0 bottom-0 flex h-[8%]">
            <div className="flex w-[60%] items-center justify-center bg-gradient-to-t from-blue-700 to-sky-400 font-bold text-white">
              💧 Water
            </div>
            <div className="flex w-[40%] items-center justify-center bg-gradient-to-t from-red-700 to-orange-400 font-bold text-white">
              🌋 Volcano
            </div>
          </div>
          {snap.flash && <div className="kt-flash absolute inset-0 z-20 bg-yellow-200" />}
          {snap.over && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-black/70 text-white">
              <h2 className="text-5xl font-black">💀 게임 오버</h2>
              <p className="text-3xl">
                점수 <span className="font-black text-yellow-300">{snap.score}</span> · Lv.{snap.level}
              </p>
              <div className="flex gap-3">
                <button className={`${BTN} bg-emerald-500`} onClick={onRestart}>
                  다시 하기
                </button>
                <button className={`${BTN} bg-white text-slate-800`} onClick={onExit}>
                  메인으로
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
          placeholder="단어 입력 후 Enter"
        />
      )}
    </GameShell>
  );
}

/* ================= 메인 메뉴 ================= */
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl bg-white/80 p-6 shadow-lg">
      <h2 className="mb-4 text-2xl font-black">{title}</h2>
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
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Panel title="1. 플레이어">
        <div className="flex flex-wrap gap-3">
          {PLAYERS.map((p) => (
            <button
              key={p}
              className={`${BTN} ${player === p ? "bg-indigo-500 text-white" : "bg-white"}`}
              onClick={() => setPlayer(p)}
            >
              {p}
            </button>
          ))}
        </div>
        {player === PLAYER_FRIEND && (
          <input
            className="mt-4 w-full max-w-sm rounded-2xl border-4 border-indigo-300 px-4 py-2 text-2xl outline-none focus:border-indigo-500"
            value={friend}
            maxLength={8}
            placeholder="이름 입력 (비우면 '친구')"
            onChange={(e) => setFriend(e.target.value)}
          />
        )}
      </Panel>
      <Panel title="2. 언어">
        <div className="flex flex-wrap gap-3">
          {(Object.keys(LANG_LABEL) as Lang[]).map((l) => (
            <button
              key={l}
              className={`${BTN} ${lang === l ? "bg-indigo-500 text-white" : "bg-white"}`}
              onClick={() => setLang(l)}
            >
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="3. 모드 (선택하면 바로 시작)">
        <div className="grid gap-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`${BTN} flex flex-col items-start bg-gradient-to-r from-amber-200 to-pink-200 text-left`}
              onClick={() => onLaunch(m.id)}
            >
              <span className="text-2xl">{m.label}</span>
              <span className="text-base font-semibold text-slate-600">{m.desc}</span>
            </button>
          ))}
        </div>
      </Panel>
    </section>
  );
}

/* ================= 루트 ================= */
export default function Page() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [player, setPlayer] = useState<Player>("Tei");
  const [friend, setFriend] = useState("");
  const [lang, setLang] = useState<Lang>("en");
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

  const cfg: GameCfg = { name: player === PLAYER_FRIEND ? friend.trim() || "친구" : player, lang };
  const launch = (m: Mode) => {
    setRunKey((k) => k + 1);
    setScreen(m);
  };
  const restart = () => setRunKey((k) => k + 1);
  const toMenu = () => setScreen("menu");

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-100 via-violet-100 to-pink-100 px-4 py-6 text-slate-800">
      <style>{CSS}</style>
      <header className="mx-auto mb-6 flex max-w-4xl items-center justify-between gap-4">
        <h1 className="text-4xl font-black sm:text-5xl">⌨️ 키즈 타자 경쟁</h1>
        <button className={`${BTN} bg-white text-lg`} onClick={() => setSound((s) => !s)}>
          {sound ? "🔊 사운드 On" : "🔇 사운드 Off"}
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
