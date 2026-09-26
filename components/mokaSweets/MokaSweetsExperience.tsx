'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import catalog from './catalog.json';
import { PhysicsPile } from './PhysicsPile';
import s from './mokaSweets.module.css';

gsap.registerPlugin(ScrollTrigger, SplitText);

const CUP_LINK = process.env.NEXT_PUBLIC_MOKA_CUP_URL || '/moka';
const APP_STORE = 'https://apps.apple.com/us/app/id1508856566';
const GOOGLE_PLAY = 'https://play.google.com/store/apps/details?id=com.mokasweets.user';
const INSTAGRAM = 'https://instagram.com/mokasweets.yemen';

type PanelKey = keyof typeof catalog.panels;

const CATEGORIES: Array<{ key: PanelKey; title: string; line: string; theme: string }> = [
  { key: 'icecream', title: 'آيسكريم', line: 'كُرةٌ باردة لكلّ مزاج.', theme: 'pink' },
  { key: 'cakes', title: 'جاتوه وكيك', line: 'طبقاتٌ تُروى في كلّ مناسبة.', theme: 'choc' },
  { key: 'oriental', title: 'حلويات شرقية', line: 'فستقٌ وقَطرٌ ورقائقُ ذهبية.', theme: 'honey' },
  { key: 'bakery', title: 'مخبوزات', line: 'تخرج من الفرن صباحَ كلّ يوم.', theme: 'wheat' },
  { key: 'cookies', title: 'كعك وبسكويت', line: 'رفيقُ القهوة الدائم.', theme: 'blue' },
  { key: 'drinks', title: 'مشروبات', line: 'ساخنةً أو باردة، في كوب موكا.', theme: 'ink' },
];

const STATS = [
  { value: 1991, format: (n: number) => String(Math.round(n)), label: 'بداية الحكاية في صنعاء' },
  { value: 300, format: (n: number) => `+${Math.round(n)}`, label: 'صنفٍ على موقع موكا' },
  { value: 350, format: (n: number) => `+${Math.round(n)} ألف`, label: 'تحميل لتطبيق موكا على Google Play' },
  { value: 0, format: () => 'صنعاء وإب', label: 'توزيعٌ يوميّ كل صباح' },
];

const DARK_THEMES = new Set(['choc', 'blue', 'ink']);

const toArabicDigits = (v: string) => v.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = src;
  });
}

