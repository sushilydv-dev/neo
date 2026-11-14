import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import windowPhoto from './assets/photos/window.jpg'
import smilePhoto from './assets/photos/smile.jpg'
import railingPhoto from './assets/photos/railing.jpg'

const SCENES = 8
// the heart beats faster as the confession gets closer, then calms down
const BEAT_MS = [1050, 950, 720, 680, 760, 640, 520, 860]
// how long each page needs before every word / photo on it has fully appeared
const READY_MS = [3000, 3100, 5400, 6200, 4400, 3200, 4700, 0]

/* ---------- heartbeat (Web Audio, synthesized) ---------- */
function useHeartbeat(on, interval) {
  const ctxRef = useRef(null)
  useEffect(() => {
    if (!on) return
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    const ctx = ctxRef.current
    ctx.resume?.()
    const thump = (t, vol) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(70, t)
      o.frequency.exponentialRampToValueAtTime(38, t + 0.16)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + 0.22)
    }
    const beat = () => {
      const t = ctx.currentTime + 0.02
      thump(t, 0.55)
      thump(t + 0.17, 0.35)
    }
    beat()
    const id = setInterval(beat, interval)
    return () => clearInterval(id)
  }, [on, interval])
}

/* ---------- pieces ---------- */
function Heart({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 32 29" aria-hidden="true">
      <path d="M16 28.6S0 18.9 0 8.6C0 3.9 3.6 0 8.2 0c3.3 0 6.1 2 7.8 4.9C17.7 2 20.5 0 23.8 0 28.4 0 32 3.9 32 8.6 32 18.9 16 28.6 16 28.6z" />
    </svg>
  )
}

/* words fade up one by one */
function Words({ text, delay = 0, step = 0.11, className = '' }) {
  return (
    <span className={className}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="word" style={{ animationDelay: `${delay + i * step}s` }}>
          {w}&nbsp;
        </span>
      ))}
    </span>
  )
}

function Petals({ count = 22 }) {
  const items = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 8 + Math.random() * 20,
      delay: -Math.random() * 18,
      dur: 12 + Math.random() * 12,
      drift: (Math.random() - 0.5) * 140,
      op: 0.25 + Math.random() * 0.5,
    })),
  ).current
  return (
    <div className="petals" aria-hidden="true">
      {items.map((p) => (
        <Heart
          key={p.id}
          className="petal"
          style={{
            left: `${p.left}%`,
            width: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            opacity: p.op,
            '--drift': `${p.drift}px`,
          }}
        />
      ))}
    </div>
  )
}

function burst(x, y, n = 14, spread = 140) {
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span')
    s.className = 'burst'
    s.textContent = '♥'
    const a = Math.random() * Math.PI * 2
    const d = spread * (0.4 + Math.random() * 0.6)
    s.style.left = `${x}px`
    s.style.top = `${y}px`
    s.style.setProperty('--dx', `${Math.cos(a) * d}px`)
    s.style.setProperty('--dy', `${Math.sin(a) * d - 40}px`)
    s.style.fontSize = `${12 + Math.random() * 18}px`
    document.body.appendChild(s)
    setTimeout(() => s.remove(), 1400)
  }
}

/* counts up to a number */
function CountUp({ to, duration = 2600 }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, duration])
  return <>{n.toLocaleString('en-IN')}</>
}

/* words that shyly run away from the cursor / finger */
function ShyText({ text }) {
  const ref = useRef(null)
  useEffect(() => {
    const spans = [...ref.current.querySelectorAll('.shy')]
    const move = (e) => {
      const p = e.touches ? e.touches[0] : e
      spans.forEach((s) => {
        const r = s.getBoundingClientRect()
        const dx = r.left + r.width / 2 - p.clientX
        const dy = r.top + r.height / 2 - p.clientY
        const dist = Math.hypot(dx, dy) || 1
        const R = 130
        if (dist < R) {
          const f = (1 - dist / R) * 38
          s.style.transform = `translate(${(dx / dist) * f}px, ${(dy / dist) * f}px) rotate(${dx > 0 ? 6 : -6}deg)`
          s.classList.add('blush')
        } else {
          s.style.transform = ''
          s.classList.remove('blush')
        }
      })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('touchmove', move, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('touchmove', move)
    }
  }, [])
  return (
    <p ref={ref} className="shy-line">
      {text.split(' ').map((w, i) => (
        <span key={i} className="shy-wrap word" style={{ animationDelay: `${0.3 + i * 0.09}s` }}>
          <span className="shy">{w}</span>&nbsp;
        </span>
      ))}
    </p>
  )
}

/* ---------- the scenes ---------- */

function SceneIntro() {
  return (
    <div className="scene center">
      <p className="whisper">
        <Words text="There is something I have been hiding from all of you for a very long time." step={0.12} />
      </p>
    </div>
  )
}

function SceneName() {
  return (
    <div className="scene split">
      <div className="portrait">
        <img src={windowPhoto} alt="Rahul" />
      </div>
      <div className="split-text">
        <h1 className="big">
          <Words text="My name is" />
          <br />
          <Words text="Rahul Bhatt." delay={0.35} className="name" />
        </h1>
        <p className="after mono-after fade-late">and I need to tell you who I really am.</p>
      </div>
    </div>
  )
}

const MARQUEE = [
  'RAHUL BHATT IS GAY ♥ ',
  'I AM GAY ♥ I AM A BOTTOM ♥ ',
  'OUT LOUD ♥ NO MORE HIDING ♥ ',
  'RAHUL BHATT IS GAY ♥ ',
  'I AM A BOTTOM ♥ I AM PROUD ♥ ',
]

function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      {MARQUEE.map((t, i) => (
        <div key={i} className={`marquee-row ${i % 2 ? 'rev' : ''}`} style={{ '--d': `${i * 0.25}s` }}>
          <span>{t.repeat(6)}</span>
          <span>{t.repeat(6)}</span>
        </div>
      ))}
    </div>
  )
}

