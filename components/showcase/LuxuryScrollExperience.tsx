'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { LumenScene, detectTier, type SceneState } from './LumenScene';
import { AmbientDrone } from './AmbientDrone';
import s from './showcase.module.css';

gsap.registerPlugin(ScrollTrigger, SplitText);

type Keyframe = Omit<SceneState, 'intro'>;

// Art direction: one camera/scene keyframe per chapter. The stone sits opposite
// the copy (tgtX pushes it right when text is left, and vice versa).
const CHAPTER_KEYS: Keyframe[] = [
  { camX: 0, camY: 0.35, camZ: 7.6, tgtX: 0, tgtY: -0.55, tgtZ: 0, morph: 0, rings: 0, palette: 0, exposure: 1, bloom: 0.55 },
  { camX: 3.4, camY: 1.3, camZ: 5.0, tgtX: -1.35, tgtY: 0.1, tgtZ: 0, morph: 1, rings: 0.12, palette: 1, exposure: 1.05, bloom: 0.62 },
  { camX: -3.0, camY: -2.0, camZ: 6.2, tgtX: 1.45, tgtY: -0.2, tgtZ: 0, morph: 2, rings: 0.3, palette: 2, exposure: 0.95, bloom: 0.72 },
  { camX: 0.2, camY: 6.2, camZ: 6.6, tgtX: 0, tgtY: 1.1, tgtZ: 0, morph: 2, rings: 1, palette: 3, exposure: 1, bloom: 0.6 },
  { camX: 0, camY: 0.4, camZ: 10.5, tgtX: 0, tgtY: -1.6, tgtZ: 0, morph: 3, rings: 1, palette: 4, exposure: 1.08, bloom: 0.7 },
];

const CHAPTER_LABELS = ['Lumière', 'The Cut', 'The Origin', 'The Setting', 'Appointment'];

