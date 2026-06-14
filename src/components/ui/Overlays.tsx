/**
 * Overlays.tsx — full-screen UI: main menu, intro, pause, the Act-2 phone
 * reply (GDD §14), caught screen and the four endings (GDD §16).
 */

import { useEffect, useRef, useState } from 'react';
import { useGameStore, type AutoPlayEnding, type Difficulty, type EndingId } from '../../state/gameStore';
import {
  JUMPSCARE_FACE_SECONDS,
  JUMPSCARE_SCREAM_SECONDS,
  REPLY_COUNTDOWN,
} from '../../constants';
import { audioEngine } from '../../systems/audio';
import { resetAutoPlay } from '../../game/autoPlay';

// ── menu ────────────────────────────────────────────────────────────────────

const DIFFS: { id: Difficulty; name: string; desc: string }[] = [
  { id: 'easy', name: 'EASY — “Heavy Sleeper”', desc: 'Mom never wakes up. Learn the house. Map always on.' },
  { id: 'normal', name: 'NORMAL — “Light Sleeper”', desc: 'The intended experience. Map + status warnings.' },
  { id: 'hard', name: 'HARD — “She Knows”', desc: 'No map. No warnings. She remembers. She pretends.' },
];

const AUTO_ENDINGS: { id: AutoPlayEnding; name: string; desc: string }[] = [
  { id: 'goodnight', name: '🌙 Good Night', desc: 'Find phone, reply, return, bed. The perfect run.' },
  { id: 'coward', name: '🐔 The Coward', desc: 'Find phone, skip reply, return, bed. Play it safe.' },
  { id: 'waiting', name: '👻 The Waiting Kind', desc: "Secret ending. Hide under Mom's bed." },
];

function Menu() {
  const difficulty = useGameStore((s) => s.difficulty);
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const startRun = useGameStore((s) => s.startRun);
  const setAutoPlay = useGameStore((s) => s.setAutoPlay);
  const setAutoPlayEnding = useGameStore((s) => s.setAutoPlayEnding);
  const [showAutoPlay, setShowAutoPlay] = useState(false);

  const handleAutoPlay = (ending: AutoPlayEnding) => {
    audioEngine.init();
    audioEngine.uiBeep(740, 0.05);
    setAutoPlayEnding(ending);
    setAutoPlay(true);
    resetAutoPlay();
    startRun();
  };

  return (
    <div className="overlay menu">
      <h1 className="title">
        DON’T WAKE <span className="title-mom">MOM</span>
      </h1>
      <p className="tagline">a 3D stealth horror-comedy · one catch and it’s over</p>
      <div className="diff-list">
        {DIFFS.map((d) => (
          <button
            key={d.id}
            className={`diff ${difficulty === d.id ? 'selected' : ''}`}
            onClick={() => {
              setDifficulty(d.id);
              audioEngine.init();
              audioEngine.uiBeep(520, 0.04);
            }}
          >
            <strong>{d.name}</strong>
            <span>{d.desc}</span>
          </button>
        ))}
      </div>
      <button
        className="start-btn"
        onClick={() => {
          audioEngine.init();
          audioEngine.uiBeep(740, 0.05);
          setAutoPlay(false);
          startRun();
        }}
      >
        SNEAK OUT
      </button>

      {!showAutoPlay ? (
        <button
          className="auto-play-toggle"
          onClick={() => {
            setShowAutoPlay(true);
            audioEngine.init();
            audioEngine.uiBeep(440, 0.04);
          }}
        >
          🤖 Not sure? Watch the bot play it
        </button>
      ) : (
        <div className="auto-play-picker">
          <p className="auto-play-title">Choose an ending to watch:</p>
          {AUTO_ENDINGS.map((e) => (
            <button
              key={e.id}
              className="auto-ending-btn"
              onClick={() => handleAutoPlay(e.id)}
            >
              <strong>{e.name}</strong>
              <span>{e.desc}</span>
            </button>
          ))}
          <button
            className="auto-play-cancel"
            onClick={() => {
              setShowAutoPlay(false);
              audioEngine.uiBeep(320, 0.03);
            }}
          >
            ← back
          </button>
        </div>
      )}

      <p className="controls-hint">
        WASD move · CTRL sneak quietly · SHIFT run · E interact · F flashlight · B hold breath ·
        Q listen · R lock door · CLICK fire tranq dart · headphones strongly recommended
      </p>
      <p className="controls-hint">
        she roams now. find the brass key → unlock the storage room → crack the safe → tranq gun.
      </p>
    </div>
  );
}

