'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { detectTier } from '../showcase/LumenScene';
import { AmbientDrone, type DroneVoice } from '../showcase/AmbientDrone';
import { HajarScene, type HajarState } from './HajarScene';
import s from './darAlHajar.module.css';

gsap.registerPlugin(ScrollTrigger, SplitText);

type Keyframe = Omit<HajarState, 'intro'>;

// One camera + world keyframe per chapter. side > 0 puts the palace on the left
// of the frame (copy on the right), side < 0 the reverse.
const CHAPTER_KEYS: Keyframe[] = [
  { camX: -62, camY: 30, camZ: 92, tgtX: 0, tgtY: 26, tgtZ: 0, side: 0, build: 1, ruins: 0, sun: 0.5, glow: 0.12, xray: 0, bloom: 0.45 },
  { camX: 46, camY: 44, camZ: 62, tgtX: 0, tgtY: 24, tgtZ: 0, side: 13, build: 0, ruins: 1, sun: 0.22, glow: 0, xray: 0, bloom: 0.35 },
  { camX: -44, camY: 50, camZ: 56, tgtX: 0, tgtY: 37, tgtZ: 0, side: -13, build: 1, ruins: 0, sun: 0.42, glow: 0, xray: 0, bloom: 0.4 },
  { camX: 42, camY: 24, camZ: 52, tgtX: 0, tgtY: 21, tgtZ: 0, side: 12, build: 1, ruins: 0, sun: 0.6, glow: 0.2, xray: 1, bloom: 0.6 },
  { camX: -24, camY: 46, camZ: 36, tgtX: 1, tgtY: 43, tgtZ: 0, side: -8, build: 1, ruins: 0, sun: 1, glow: 1, xray: 0, bloom: 0.85 },
  { camX: 6, camY: 30, camZ: 130, tgtX: 0, tgtY: 17, tgtZ: 0, side: 0, build: 1, ruins: 0, sun: 1, glow: 1, xray: 0, bloom: 0.8 },
];

const ERAS = ['دار الحجر', 'ذو سيدان', '١٧٨٦م', 'قلب الصخرة', 'القمريات', 'اليوم'];

// A drone in the colour of maqam Hijaz on D: the augmented second (E♭–F♯) floats above a D–A root.
const HIJAZ: DroneVoice[] = [
  [73.42, 'sine', 0.24],
  [110, 'triangle', 0.08],
  [146.83, 'sine', 0.1],
  [311.13, 'sine', 0.018],
  [369.99, 'sine', 0.02],
];

const toArabicDigits = (v: string) => v.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