function SceneGay() {
  return (
    <div className="scene center declare">
      <Marquee />
      <p className="declare-pre">
        <Words text="I am" delay={0.6} step={0.25} />
      </p>
      <h1 className="declare-word" aria-label="I am gay.">
        {'GAY.'.split('').map((c, i) => (
          <span
            key={i}
            className="slam"
            style={{ animationDelay: `${1.2 + i * 0.16}s, 2.6s`, '--bp': `${i * 33}%` }}
          >
            {c}
          </span>
        ))}
      </h1>
      <p className="declare-and" aria-label="and I am a bottom.">
        <span className="word and-pre" style={{ animationDelay: '2.6s' }}>
          and I am a&nbsp;
        </span>
        <span className="bottom-word">
          {'BOTTOM.'.split('').map((c, i) => (
            <span key={i} className="slam-solid" style={{ animationDelay: `${2.9 + i * 0.09}s` }}>
              {c}
            </span>
          ))}
        </span>
      </p>
      <p className="declare-post" style={{ animation: 'fadeIn 1.2s ease 4.1s both' }}>
        Loudly. Proudly. To the whole world.
        <br />
        For the very first time.
      </p>
    </div>
  )
}

const TRUTHS = [
  { text: 'I am gay.', cls: '' },
  { text: 'I am a bottom.', cls: '' },
  { text: 'There is only one boy I ever want to kiss.', cls: 'soft' },
  { text: 'He is my love.', cls: 'love' },
]

function SceneTruths() {
  return (
    <div className="scene center truths">
      <p className="truths-pre">
        <Words text="So let me say all of it, clearly:" />
      </p>
      <ul className="truth-list">
        {TRUTHS.map((t, i) => (
          <li key={t.text} className={`truth ${t.cls}`} style={{ animationDelay: `${0.9 + i * 0.85}s` }}>
            {t.text}
          </li>
        ))}
      </ul>
      <p className="forever" style={{ animationDelay: `${0.9 + TRUTHS.length * 0.85 + 0.4}s` }}>
        And I want to spend the rest of my life
        <br />
        <em>with him. Only him.</em>
      </p>
    </div>
  )
}

function SceneYears() {
  return (
    <div className="scene center">
      <p className="lead">
        <Words text="And for more than five years," />
      </p>
      <p className="lead">
        <Words text="I have been in love with my best friend." delay={0.5} />
      </p>
      <div className="counter word" style={{ animationDelay: '1.4s' }}>
        <span className="counter-num">
          <CountUp to={1826} />
        </span>
        <span className="counter-label">days, and counting</span>
      </div>
      <div className="memories">
        {['since school', 'phone calls past midnight', 'hours that felt like minutes'].map((m, i) => (
          <span key={m} className="memory word" style={{ animationDelay: `${2.6 + i * 0.35}s` }}>
            {m}
          </span>
        ))}
      </div>
    </div>
  )
}

function SceneShy() {
  return (
    <div className="scene split reverse">
      <div className="bubble-photo word" style={{ animationDelay: '0.1s' }}>
        <img src={smilePhoto} alt="Rahul smiling" />
      </div>
      <div className="split-text">
        <ShyText text="When he just looks at me, I get so shy that every word runs away." />
        <p className="after fade-late">
          (try catching them, you&rsquo;ll see)
          <br />
          So I&rsquo;m saying it here instead. To all of you.
        </p>
      </div>
    </div>
  )
}