// ── intro ───────────────────────────────────────────────────────────────────

const INTRO_LINES = [
  '2:07 AM.',
  'Mom confiscated your phone at dinner. “You’re addicted to that thing.”',
  'It’s somewhere in the house. Mina is blowing up the group chat without you.',
  'Mom is asleep. Probably.',
  'Find the phone. Reply. Put it back. Get to bed.',
  'And whatever you do —',
  'DON’T. WAKE. MOM.',
];

function Intro() {
  const beginPlay = useGameStore((s) => s.beginPlay);
  const [shown, setShown] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setShown((v) => Math.min(INTRO_LINES.length, v + 1)), 950);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="overlay intro" onClick={() => { audioEngine.startScene(); beginPlay(); }}>
      <div className="intro-text">
        {INTRO_LINES.slice(0, shown).map((l, i) => (
          <p key={i} className={i === INTRO_LINES.length - 1 ? 'intro-final' : ''}>
            {l}
          </p>
        ))}
      </div>
      <p className="click-hint">click to begin</p>
    </div>
  );
}

// ── pause ───────────────────────────────────────────────────────────────────

function Pause() {
  const setGamePhase = useGameStore((s) => s.setGamePhase);
  return (
    <div className="overlay pause" onClick={() => setGamePhase('playing')}>
      <h2>PAUSED</h2>
      <p className="click-hint">click to keep sneaking</p>
      <button
        className="quit-btn"
        onClick={(e) => {
          e.stopPropagation();
          setGamePhase('menu');
        }}
      >
        give up and go to bed (menu)
      </button>
    </div>
  );
}

// ── Act 2: the reply (GDD §14) ──────────────────────────────────────────────

const CHAT = [
  { from: 'mina', text: 'bro did u die' },
  { from: 'mina', text: 'the group chat is BLOWING UP and ur missing it' },
  { from: 'mina', text: 'did ur mom actually take ur phone lmaooo' },
  { from: 'mina', text: 'hello????' },
];

const REPLIES = [
  'im alive. mom took the phone. this is a rescue mission',
  'BRO i am literally army-crawling through my own house rn',
  'cant talk. if i get caught tell my story',
];

