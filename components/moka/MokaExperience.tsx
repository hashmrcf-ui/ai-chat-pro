'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { detectTier } from '../showcase/LumenScene';
import { MokaScene, type MokaState } from './MokaScene';
import s from './moka.module.css';

gsap.registerPlugin(ScrollTrigger, SplitText);

type Key = Partial<MokaState>;

// The loader looks straight down into the cup; every chapter after is a scroll keyframe.
const LOADER_KEY: Key = { camX: 0, camY: 3.3, camZ: 0.75, tgtX: 0, tgtY: 0.35, tgtZ: 0, side: 0 };
const CHAPTER_KEYS: Key[] = [
  { camX: 0, camY: 1.05, camZ: 5.0, tgtX: 0, tgtY: 0.18, tgtZ: 0, side: 0, spin: 0.15, bloom: 0.25, exposure: 1.2 },
  { camX: 1.25, camY: 0.8, camZ: 1.75, tgtX: 0, tgtY: 0.62, tgtZ: 0, side: 0.38, spin: 0.08, bloom: 0.2 },
  { camX: -0.95, camY: 2.05, camZ: 1.7, tgtX: 0, tgtY: 1.1, tgtZ: 0, side: -0.32, spin: 0.1, bloom: 0.3 },
  { camX: 0, camY: 1.7, camZ: 7.8, tgtX: 0, tgtY: 0.45, tgtZ: 0, side: 0, spin: 0.5, bloom: 0.25 },
];

const toArabicDigits = (v: string) => v.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

