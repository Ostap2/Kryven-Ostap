import { useEffect, useRef, useState } from 'react'
import { content as t, links } from './data'
import './App.css'

/* ---------- Маршрут літачка ----------
   Хвиляста лінія, що йде зверху вниз і зліва направо.
   W, H  : розмір viewBox
   amp   : наскільки сильно лінія гойдається вбік
   waves : скільки разів гойднеться
   pad   : на скільки старт/фініш виходять за екран
   Більше H = довший маршрут і повільніший літачок. */
function makePath(W, H, amp, waves, pad, n = 220) {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const k = i / n
    const x =
      -pad + (W + pad * 2) * k +
      amp * Math.sin(2 * Math.PI * waves * k) * Math.sin(Math.PI * k)
    const y = H * k
    d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '
  }
  return d
}

const ROUTE = {
  desktop: { vb: '0 0 1440 1700', d: makePath(1440, 1700, 380, 1.5, 60), scale: 1.7 },
  mobile: { vb: '0 0 400 2100', d: makePath(400, 2100, 140, 3, 40), scale: 1.2 },
}

/* ---------- Паралакс ---------- */
// --y, --p : глобальний скрол (для фону і прогрес-бару)
// --o      : відступ центру секції (.pz) від центру екрана (для локального паралаксу .pl)
function useParallax() {
  useEffect(() => {
    const root = document.documentElement
    const zones = [...document.querySelectorAll('.pz')]
    let ticking = false

    const update = () => {
      const vh = window.innerHeight
      const max = document.body.scrollHeight - vh
      root.style.setProperty('--y', window.scrollY)
      root.style.setProperty('--p', max > 0 ? window.scrollY / max : 0)
      zones.forEach((z) => {
        const r = z.getBoundingClientRect()
        if (r.bottom < -300 || r.top > vh + 300) return
        z.style.setProperty('--o', r.top + r.height / 2 - vh / 2)
      })
      ticking = false
    }
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update) }
    }
    const onMove = (e) => {
      root.style.setProperty('--mx', e.clientX / window.innerWidth - 0.5)
      root.style.setProperty('--my', e.clientY / window.innerHeight - 0.5)
      root.style.setProperty('--cx', e.clientX + 'px')
      root.style.setProperty('--cy', e.clientY + 'px')
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])
}

/* ---------- Поява блоків ---------- */
function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.15 }
    )
    document.querySelectorAll('.rv').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/* ---------- Easter egg: назва вкладки ---------- */
function useTabTitle() {
  useEffect(() => {
    const base = 'Ostap Kryven — Project Manager'
    const away = 'Come back, we have a deadline ⏰'
    const onVis = () => { document.title = document.hidden ? away : base }
    document.title = base
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])
}

/* ---------- Мобільна версія чи ні ---------- */
function useMobile() {
  const q = '(max-width: 760px)'
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return m
}

/* ---------- Рядок, що біжить ---------- */
function Marquee({ items, reverse }) {
  const list = [...items, ...items]
  return (
    <div className={'marquee' + (reverse ? ' rev' : '')}>
      <div>{list.map((s, i) => <span key={i}>{s}</span>)}</div>
    </div>
  )
}