export default function MokaSweetsExperience() {
  const rootRef = useRef<HTMLElement>(null);
  const pileRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = pileRef.current;
    if (!root || !canvas) return;

    let cancelled = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const html = document.documentElement;
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    html.style.overflow = 'hidden';

    const lenis = reduced ? null : new Lenis({ lerp: 0.09 });
    lenis?.stop();
    lenis?.on('scroll', ScrollTrigger.update);

    let pile: PhysicsPile | null = null;
    let pileVisible = true;
    const tick = (time: number, deltaMs: number) => {
      lenis?.raf(time * 1000);
      if (pile && pileVisible) pile.tick(deltaMs / 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const hero = canvas.parentElement!;
    const visibility = new IntersectionObserver(([e]) => (pileVisible = e.isIntersecting));
    visibility.observe(hero);

    const toLocal = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onDown = (e: PointerEvent) => {
      if (!pile) return;
      const p = toLocal(e);
      if (pile.pointerDown(p.x, p.y, e.pointerType !== 'mouse') && e.pointerType === 'mouse') {
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!pile || e.pointerType !== 'mouse') return;
      const p = toLocal(e);
      pile.pointerMove(p.x, p.y);
    };
    const onUp = () => pile?.pointerUp();
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave', () => pile?.pointerMove(-999, -999));

    const onResize = () => pile?.resize(hero.clientWidth, hero.clientHeight);
    window.addEventListener('resize', onResize);

    const ctx = gsap.context(() => {}, root);
    const splits: SplitText[] = [];

    (async () => {
      // --- Loader: an ice-cream cone gains a scoop at every third of real progress. ---
      const scoops = gsap.utils.toArray<SVGElement>('[data-scoop]', root);
      gsap.set(scoops, { y: -260, opacity: 0 });
      const shown = { n: 0 };
      const progress = { v: 0 };
      let loaded = 0;
      const total = catalog.badges.length + 2;
      const bump = () => {
        loaded++;
        gsap.to(progress, {
          v: (loaded / total) * 100,
          duration: 0.4,
          ease: 'power1.out',
          onUpdate: () => {
            if (countRef.current) countRef.current.textContent = toArabicDigits(String(Math.round(progress.v)));
            const want = Math.min(3, Math.floor(progress.v / 33.34) + (progress.v >= 100 ? 0 : 0));
            while (shown.n < want) {
              gsap.to(scoops[shown.n], { y: 0, opacity: 1, duration: 0.7, ease: 'bounce.out' });
              shown.n++;
            }
          },
        });
      };
      const fonts = Promise.all([
        new FontFace('Bahij Insan', 'url(moka/web/bahij-insan.ttf)').load().then((f) => document.fonts.add(f)).catch(() => undefined),
        document.fonts.load("400 80px 'Lalezar'").catch(() => undefined),
      ]).then(bump);
      const images = catalog.badges.map((b) => loadImage(b.src).then((img) => (bump(), img)));
      const minTime = new Promise((r) => setTimeout(r, reduced ? 300 : 1800));
      const [imgs] = await Promise.all([Promise.all(images), fonts, minTime, document.fonts.ready]);
      bump();
      await new Promise((r) => setTimeout(r, reduced ? 100 : 900));
      if (cancelled) return;

      pile = new PhysicsPile(canvas, catalog.badges.map((b, i) => ({ name: b.name, image: imgs[i] })));
      pile.resize(hero.clientWidth, hero.clientHeight);
      pile.onHover = (name, x, y) => {
        const tip = tipRef.current;
        if (!tip) return;
        tip.textContent = name ?? '';
        tip.style.opacity = name ? '1' : '0';
        tip.style.transform = `translate(${x}px, ${y - 28}px) translate(-50%, -100%)`;
      };

      ctx.add(() => {
        const title = root.querySelector<HTMLElement>('[data-hero-title]');
        const heroSplit = title && !reduced ? SplitText.create(title, { type: 'lines', mask: 'lines' }) : null;
        if (heroSplit) splits.push(heroSplit);

        const intro = gsap.timeline({
          onComplete: () => {
            html.style.overflow = '';
            lenis?.start();
            buildScroll();
          },
        });
        intro
          .to('[data-cone]', { y: '60vh', rotate: -18, duration: 0.9, ease: 'power3.in' })
          .to(loaderRef.current, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'expo.inOut' }, '-=0.35')
          .add(() => pile?.drop(reduced), '-=0.5');
        if (heroSplit) intro.from(heroSplit.lines, { yPercent: 115, duration: 1.4, ease: 'expo.out', stagger: 0.12 }, '-=0.7');
        intro.from('[data-hero-fade]', { opacity: 0, y: 14, duration: 1, ease: 'power3.out', stagger: 0.1 }, '-=1');
      });

      function buildScroll() {
        ctx.add(() => {
          // Nav colour follows the section beneath it.
          gsap.utils.toArray<HTMLElement>('[data-nav]').forEach((sec) => {
            ScrollTrigger.create({
              trigger: sec,
              start: 'top 40px',
              end: 'bottom 40px',
              onToggle: (self) => self.isActive && (root!.dataset.nav = sec.dataset.nav),
            });
          });

          // Story: the year counts from 1991 to today while the three beats reveal.
          const year = root!.querySelector<HTMLElement>('[data-year]');
          const beats = gsap.utils.toArray<HTMLElement>('[data-beat]');
          const story = root!.querySelector<HTMLElement>('[data-story]');
          if (story && year) {
            const y = { v: 1991 };
            const tl = gsap.timeline({
              scrollTrigger: { trigger: story, start: 'top top', end: '+=180%', scrub: true, pin: true },
            });
            tl.to(y, { v: new Date().getFullYear(), ease: 'none', duration: 3, onUpdate: () => (year.textContent = toArabicDigits(String(Math.round(y.v)))) }, 0);
            beats.forEach((b, i) => {
              tl.fromTo(b, { opacity: 0.12, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, i * 0.9);
              if (i < beats.length - 1) tl.to(b, { opacity: 0.25, duration: 0.4 }, i * 0.9 + 0.9);
            });
            gsap.utils.toArray<HTMLElement>('[data-float]').forEach((f, i) => {
              tl.fromTo(f, { y: 120 + i * 40 }, { y: -140 - i * 50, ease: 'none', duration: 3 }, 0);
            });
          }

          // Categories: a horizontal, pinned walk through the shop (desktop).
          const track = root!.querySelector<HTMLElement>('[data-track]');
          const shelf = root!.querySelector<HTMLElement>('[data-shelf]');
          const mm = gsap.matchMedia();
          mm.add('(min-width: 900px)', () => {
            if (!track || !shelf) return;
            const distance = () => track.scrollWidth - window.innerWidth;
            const move = gsap.to(track, {
              x: () => distance(),
              ease: 'none',
              scrollTrigger: {
                trigger: shelf,
                start: 'top top',
                end: () => `+=${distance()}`,
                scrub: true,
                pin: true,
                invalidateOnRefresh: true,
                // Keep the logo readable on dark shelves.
                onUpdate: (self) => {
                  const c = CATEGORIES[Math.round(self.progress * (CATEGORIES.length - 1))];
                  root!.dataset.nav = DARK_THEMES.has(c.theme) ? 'dark' : 'light';
                },
              },
            });
            gsap.utils.toArray<HTMLElement>('[data-card]').forEach((card, i) => {
              gsap.fromTo(card, { y: 60 + (i % 3) * 30, rotate: (i % 2 ? 3 : -3) }, {
                y: 0,
                rotate: (i % 2 ? 1 : -1),
                ease: 'power2.out',
                scrollTrigger: { trigger: card, containerAnimation: move, start: 'right 0%', end: 'right 55%', scrub: true, horizontal: true },
              });
            });
          });

          // On phones the shelves stack vertically: follow each one's colour instead.
          mm.add('(max-width: 899px)', () => {
            gsap.utils.toArray<HTMLElement>('[data-theme]').forEach((panel) => {
              ScrollTrigger.create({
                trigger: panel,
                start: 'top 40px',
                end: 'bottom 40px',
                onToggle: (self) => self.isActive && (root!.dataset.nav = DARK_THEMES.has(panel.dataset.theme!) ? 'dark' : 'light'),
              });
            });
          });

          // Stats count up.
          gsap.utils.toArray<HTMLElement>('[data-stat]').forEach((el, i) => {
            const stat = STATS[i];
            if (!stat.value) return;
            const n = { v: i === 0 ? 1900 : 0 };
            gsap.to(n, {
              v: stat.value,
              duration: 1.6,
              ease: 'power2.out',
              scrollTrigger: { trigger: el, start: 'top 85%' },
              onUpdate: () => (el.textContent = toArabicDigits(stat.format(n.v))),
            });
          });

          if (!reduced) {
            gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
              const split = SplitText.create(el, { type: 'lines', mask: 'lines' });
              splits.push(split);
              gsap.from(split.lines, {
                yPercent: 115,
                duration: 1.2,
                ease: 'expo.out',
                stagger: 0.1,
                scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
              });
            });
          }

          // Scrolling back to the top fast shakes the pile.
          ScrollTrigger.create({
            trigger: hero,
            start: 'top top',
            end: 'bottom top',
            onEnterBack: (self) => pile?.shake(Math.min(24, Math.abs(self.getVelocity()) / 120)),
          });
        });
      }
    })();

    return () => {
      cancelled = true;
      ctx.revert();
      splits.forEach((sp) => sp.revert());
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      visibility.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      window.removeEventListener('resize', onResize);
      lenis?.destroy();
      pile?.dispose();
      html.style.overflow = '';
      history.scrollRestoration = 'auto';
    };
  }, []);

  return (
    <main ref={rootRef} className={s.root} dir="rtl" lang="ar" data-nav="light">
      {/* Loader: a cone that gains a scoop for every third of the real download. */}
      <div ref={loaderRef} className={s.loader} aria-hidden="true">
        <svg className={s.cone} data-cone viewBox="0 0 200 320" width="200" height="320">
          <circle data-scoop cx="100" cy="176" r="52" fill="#f6a3c9" />
          <circle data-scoop cx="100" cy="122" r="48" fill="#ffd66e" />
          <circle data-scoop cx="100" cy="72" r="44" fill="#9aa6f2" />
          <path d="M52 188 L100 312 L148 188 Z" fill="#c9843f" />
          <path d="M60 196 L140 196 M66 214 L134 214 M73 232 L127 232 M80 250 L120 250 M86 268 L114 268 M70 190 L112 300 M96 190 L130 262 M130 190 L90 294 M104 190 L74 256" stroke="#a5652a" strokeWidth="3" />
        </svg>
        <p className={s.loaderCount}>
          <span ref={countRef}>٠</span>
          <small>٪</small>
        </p>
        <p className={s.loaderLabel}>نُجهّز الحلويات…</p>
      </div>

      <header className={s.nav}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={`${s.logo} ${s.logoBlue}`} src="moka/web/logo-ar-blue.webp" alt="موكا" width={640} height={251} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={`${s.logo} ${s.logoWhite}`} src="moka/web/logo-ar-white.webp" alt="" width={640} height={251} />
        <span className={s.navNote}>مقترح تصميمي غير رسمي</span>
      </header>

      {/* 1 — The pile */}
      <section className={s.hero} data-nav="light">
        <div className={s.heroCopy}>
          <p className={s.eyebrow} data-hero-fade>حلويات موكا · صنعاء</p>
          <h1 className={s.display} data-hero-title>
            كلُّ الحبّ،
            <br />
            منذ ١٩٩١.
          </h1>
        </div>
        <canvas ref={pileRef} className={s.pile} aria-label="كومة من منتجات موكا يمكن سحبها ورميها" />
        <div ref={tipRef} className={s.tip} aria-hidden="true" />
        <p className={s.hint} data-hero-fade>
          <span className={s.hintDot} />
          <span className={s.hintMouse}>اسحب الحلوى وارمِها</span>
          <span className={s.hintTouch}>المس الحلوى لتقفز</span>
        </p>
      </section>

      {/* 2 — The story */}
      <section className={s.story} data-story data-nav="dark">
        <div className={s.storyYear}>
          <span data-year>١٩٩١</span>
        </div>
        <div className={s.beats}>
          <article className={s.beat} data-beat>
            <h3>فبراير ١٩٩١</h3>
            <p>قرّر الحاج عبدالله أسعد الشراعي افتتاح مخبزٍ صغير في صنعاء، يقدّم بعض المخبوزات وأصنافاً من الحلويات الشرقية.</p>
          </article>
          <article className={s.beat} data-beat>
            <h3>من مخبزٍ صغير</h3>
            <p>بدأت موكا بعددٍ بسيط من العاملين وخياراتٍ محدودة، وكانت ردود فعل الزوّار الأوائل تُنبئ بمستقبلٍ كبير.</p>
          </article>
          <article className={s.beat} data-beat>
            <h3>واليوم</h3>
            <p>يديرها مجلسٌ من المؤسس وأبنائه، وتصل منتجاتها صباح كل يوم إلى نقاط البيع في صنعاء وإب.</p>
          </article>
        </div>
        {catalog.badges.slice(0, 5).map((b, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={b.src} className={s.float} data-float src={b.src} alt="" style={{ ['--i' as string]: i }} />
        ))}
      </section>

      {/* 3 — The shelves */}
      <section className={s.shelf} data-shelf data-nav="light">
        <div className={s.track} data-track>
          {CATEGORIES.map((c) => (
            <div key={c.key} className={`${s.panel} ${s[c.theme]}`} data-theme={c.theme}>
              <div className={s.panelHead}>
                <h2 className={s.panelTitle}>{c.title}</h2>
                <p className={s.panelLine}>{c.line}</p>
                {c.key === 'drinks' && (
                  <a className={s.cupLink} href={CUP_LINK}>
                    جرّب كوب موكا ثلاثي الأبعاد ←
                  </a>
                )}
              </div>
              <div className={s.cards}>
                {catalog.panels[c.key].map((p) => (
                  <figure key={p.src} className={s.card} data-card>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.src} alt={p.name} loading="lazy" width={600} height={600} />
                    <figcaption>{p.name}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4 — Numbers */}
      <section className={s.stats} data-nav="light">
        <h2 className={s.sectionTitle} data-reveal>بأيدينا، وبكلّ حبّ.</h2>
        <div className={s.statGrid}>
          {STATS.map((st) => (
            <div key={st.label} className={s.stat}>
              <span className={s.statValue} data-stat>
                {toArabicDigits(st.format(st.value))}
              </span>
              <span className={s.statLabel}>{st.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 5 — Order */}
      <section className={s.finale} data-nav="dark">
        <h2 className={s.display} data-reveal>اطلبها الآن.</h2>
        <p className={s.finaleLine}>من تطبيق موكا، وتصلك إلى الباب.</p>
        <div className={s.stores}>
          <a className={s.store} href={APP_STORE} target="_blank" rel="noreferrer">App Store</a>
          <a className={s.store} href={GOOGLE_PLAY} target="_blank" rel="noreferrer">Google Play</a>
          <a className={s.ghost} href={INSTAGRAM} target="_blank" rel="noreferrer">‎@mokasweets.yemen</a>
        </div>
        <p className={s.credit}>مقترح تصميمي غير رسمي لحلويات موكا · الصور والنصوص من موقع موكا العام</p>
      </section>
    </main>
  );
}