export default function DarAlHajarExperience() {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
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
    document.body.style.background = '#0b0d18';
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    html.style.overflow = 'hidden';

    let scene: HajarScene | null = null;
    try {
      if (!document.createElement('canvas').getContext('webgl2')) throw new Error('WebGL2 unavailable');
      scene = new HajarScene(canvas, { tier: detectTier(), reducedMotion: reduced });
      scene.resize(canvas.clientWidth, canvas.clientHeight);
    } catch {
      root.dataset.webgl = 'off';
    }

    const lenis = reduced ? null : new Lenis({ lerp: 0.08, wheelMultiplier: 0.85 });
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

    const onPointerMove = (e: PointerEvent) => {
      scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    window.addEventListener('pointermove', onPointerMove);

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

    const counter = { v: 0 };
    const countTween = gsap.to(counter, {
      v: 100,
      duration: reduced ? 0.6 : 2.4,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (countRef.current) countRef.current.textContent = toArabicDigits(String(Math.round(counter.v)).padStart(3, '0'));
        if (barRef.current) barRef.current.style.transform = `scaleX(${counter.v / 100})`;
      },
    });

    (async () => {
      await Promise.all([countTween.then(), scene?.warmUp().catch(() => undefined), document.fonts.ready]);
      if (cancelled) return;

      ctx.add(() => {
        const chapters = gsap.utils.toArray<HTMLElement>('[data-chapter]');

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

        // The big year counts up as chapter two arrives.
        const year = root.querySelector<HTMLElement>('[data-year]');
        if (year && !reduced) {
          const y = { v: 1700 };
          gsap.to(y, {
            v: 1786,
            ease: 'none',
            scrollTrigger: { trigger: year, start: 'top 90%', end: 'top 45%', scrub: true },
            onUpdate: () => (year.textContent = toArabicDigits(String(Math.round(y.v)))),
          });
        }

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
              stagger: 0.1,
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

        const intro = gsap.timeline({
          onComplete: () => {
            html.style.overflow = '';
            lenis?.start();
          },
        });
        intro
          .to('[data-loader-inner]', { opacity: 0, y: -18, duration: 0.6, ease: 'power2.in' })
          .to(loaderRef.current, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.4, ease: 'expo.inOut' }, '-=0.1')
          .to(scene?.state ?? {}, { intro: 1, duration: reduced ? 0.8 : 3.4, ease: 'power3.out' }, '-=1.1');
        if (heroSplit) intro.from(heroSplit.lines, { yPercent: 115, duration: 1.6, ease: 'expo.out', stagger: 0.12 }, '-=2.6');
        intro.from('[data-hero-fade]', { opacity: 0, y: 16, duration: 1.2, ease: 'power3.out', stagger: 0.12 }, '-=1.6');
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

  const replay = () => {
    const lenis = lenisRef.current;
    if (lenis) lenis.scrollTo(0, { duration: 4, easing: (t: number) => 1 - Math.pow(1 - t, 4) });
    else window.scrollTo({ top: 0 });
  };

  const toggleSound = () => {
    if (!droneRef.current) droneRef.current = new AmbientDrone(HIJAZ);
    if (soundOn) droneRef.current.stop();
    else void droneRef.current.start();
    setSoundOn(!soundOn);
  };

  return (
    <main ref={rootRef} className={s.root} dir="rtl" lang="ar">
      <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" />
      <div className={s.fallback} aria-hidden="true" />

      <div ref={loaderRef} className={s.loader} aria-hidden="true">
        <div className={s.loaderInner} data-loader-inner>
          <span className={s.loaderBrand}>دار الحجر</span>
          <span ref={countRef} className={s.loaderCount}>٠٠٠</span>
          <span className={s.loaderTrack}>
            <span ref={barRef} className={s.loaderBar} />
          </span>
        </div>
      </div>

      <header className={s.nav}>
        <span className={s.brand}>دار الحجر</span>
        <button
          type="button"
          className={s.sound}
          onClick={toggleSound}
          aria-pressed={soundOn}
          aria-label={soundOn ? 'إيقاف صوت الوادي' : 'تشغيل صوت الوادي'}
        >
          <span className={`${s.bars} ${soundOn ? s.barsOn : ''}`}>
            <i /><i /><i /><i />
          </span>
          <span className={s.soundLabel}>صوت الوادي</span>
        </button>
      </header>

      <nav className={s.rail} aria-label="الحقب">
        {ERAS.map((label, i) => (
          <span key={label} className={`${s.railItem} ${chapter === i ? s.railActive : ''}`}>
            <span className={s.railDot} />
            <span className={s.railLabel}>{label}</span>
          </span>
        ))}
      </nav>

      <section data-chapter className={`${s.chapter} ${s.hero}`}>
        <div className={s.copyCenter}>
          <p className={s.eyebrow} data-hero-fade>وادي ظهر · صنعاء · اليمن</p>
          <h1 className={s.display} data-hero-title>دار الحجر</h1>
          <p className={s.lede} data-hero-fade>
            قصرٌ نبت من قلب الصخر، على بُعد أربعة عشر كيلومتراً من صنعاء.
          </p>
        </div>
        <div className={s.scrollCue} data-hero-fade>
          <span>مرّر لتبدأ الحكاية</span>
          <i />
        </div>
      </section>

      <section data-chapter className={`${s.chapter} ${s.textRight}`}>
        <div className={s.copy}>
          <p className={s.eyebrow} data-fade>الفصل الأول · ذو سيدان</p>
          <h2 className={s.title} data-reveal>قبل القصر… كانت الصخرة.</h2>
          <p className={s.body} data-fade>
            صخرةٌ من الجرانيت تنهض وحدها في قلب وادي ظهر. ويروي المؤرخون أن فوقها قام حصنٌ قديم يُعرف بحصن ذي سيدان،
            ومن أنقاضه بدأت الحكاية.
          </p>
        </div>
      </section>

      <section data-chapter className={`${s.chapter} ${s.textLeft}`}>
        <div className={s.copy}>
          <p className={s.eyebrow} data-fade>الفصل الثاني · البناء</p>
          <p className={s.year} aria-label="عام ١٧٨٦ للميلاد">
            <span data-year>١٧٨٦</span>
            <small>م</small>
          </p>
          <h2 className={s.title} data-reveal>العمّاري يرفع الحجر فوق الحجر.</h2>
          <p className={s.body} data-fade>
            أمر الإمام المنصور علي بن المهدي عباس وزيرَه علي بن صالح العمّاري ببناء قصرٍ صيفي فوق الصخرة. وكان العمّاري
            مهندساً وفلكياً وشاعراً، فجاء البناء امتداداً للصخرة نفسها.
          </p>
          <dl className={s.specs} data-fade>
            <div><dt>الموقع</dt><dd>وادي ظهر، ١٤ كم شمال غرب صنعاء</dd></div>
            <div><dt>البناء</dt><dd>١٧٨٦م</dd></div>
            <div><dt>المعماري</dt><dd>علي بن صالح العمّاري</dd></div>
          </dl>
        </div>
      </section>

      <section data-chapter className={`${s.chapter} ${s.textRight}`}>
        <div className={s.copy}>
          <p className={s.eyebrow} data-fade>الفصل الثالث · في قلب الصخرة</p>
          <h2 className={s.title} data-reveal>ما لا تراه العين… منحوتٌ في الحجر.</h2>
          <p className={s.body} data-fade>
            بعض الغرف والممرات نُحتت داخل الصخرة، وسلّم القصر يبدأ من الجرانيت نفسه، وبئرٌ بفتحتين تشقّ قلب الصخرة.
          </p>
        </div>
      </section>

      <section data-chapter className={`${s.chapter} ${s.textLeft}`}>
        <div className={s.copy}>
          <p className={s.eyebrow} data-fade>الفصل الرابع · القمريات</p>
          <h2 className={s.title} data-reveal>وحين يحلّ الليل… تتكلّم القمريات.</h2>
          <p className={s.body} data-fade>
            أقواسٌ من الجص الأبيض يسكنها زجاجٌ ملوّن، تُلقي ألوانها على الوادي كل مساء. وفي القرن العشرين جدّد الإمام
            يحيى حميد الدين القصر ليكون مقرّه الصيفي.
          </p>
        </div>
      </section>

      <section data-chapter className={`${s.chapter} ${s.finale}`}>
        <div className={s.copyCenter}>
          <p className={s.eyebrow} data-fade>دار الحجر · وادي ظهر</p>
          <h2 className={s.finaleTitle} data-reveal>حجرٌ يحفظ ذاكرة اليمن.</h2>
          <p className={s.lede} data-fade>معلمٌ يمنيٌّ صمد فوق صخرته لأكثر من قرنين، ويستحق أن يُرى.</p>
          <div className={s.ctaRow} data-fade>
            <button type="button" className={s.cta} onClick={replay}>
              شاهد الحكاية من جديد
            </button>
            <button type="button" className={s.ghost} onClick={toggleSound}>
              {soundOn ? 'أوقف صوت الوادي' : 'استمع إلى صوت الوادي'}
            </button>
          </div>
        </div>
        <p className={s.credit}>
          إعلان تصوّري · مجسّم تعبيري ثلاثي الأبعاد يُرسم حيّاً في المتصفح، وليس نموذجاً معمارياً مطابقاً للقصر
        </p>
      </section>
    </main>
  );
}