/* ---------- Літачок по пунктирній лінії ---------- */
function Flight({ title, sub }) {
  const mobile = useMobile()
  const route = mobile ? ROUTE.mobile : ROUTE.desktop
  const svg = useRef(null)
  const path = useRef(null)
  const trail = useRef(null)
  const plane = useRef(null)

  useEffect(() => {
    const p = path.current
    const L = p.getTotalLength()
    trail.current.style.strokeDasharray = L
    let ticking = false

    const update = () => {
      const r = svg.current.getBoundingClientRect()
      const vh = window.innerHeight
      // k=0: верх малюнка на 60% висоти екрана. k=1: низ малюнка на 60% висоти.
      // Літачок так літає приблизно посередині екрана і не вилітає за його межі.
      const k = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / r.height))

      const at = k * L
      const pt = p.getPointAtLength(at)
      const a = p.getPointAtLength(Math.max(0, at - 10))
      const b = p.getPointAtLength(Math.min(L, at + 10))
      const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI

      plane.current.setAttribute(
        'transform',
        `translate(${pt.x} ${pt.y}) rotate(${ang}) scale(${route.scale})`
      )
      trail.current.style.strokeDashoffset = L * (1 - k)
      ticking = false
    }
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update) }
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [route])

  return (
    <section className="flight pz">
      <i className="cloud pl" style={{ '--s': -0.3, width: 380, height: 160, top: '8%', left: '8%' }} />
      <i className="cloud pl" style={{ '--s': 0.25, width: 300, height: 120, top: '28%', left: '62%' }} />
      <i className="cloud pl" style={{ '--s': -0.15, width: 460, height: 180, top: '48%', left: '-5%' }} />
      <i className="cloud pl" style={{ '--s': 0.3, width: 340, height: 140, top: '66%', left: '55%' }} />
      <i className="cloud pl" style={{ '--s': -0.25, width: 420, height: 160, top: '84%', left: '10%' }} />

      <div className="flight-text">
        <h3>{title}</h3>
        <p>{sub}</p>
      </div>

      <svg ref={svg} viewBox={route.vb} aria-hidden="true">
        <defs>
          <mask id="trailMask" maskUnits="userSpaceOnUse" x="-500" y="-500" width="2500" height="4000">
            <path ref={trail} d={route.d} fill="none" stroke="#fff" strokeWidth="16" />
          </mask>
        </defs>
        <path ref={path} d={route.d} className="dash base" />
        <path d={route.d} className="dash hot" mask="url(#trailMask)" />
        <g ref={plane} transform="translate(-300 -300)">
          <g className="plane">
            <path d="M30 0 L-24 -20 L-10 0 L-24 20 Z" style={{ fill: 'var(--acc)' }} />
            <path d="M30 0 L-10 0 L-24 20 Z" fill="rgba(0,0,0,.28)" />
          </g>
        </g>
      </svg>
    </section>
  )
}

/* ---------- Канбан-анімація ---------- */
function Kanban() {
  const box = useRef(null)
  const [n, setN] = useState(0)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.4 })
    io.observe(box.current)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!on) return
    const id = setInterval(() => setN((v) => v + 1), 2200)
    return () => clearInterval(id)
  }, [on])

  const step = n % 4            // 0 Plan, 1 Act, 2 Shipped, 3 згасання
  const stage = Math.min(step, 2)
  const icons = ['📝', '⚡', '🚀']

  return (
    <div className="kanban rv" ref={box} style={{ '--st': stage }}>
      {t.cols.map((name, ci) => (
        <div className={'kcol' + (stage === ci && step !== 3 ? ' on' : '')} key={name}>
          <h5>
            {name}
            <em>{stage === ci && step !== 3 ? 1 : 0}</em>
          </h5>
        </div>
      ))}
      <div key={Math.floor(n / 4)} className={'kcard s' + stage + (step === 3 ? ' fade' : '')}>
        <span className="kicon">{icons[stage]}</span>
        <b>{t.stages[stage]}</b>
        <span className="kbar"><u /></span>
      </div>
    </div>
  )
}