export default function MokaExperience() {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    let cancelled = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const html = document.documentElement;
    const prevBodyBg = document.body.style.background;
    document.body.style.background = '#080808';
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    html.style.overflow = 'hidden';

    let scene: MokaScene | null = null;
    try {
      if (!document.createElement('canvas').getContext('webgl2')) throw new Error('WebGL2 unavailable');
      scene = new MokaScene(canvas, { tier: detectTier(), reducedMotion: reduced });
      scene.resize(canvas.clientWidth, canvas.clientHeight);
      Object.assign(scene.state, LOADER_KEY);
    } catch {
      root.dataset.webgl = 'off';
    }

    const lenis = reduced ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
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

    // Drag the cup: momentum on release, friction in the scene.
    let dragging = false;
    let lastX = 0;
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('a, button')) return;
      dragging = true;
      lastX = e.clientX;
      root.classList.add(s.grabbing);
    };
    const onMove = (e: PointerEvent) => {
      scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
      if (!dragging) return;
      scene?.drag(e.clientX - lastX);
      lastX = e.clientX;
    };
    const onUp = () => {
      dragging = false;
      root.classList.remove(s.grabbing);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    const coarse = window.matchMedia('(pointer: coarse)').matches;
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

    (async () => {
      // next/font hashes family names, so read the real ones from the CSS variables.
      const css = getComputedStyle(root);
      const fonts = {
        arabic: `${css.getPropertyValue('--font-kufi').trim() || "'Reem Kufi'"}, sans-serif`,
        latin: `${css.getPropertyValue('--font-inter').trim() || "'Inter'"}, sans-serif`,
      };
      await Promise.all([
        document.fonts.load(`700 250px ${fonts.arabic}`, 'موكا'),
        document.fonts.load(`800 190px ${fonts.latin}`, 'MOKA'),
        document.fonts.ready,
      ]).catch(() => undefined);
      scene?.refreshPrint(fonts);
      await scene?.warmUp().catch(() => undefined);
      if (cancelled) return;

      ctx.add(() => {
        const chapters = gsap.utils.toArray<HTMLElement>('[data-chapter]');
        const heroTitle = root.querySelector<HTMLElement>('[data-hero-title]');
        const heroSplit = heroTitle && !reduced ? SplitText.create(heroTitle, { type: 'lines', mask: 'lines' }) : null;
        if (heroSplit) {
          splits.push(heroSplit);
          gsap.set(heroSplit.lines, { yPercent: 115 });
        }
        gsap.set('[data-hero-fade]', { opacity: 0, y: 14 });

        // --- The loader IS the cup: coffee rises with the percentage, then the lid seats. ---
        const counter = { v: 0 };
        const st = scene?.state ?? ({} as MokaState);
        const intro = gsap.timeline();
        intro
          .to(coverRef.current, { opacity: 0, duration: 0.8, ease: 'power2.out' })
          .to(counter, {
            v: 100,
            duration: reduced ? 0.8 : 2.8,
            ease: 'power1.inOut',
            onUpdate: () => {
              const p = counter.v / 100;
              if (countRef.current) countRef.current.textContent = toArabicDigits(String(Math.round(counter.v)));
              if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
              st.fill = p;
              st.crema = gsap.utils.clamp(0, 1, (p - 0.55) / 0.45);
            },
          }, '-=0.4')
          .to(st, { lid: 1, duration: 0.9, ease: 'back.out(1.6)' }, '+=0.15')
          .to(st, { steam: 1, duration: 1.6, ease: 'power2.out' }, '-=0.3')
          .to(loaderRef.current, { opacity: 0, y: -12, duration: 0.6, ease: 'power2.in' }, '<')
          .to(st, { ...CHAPTER_KEYS[0], duration: reduced ? 0.8 : 2.2, ease: 'power3.inOut' }, '-=1.1');
        if (heroSplit) intro.to(heroSplit.lines, { yPercent: 0, duration: 1.5, ease: 'expo.out', stagger: 0.12 }, '-=1.1');
        intro
          .to('[data-hero-fade]', { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.1 }, '-=1.1')
          .add(() => {
            html.style.overflow = '';
            lenis?.start();
            buildScroll();
          });

        function buildScroll() {
          if (scene) {
            const tops = chapters.map((c) => c.offsetTop);
            const totalScroll = root!.scrollHeight - window.innerHeight;
            const tl = gsap.timeline({
              defaults: { ease: 'sine.inOut' },
              scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: true },
            });
            tl.set(scene.state, CHAPTER_KEYS[0], 0);
            for (let i = 1; i < chapters.length; i++) {
              tl.to(scene.state, { ...CHAPTER_KEYS[i], duration: tops[i] - tops[i - 1] }, tops[i - 1]);
            }
            const tail = totalScroll - tops[tops.length - 1];
            if (tail > 0) tl.to({}, { duration: tail });
          }
          if (reduced) return;
          gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
            const split = SplitText.create(el, { type: 'lines', mask: 'lines' });
            splits.push(split);
            gsap.from(split.lines, {
              yPercent: 115,
              duration: 1.3,
              ease: 'expo.out',
              stagger: 0.1,
              scrollTrigger: { trigger: el, start: 'top 82%', toggleActions: 'play none none reverse' },
            });
          });
          gsap.utils.toArray<HTMLElement>('[data-fade]').forEach((el) => {
            gsap.from(el, {
              opacity: 0,
              y: 20,
              duration: 1.1,
              ease: 'power3.out',
              scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
            });
          });
        }
      });
    })();

    return () => {
      cancelled = true;
      ctx.revert();
      splits.forEach((split) => split.revert());
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('resize', onResize);
      lenis?.destroy();
      scene?.dispose();
      html.style.overflow = '';
      document.body.style.background = prevBodyBg;
      history.scrollRestoration = 'auto';
    };
  }, []);

  return (
    <main ref={rootRef} className={s.root} dir="rtl" lang="ar">
      <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" />
      <div className={s.fallback} aria-hidden="true" />
      <div ref={coverRef} className={s.cover} aria-hidden="true" />

      <header className={s.nav}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={s.logo} src="moka/logo.png" alt="موكا" width={263} height={43} />
        <span className={s.navNote}>صنعاء · منذ ١٩٩١</span>
      </header>

      <div ref={loaderRef} className={s.loader} aria-hidden="true">
        <span className={s.loaderLabel}>نحضّر قهوتك</span>
        <span className={s.loaderCount}>
          <span ref={countRef}>٠</span>
          <small>٪</small>
        </span>
        <span className={s.loaderTrack}>
          <span ref={barRef} className={s.loaderBar} />
        </span>
      </div>

      <section data-chapter className={`${s.chapter} ${s.hero}`}>
        <div className={s.heroCopy}>
          <p className={s.kicker} data-hero-fade>MOKA CUP — SINCE 1991</p>
          <h1 className={s.display} data-hero-title>
            كوبٌ واحد.
            <br />
            خمسةٌ وثلاثون عاماً.
          </h1>
          <p className={s.hint} data-hero-fade>
            <span className={s.hintDot} />
            اسحب الكوب لتديره
          </p>
        </div>
      </section>

      <section data-chapter className={`${s.chapter} ${s.textRight}`}>
        <div className={s.copy}>
          <p className={s.eyebrow} data-fade>٠١ — الجدار</p>
          <h2 className={s.title} data-reveal>تموّجٌ يحفظ الحرارة.</h2>
          <p className={s.body} data-fade>
            جدارٌ مموّج بتجاويف هواء صغيرة يُبقي القهوة ساخنة، ويدَك مرتاحة مهما طال الطريق.
          </p>
        </div>
      </section>

      <section data-chapter className={`${s.chapter} ${s.textLeft}`}>
        <div className={s.copy}>
          <p className={s.eyebrow} data-fade>٠٢ — الغطاء</p>
          <h2 className={s.title} data-reveal>يُغلق بإحكام، ويتنفّس بخاراً.</h2>
          <p className={s.body} data-fade>غطاءٌ أسود محكم بفتحة شرب، لتأخذ قهوتك معك أينما ذهبت.</p>
        </div>
      </section>

      <section data-chapter className={`${s.chapter} ${s.finale}`}>
        <div className={s.heroCopy}>
          <p className={s.eyebrow} data-fade>الفصل التالي</p>
          <h2 className={s.display} data-reveal>من حبّة البنّ… إلى الكوب.</h2>
          <p className={s.credit} data-fade>
            نموذج أولي · الكوب الحالي مؤقت، وسيُستبدل بمجسّم Blender النهائي
          </p>
        </div>
      </section>
    </main>
  );
}