export default function LuxuryScrollExperience() {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const droneRef = useRef<AmbientDrone | null>(null);

  const [chapter, setChapter] = useState(0);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    let cancelled = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const html = document.documentElement;
    const prevBodyBg = document.body.style.background;
    document.body.style.background = '#050506';
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    html.style.overflow = 'hidden';

    // --- WebGL scene (with graceful fallback) ---
    let scene: LumenScene | null = null;
    try {
      if (!document.createElement('canvas').getContext('webgl2')) throw new Error('WebGL2 unavailable');
      scene = new LumenScene(canvas, { tier: detectTier(), reducedMotion: reduced });
      scene.resize(canvas.clientWidth, canvas.clientHeight);
    } catch {
      root.dataset.webgl = 'off'; // reveals the CSS fallback backdrop
    }

    // --- Smooth scroll, driven by GSAP's single RAF loop ---
    const lenis = reduced ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    lenisRef.current = lenis;
    lenis?.stop();
    lenis?.on('scroll', (l: Lenis) => {
      ScrollTrigger.update();
      scene?.setScrollVelocity(l.velocity);
    });
    const tick = (time: number, deltaMs: number) => {
      lenis?.raf(time * 1000);
      scene?.tick(time, deltaMs / 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // --- Pointer: scene parallax + custom cursor ---
    const cursor = cursorRef.current;
    const moveX = cursor ? gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3' }) : null;
    const moveY = cursor ? gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3' }) : null;
    const onPointerMove = (e: PointerEvent) => {
      scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
      moveX?.(e.clientX);
      moveY?.(e.clientY);
      cursor?.classList.add(s.cursorReady);
    };
    const onPointerOver = (e: PointerEvent) => {
      const hit = (e.target as HTMLElement).closest('[data-cursor]');
      cursor?.classList.toggle(s.cursorActive, !!hit);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerover', onPointerOver);

    // Mobile browsers resize the viewport as the URL bar slides; ignore those
    // height-only jitters so the canvas doesn't reallocate mid-scroll.
    let lastW = canvas.clientWidth;
    let lastH = canvas.clientHeight;
    const onResize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (coarse && w === lastW && Math.abs(h - lastH) < 160) return;
      lastW = w;
      lastH = h;
      scene?.resize(w, h);
    };
    window.addEventListener('resize', onResize);

    const ctx = gsap.context(() => {}, root);
    const splits: SplitText[] = [];

    // --- Preloader: counts while shaders compile and fonts arrive ---
    const counter = { v: 0 };
    const countTween = gsap.to(counter, {
      v: 100,
      duration: reduced ? 0.6 : 2.2,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (countRef.current) countRef.current.textContent = String(Math.round(counter.v)).padStart(3, '0');
        if (barRef.current) barRef.current.style.transform = `scaleX(${counter.v / 100})`;
      },
    });

    (async () => {
      await Promise.all([countTween.then(), scene?.warmUp().catch(() => undefined), document.fonts.ready]);
      if (cancelled) return;

      ctx.add(() => {
        const chapters = gsap.utils.toArray<HTMLElement>('[data-chapter]');

        // Scroll → scene. Each keyframe lands exactly when its chapter reaches the top.
        if (scene) {
          Object.assign(scene.state, CHAPTER_KEYS[0]);
          const tops = chapters.map((c) => c.offsetTop);
          const totalScroll = root.scrollHeight - window.innerHeight;
          const tl = gsap.timeline({
            defaults: { ease: 'sine.inOut' },
            scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: true },
          });
          for (let i = 1; i < chapters.length; i++) {
            tl.to(scene.state, { ...CHAPTER_KEYS[i], duration: tops[i] - tops[i - 1] }, tops[i - 1]);
          }
          const tail = totalScroll - tops[tops.length - 1];
          if (tail > 0) tl.to({}, { duration: tail });
        }

        chapters.forEach((el, i) => {
          ScrollTrigger.create({
            trigger: el,
            start: 'top center',
            end: 'bottom center',
            onToggle: (self) => self.isActive && setChapter(i),
          });
        });

        // Typography: lines rise from behind a mask as each chapter arrives.
        const heroTitle = root.querySelector<HTMLElement>('[data-hero-title]');
        const heroSplit = heroTitle && !reduced ? SplitText.create(heroTitle, { type: 'lines', mask: 'lines' }) : null;
        if (heroSplit) splits.push(heroSplit);

        if (!reduced) {
          gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
            const split = SplitText.create(el, { type: 'lines', mask: 'lines' });
            splits.push(split);
            gsap.from(split.lines, {
              yPercent: 115,
              duration: 1.3,
              ease: 'expo.out',
              stagger: 0.09,
              scrollTrigger: { trigger: el, start: 'top 82%', toggleActions: 'play none none reverse' },
            });
          });
          gsap.utils.toArray<HTMLElement>('[data-fade]').forEach((el) => {
            gsap.from(el, {
              opacity: 0,
              y: 24,
              duration: 1.2,
              ease: 'power3.out',
              scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
            });
          });
        }

        // --- The curtain ---
        const intro = gsap.timeline({
          onComplete: () => {
            html.style.overflow = '';
            lenis?.start();
          },
        });
        intro
          .to('[data-loader-inner]', { opacity: 0, y: -18, duration: 0.6, ease: 'power2.in' })
          .to(loaderRef.current, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.3, ease: 'expo.inOut' }, '-=0.1')
          .to(scene?.state ?? {}, { intro: 1, duration: reduced ? 0.8 : 2.8, ease: 'power2.out' }, '-=0.9');
        if (heroSplit) {
          intro.from(heroSplit.lines, { yPercent: 115, duration: 1.5, ease: 'expo.out', stagger: 0.12 }, '-=2.4');
        }
        intro.from('[data-hero-fade]', { opacity: 0, y: 16, duration: 1.2, ease: 'power3.out', stagger: 0.1 }, '-=1.4');
      });
    })();

    return () => {
      cancelled = true;
      ctx.revert();
      splits.forEach((split) => split.revert());
      countTween.kill();
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerover', onPointerOver);
      window.removeEventListener('resize', onResize);
      lenis?.destroy();
      lenisRef.current = null;
      scene?.dispose();
      droneRef.current?.dispose();
      droneRef.current = null;
      html.style.overflow = '';
      document.body.style.background = prevBodyBg;
      history.scrollRestoration = 'auto';
    };
  }, []);

  const scrollTo = (target: string | number) => {
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(target, { duration: 3, easing: (t: number) => 1 - Math.pow(1 - t, 4) });
    } else if (typeof target === 'number') {
      window.scrollTo({ top: target });
    } else {
      document.querySelector(target)?.scrollIntoView();
    }
  };

  const toggleSound = () => {
    if (!droneRef.current) droneRef.current = new AmbientDrone();
    if (soundOn) droneRef.current.stop();
    else void droneRef.current.start();
    setSoundOn(!soundOn);
  };

  return (
    <main ref={rootRef} className={s.root}>
      <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" />
      <div className={s.fallback} aria-hidden="true" />

      <div ref={loaderRef} className={s.loader} aria-hidden="true">
        <div className={s.loaderInner} data-loader-inner>
          <span className={s.loaderBrand}>Maison Lumen</span>
          <span ref={countRef} className={s.loaderCount}>000</span>
          <span className={s.loaderTrack}>
            <span ref={barRef} className={s.loaderBar} />
          </span>
        </div>
      </div>

      <div ref={cursorRef} className={s.cursor} aria-hidden="true" />

      <header className={s.nav}>
        <span className={s.brand}>Maison Lumen</span>
        <div className={s.navActions}>
          <button
            type="button"
            className={s.sound}
            onClick={toggleSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute ambient sound' : 'Play ambient sound'}
            data-cursor
          >
            <span className={`${s.bars} ${soundOn ? s.barsOn : ''}`}>
              <i /><i /><i /><i />
            </span>
            <span className={s.soundLabel}>Sound</span>
          </button>
          <button type="button" className={s.pill} onClick={() => scrollTo('#appointment')} data-cursor>
            Private viewing
          </button>
        </div>
      </header>

      <nav className={s.rail} aria-label="Chapters">
        {CHAPTER_LABELS.map((label, i) => (
          <span key={label} className={`${s.railItem} ${chapter === i ? s.railActive : ''}`}>
            <span className={s.railNum}>{String(i + 1).padStart(2, '0')}</span>
            <span className={s.railLabel}>{label}</span>
          </span>
        ))}
      </nav>

      <section data-chapter className={`${s.chapter} ${s.hero}`}>
        <div className={s.copyCenter}>
          <p className={s.eyebrow} data-hero-fade>Haute Joaillerie · Collection N°07</p>
          <h1 className={s.display} data-hero-title>
            Lumière <em>captive</em>
          </h1>
          <p className={s.lede} data-hero-fade>
            A single stone, cut to hold light the way a cathedral holds silence.
          </p>
        </div>
        <div className={s.scrollCue} data-hero-fade>
          <span>Scroll to enter</span>
          <i />
        </div>
      </section>

      <section data-chapter className={`${s.chapter} ${s.left}`}>
        <div className={s.copy}>
          <p className={s.eyebrow} data-fade>I — The Cut</p>
          <h2 className={s.title} data-reveal>
            Fifty-seven facets. <em>One held breath.</em>
          </h2>
          <p className={s.body} data-fade>
            Each plane is angled to within a tenth of a degree, so light that enters is never allowed to leave the
            way it came. It turns, divides, and returns to you as fire.
          </p>
          <dl className={s.specs} data-fade>
            <div><dt>Cut</dt><dd>Brilliant, 57 facets</dd></div>
            <div><dt>Weight</dt><dd>7.07 carats</dd></div>
            <div><dt>Clarity</dt><dd>Flawless</dd></div>
          </dl>
        </div>
      </section>

      <section data-chapter className={`${s.chapter} ${s.right}`}>
        <div className={s.copy}>
          <p className={s.eyebrow} data-fade>II — The Origin</p>
          <h2 className={s.title} data-reveal>
            Three billion years <em>in the dark.</em>
          </h2>
          <p className={s.body} data-fade>
            Formed a hundred and fifty kilometres beneath the earth and carried upward in a single volcanic breath.
            We only finish what the deep began.
          </p>
        </div>
      </section>

      <section data-chapter className={`${s.chapter} ${s.top}`}>
        <div className={s.copyCenter}>
          <p className={s.eyebrow} data-fade>III — The Setting</p>
          <h2 className={s.title} data-reveal>
            An armillary <em>of eighteen-carat gold.</em>
          </h2>
          <p className={s.body} data-fade>
            Three hand-forged rings — equator, meridian, ecliptic — hold the stone the way the heavens were once
            believed to hold the earth.
          </p>
        </div>
      </section>

      <section id="appointment" data-chapter className={`${s.chapter} ${s.finale}`}>
        <div className={s.copyCenter}>
          <p className={s.eyebrow} data-fade>IV — The Appointment</p>
          <h2 className={s.display} data-reveal>
            Yours, <em>by appointment.</em>
          </h2>
          <p className={s.lede} data-fade>
            Collection N°07 is shown privately in Paris, Geneva and Dubai. A single piece. A single owner.
          </p>
          <div className={s.ctaRow} data-fade>
            <a className={s.cta} href="mailto:concierge@maison-lumen.example" data-cursor>
              Request a private viewing
            </a>
            <button type="button" className={s.ghost} onClick={() => scrollTo(0)} data-cursor>
              Begin again
            </button>
          </div>
        </div>
        <p className={s.credit}>
          Concept piece · real-time WebGL, no pre-rendered video · Maison Lumen is a fictional house
        </p>
      </section>
    </main>
  );
}