function SceneLove() {
  return (
    <div className="scene center">
      <p className="lead">
        <Words text="I have never said these words before:" />
      </p>
      <svg className="ily" viewBox="0 0 900 260" role="img" aria-label="I love him.">
        <text x="50%" y="62%" textAnchor="middle">
          I love him.
        </text>
      </svg>
      <p className="after fade-later">
        The only boy I ever want to kiss. The one I want forever.
        <br />
        And I&rsquo;m done being afraid of it.
      </p>
    </div>
  )
}

function SceneWorld({ onRestart }) {
  const [love, setLove] = useState(0)
  const send = (e) => {
    e.stopPropagation()
    setLove((n) => n + 1)
    const r = e.currentTarget.getBoundingClientRect()
    burst(r.left + r.width / 2, r.top + r.height / 2, 18, 180)
  }
  return (
    <div className="scene center" onClick={(e) => e.stopPropagation()}>
      <p className="lead">
        <Words text="I don't know what he will say. And that's okay." />
      </p>
      <p className="always word" style={{ animationDelay: '1.2s' }}>
        No matter what,
        <br />
        <em>I will always like him.</em>
      </p>

      <div className="world word" style={{ animationDelay: '2.6s' }}>
        <div className="trio">
          <img src={smilePhoto} alt="" />
          <img src={windowPhoto} alt="" />
          <img src={railingPhoto} alt="" />
        </div>
        <p className="signature">
          This is me. Rahul Bhatt.
          <br />
          <strong className="proud">I am gay</strong>, I am a bottom, and I am in love with one boy.
          <br />
          I want my whole life with him, and I am not hiding anymore.
        </p>
        <span className="pride" aria-hidden="true" />
        <div className="actions">
          <button className="send-love" onClick={send}>
            <Heart /> send Rahul some love
            {love > 0 && <span className="love-count">{love}</span>}
          </button>
          <button className="restart" onClick={onRestart}>
            ↺ again
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- app ---------- */

export default function App() {
  const [scene, setScene] = useState(0)
  const [started, setStarted] = useState(false)
  const [sound, setSound] = useState(true)
  const [bloom, setBloom] = useState(null) // {x,y}
  const [ready, setReady] = useState(false)

  const colored = scene >= 2
  const isLast = scene >= SCENES - 1
  useHeartbeat(started && sound, BEAT_MS[scene])

  // a page only unlocks once everything on it has finished appearing
  useEffect(() => {
    const id = setTimeout(() => setReady(true), READY_MS[scene])
    return () => clearTimeout(id)
  }, [scene])

  const next = useCallback(
    (x, y) => {
      if (!ready || scene >= SCENES - 1) return
      setReady(false)
      setStarted(true)
      if (scene === 1) {
        const px = x ?? window.innerWidth / 2
        const py = y ?? window.innerHeight / 2
        setBloom({ x: px, y: py })
        burst(px, py, 30, 220)
      }
      setScene((s) => s + 1)
    },
    [scene, ready],
  )

  const prev = useCallback(() => {
    if (scene === 0) return
    setReady(false)
    if (scene - 1 < 2) setBloom(null)
    setScene(scene - 1)
  }, [scene])

  useEffect(() => {
    const onKey = (e) => {
      if (['ArrowRight', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault()
        next()
      }
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  const restart = (e) => {
    e.stopPropagation()
    setBloom(null)
    setReady(false)
    setScene(0)
  }

  return (
    <div
      className={`app ${colored ? 'colored' : 'mono'} ${ready && !isLast ? 'is-ready' : 'is-waiting'}`}
      onClick={(e) => next(e.clientX, e.clientY)}
      style={{ '--beat': `${BEAT_MS[scene]}ms` }}
    >
      <div
        className={`bloom ${bloom ? 'open' : ''}`}
        style={bloom ? { '--bx': `${bloom.x}px`, '--by': `${bloom.y}px` } : undefined}
      />
      {colored && <Petals />}

      <main className="stage" key={scene}>
        {scene === 0 && <SceneIntro />}
        {scene === 1 && <SceneName />}
        {scene === 2 && <SceneGay />}
        {scene === 3 && <SceneTruths />}
        {scene === 4 && <SceneYears />}
        {scene === 5 && <SceneShy />}
        {scene === 6 && <SceneLove />}
        {scene === 7 && <SceneWorld onRestart={restart} />}
      </main>

      {ready && !isLast && (
        <div className="continue" key={`c${scene}`} aria-live="polite">
          tap to continue <span>→</span>
        </div>
      )}

      <div className="hud" onClick={(e) => e.stopPropagation()}>
        <Heart className="beat-heart" />
        <div className="progress">
          {Array.from({ length: SCENES }, (_, i) => (
            <span key={i} className={i <= scene ? 'on' : ''} />
          ))}
        </div>
        <button className="sound" onClick={() => setSound((s) => !s)} aria-label="Toggle heartbeat sound">
          {sound ? 'sound on' : 'sound off'}
        </button>
      </div>
    </div>
  )
}