function PhoneUI() {
  const closePhone = useGameStore((s) => s.closePhone);
  const [shown, setShown] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const done = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setShown((v) => {
        if (v >= CHAT.length) {
          clearInterval(id);
          return v;
        }
        audioEngine.uiBeep(880, 0.03);
        return v + 1;
      });
    }, 650);
    return () => clearInterval(id);
  }, []);

  // 5-second decision window once all messages are visible
  useEffect(() => {
    if (shown < CHAT.length) return;
    const t0 = performance.now();
    const id = setInterval(() => {
      const next = REPLY_COUNTDOWN - (performance.now() - t0) / 1000;
      if (next <= 0) {
        clearInterval(id);
        if (!done.current) {
          done.current = true;
          closePhone(false, null);
        }
        setTimeLeft(0);
      } else {
        setTimeLeft(next);
      }
    }, 100);
    return () => clearInterval(id);
  }, [shown, closePhone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done.current || shown < CHAT.length) return;
      if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') {
        done.current = true;
        const idx = Number(e.code.slice(-1)) - 1;
        audioEngine.uiBeep(980, 0.05);
        closePhone(true, REPLIES[idx]);
      } else if (e.code === 'Digit4') {
        done.current = true;
        audioEngine.uiBeep(420, 0.05);
        closePhone(false, null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown, closePhone]);

  return (
    <div className="overlay phone-wrap">
      <div className="phone">
        <div className="phone-notch" />
        <div className="phone-header">mina 🐸 · 47 missed messages</div>
        <div className="chat">
          {CHAT.slice(0, shown).map((m, i) => (
            <div key={i} className="bubble them">
              {m.text}
            </div>
          ))}
        </div>
        {shown >= CHAT.length && (
          <div className="replies">
            {REPLIES.map((r, i) => (
              <div key={i} className="reply-opt">
                <b>{i + 1}</b> {r}
              </div>
            ))}
            <div className="reply-opt chicken">
              <b>4</b> put the phone away. say nothing. (no reply = no buzz…)
            </div>
            {timeLeft !== null && (
              <div className="reply-timer">
                <div
                  className="reply-timer-fill"
                  style={{ width: `${(timeLeft / REPLY_COUNTDOWN) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>
      <p className="phone-warning">the screen light feels like a flare. hurry.</p>
    </div>
  );
}

// ── endings (GDD §16) ───────────────────────────────────────────────────────

const ENDINGS: Record<Exclude<EndingId, null>, { title: string; body: string; grade: string }> = {
  goodnight: {
    title: 'ENDING 1 — GOOD NIGHT',
    body: 'You found it. You replied. You put it back and made it to bed. Mom suspects nothing. On Monday, you will have stories. Mina says you’re a legend.',
    grade: 'S',
  },
  coward: {
    title: 'ENDING 2 — THE COWARD',
    body: 'You got the phone back in its place and yourself into bed… but you never replied. You slept safe. Mina left you on read for a week. Worth it? You’ll never know.',
    grade: 'B',
  },
  caught: {
    title: 'CAUGHT',
    body: 'The lights snap on. Phone confiscated until further notice. Also: no allowance, and she’s telling Grandma.',
    grade: 'F',
  },
  waiting: {
    title: 'SECRET ENDING — THE WAITING KIND',
    body: 'You waited under her bed until her breathing went slow, then crawled out of the dark like you were born there. You are no longer a kid sneaking a phone. You are the thing the house is afraid of.',
    grade: '?',
  },
};

/**
 * Caught jumpscare: Mom's face fills the black screen, then everything goes
 * dark — and after ~3 s the scream plays in the darkness (Minh's request).
 */
function CaughtJumpscare({ onDone }: { onDone: () => void }) {
  const [dark, setDark] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    audioEngine.stinger();
    audioEngine.stopScene();
    const scream = new Audio(`${import.meta.env.BASE_URL}scream.mp3`);
    scream.volume = 1;
    const finish = () => {
      if (done.current) return;
      done.current = true;
      onDone();
    };
    const tDark = setTimeout(() => {
      setDark(true);
      scream.addEventListener('ended', finish);
      scream.play().catch(() => undefined);
    }, JUMPSCARE_FACE_SECONDS * 1000);
    // safety net in case the audio can't play
    const tEnd = setTimeout(
      finish,
      (JUMPSCARE_FACE_SECONDS + JUMPSCARE_SCREAM_SECONDS) * 1000,
    );
    return () => {
      clearTimeout(tDark);
      clearTimeout(tEnd);
      scream.pause();
    };
  }, [onDone]);

  return (
    <div className="jumpscare">
      {!dark && (
        <img
          className="jumpscare-face"
          src={`${import.meta.env.BASE_URL}mom_scare.webp`}
          alt=""
          draggable={false}
        />
      )}
    </div>
  );
}

function EndScreen({ caught }: { caught: boolean }) {
  const ending = useGameStore((s) => s.ending);
  const caughtLine = useGameStore((s) => s.caughtLine);
  const startRun = useGameStore((s) => s.startRun);
  const setGamePhase = useGameStore((s) => s.setGamePhase);
  const [scareDone, setScareDone] = useState(!caught);
  const e = ENDINGS[(ending ?? 'caught') as Exclude<EndingId, null>];
  useEffect(() => {
    if (!caught) audioEngine.stopScene();
  }, [caught]);
  if (caught && !scareDone) {
    return <CaughtJumpscare onDone={() => setScareDone(true)} />;
  }
  return (
    <div className={`overlay end ${caught ? 'end-caught' : 'end-good'}`}>
      {caught && <p className="mom-line">“{caughtLine}”</p>}
      <h2>{e.title}</h2>
      <p className="end-body">{e.body}</p>
      <p className="end-grade">
        grade: <b>{e.grade}</b>
      </p>
      <div className="end-buttons">
        <button onClick={() => startRun()}>try again</button>
        <button onClick={() => setGamePhase('menu')}>menu</button>
      </div>
    </div>
  );
}

// ── root ────────────────────────────────────────────────────────────────────

export default function Overlays() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  switch (gamePhase) {
    case 'menu':
      return <Menu />;
    case 'intro':
      return <Intro />;
    case 'paused':
      return <Pause />;
    case 'phone':
      return <PhoneUI />;
    case 'caught':
      return <EndScreen caught />;
    case 'ending':
      return <EndScreen caught={false} />;
    default:
      return null;
  }
}