/* ---------- Додаток ---------- */
export default function App() {
  useParallax()
  useReveal()
  useTabTitle()

  const ids = ['about', 'experience', 'playbook', 'contact']
  const flipOnTouch = (e) => {
    if (window.matchMedia('(hover: none)').matches) e.currentTarget.classList.toggle('on')
  }

  return (
    <>
      <div className="progress" />
      <div className="glow" />

      {/* Фон (глобальний паралакс) */}
      <div className="bg">
        <i className="orb o1 px" style={{ '--s': -0.15 }} />
        <i className="orb o2 px" style={{ '--s': -0.35 }} />
        <i className="orb o3 px" style={{ '--s': -0.6 }} />
      </div>

      <header className="nav">
        <b>OK.</b>
        <nav>
          {ids.map((id, i) => <a key={id} href={'#' + id}>{t.nav[i]}</a>)}
        </nav>
      </header>

      {/* HERO */}
      <section className="hero pz">
        <h1 className="giant pl" style={{ '--s': -0.25 }}>
          <span>PROJECT</span>
          <span>MANAGER</span>
        </h1>
        <div className="hero-in pl" style={{ '--s': 0.12 }}>
          <img className="photo" src="/photo.jpg" alt="Ostap Kryven" />
          <p className="hello">{t.hello}</p>
          <h2 className="name">Ostap <span>Kryven</span></h2>
          <p className="tag">{t.tagline}</p>
          <a className="btn" href="#contact">{t.cta} →</a>
        </div>
        <div className="scroll-hint">↓</div>
      </section>

      {/* ABOUT */}
      <section id="about" className="sec">
        <h3 className="title rv">{t.aboutTitle}</h3>
        <div className="about-grid">
          <p className="big-line rv">{t.aboutBig}</p>
          <div className="about-text rv">
            {t.about.map((p) => <p key={p}>{p}</p>)}
          </div>
        </div>
        <div className="powers">
          {t.powers.map((p, i) => (
            <div className="card power rv" key={p.t} style={{ '--d': i * 0.1 + 's' }}>
              <span className="n">0{i + 1}</span>
              <h4>{p.t}</h4>
              <p>{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EXPERIENCE */}
      <section id="experience" className="sec">
        <h3 className="title rv">{t.expTitle}</h3>
        <div className="timeline">
          {t.exp.map((e, i) => (
            <article className="job rv" key={i} style={{ '--d': i * 0.1 + 's' }}>
              <span className="date">{e.date}</span>
              <h4>{e.role} <small>@ {e.company}</small></h4>
              <ul>{e.points.map((p) => <li key={p}>{p}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      {/* SKILLS */}
      <section id="skills" className="sec skills-sec">
        <h3 className="title rv">{t.skillsTitle}</h3>
        <Marquee items={t.skills} />
        <Marquee items={[...t.skills].reverse()} reverse />
      </section>

      {/* PLAYBOOK */}
      <section id="playbook" className="sec">
        <h3 className="title rv">{t.playTitle}</h3>
        <div className="steps">
          {t.steps.map((s, i) => (
            <div className="step pz" key={i}>
              <span className="snum pl" style={{ '--s': -0.3 }}>0{i + 1}</span>
              <div className="stext rv">
                <h4>{s.t}</h4>
                <p>{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* QUOTE */}
      <section className="quote pz">
        <span className="qmark pl" style={{ '--s': -0.35 }}>“</span>
        <blockquote className="rv">
          {t.quote}
          <cite>— {t.author}</cite>
        </blockquote>
      </section>

      {/* LAWS */}
      <section className="sec">
        <h3 className="title rv">{t.lawsTitle}</h3>
        <p className="hint rv">{t.lawsHint}</p>
        <div className="laws">
          {t.laws.map((l, i) => (
            <div className="flip rv" key={i} style={{ '--d': (i % 3) * 0.1 + 's' }} onClick={flipOnTouch}>
              <div className="flip-in">
                <div className="face front"><p>“{l.q}”</p></div>
                <div className="face back">
                  <b>{l.who}</b>
                  <span>{l.name}</span>
                  <p>{l.mean}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* KANBAN */}
      {/* <section className="sec">
        <h3 className="title rv">{t.kanbanTitle}</h3>
        <Kanban />
      </section> */}

      {/* FLIGHT */}
      <Flight title={t.flightTitle} sub={t.flightSub} />

      {/* CONTACT */}
      <section id="contact" className="sec contact">
        <h3 className="big rv">{t.contactTitle}</h3>
        <p className="lead rv">{t.contactSub}</p>
        <a className="mail rv" href={'mailto:' + links.email}>{links.email}</a>
        <div className="socials rv">
          <a href={links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
          <a href={links.telegram} target="_blank" rel="noreferrer">Telegram</a>
          <a href={links.github} target="_blank" rel="noreferrer">GitHub</a>
        </div>
        <footer>© {new Date().getFullYear()} Ostap Kryven</footer>
      </section>
    </>
  )
}