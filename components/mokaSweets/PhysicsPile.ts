import Matter from 'matter-js';

export interface PileItem {
  name: string;
  image: HTMLImageElement;
}

interface Badge {
  body: Matter.Body;
  sprite: HTMLCanvasElement;
  radius: number;
  name: string;
}

const PAD = 22; // room for the ring and shadow around each sprite

// A pile of round product "badges" that rain down, stack and can be thrown.
// Mouse: drag and fling. Touch: tap to toss (so the page still scrolls).
export class PhysicsPile {
  private engine = Matter.Engine.create({ gravity: { x: 0, y: 1.15 } });
  private badges: Badge[] = [];
  private walls: Matter.Body[] = [];
  private ctx: CanvasRenderingContext2D;
  private width = 1;
  private height = 1;
  private dpr = 1;
  private grab: Matter.Constraint | null = null;
  private pointer = { x: 0, y: 0 };
  private accumulator = 0;
  private hovered: Badge | null = null;
  onHover: (name: string | null, x: number, y: number) => void = () => {};

  constructor(private canvas: HTMLCanvasElement, private items: PileItem[]) {
    this.ctx = canvas.getContext('2d')!;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    Matter.Composite.remove(this.engine.world, this.walls);
    const t = 400;
    this.walls = [
      Matter.Bodies.rectangle(width / 2, height + t / 2, width * 3, t, { isStatic: true }),
      Matter.Bodies.rectangle(-t / 2, height / 2 - 2000, t, height * 3 + 4000, { isStatic: true }),
      Matter.Bodies.rectangle(width + t / 2, height / 2 - 2000, t, height * 3 + 4000, { isStatic: true }),
    ];
    Matter.Composite.add(this.engine.world, this.walls);
    for (const b of this.badges) {
      const x = Math.min(Math.max(b.body.position.x, b.radius), width - b.radius);
      Matter.Body.setPosition(b.body, { x, y: Math.min(b.body.position.y, height - b.radius) });
    }
  }

  private sprite(img: HTMLImageElement, r: number) {
    const size = Math.ceil((r + PAD) * 2 * this.dpr);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d')!;
    g.scale(this.dpr, this.dpr);
    const m = r + PAD;
    g.shadowColor = 'rgba(40, 24, 10, 0.28)';
    g.shadowBlur = 18;
    g.shadowOffsetY = 8;
    g.fillStyle = '#fffaf2';
    g.beginPath();
    g.arc(m, m, r + 5, 0, Math.PI * 2);
    g.fill();
    g.shadowColor = 'transparent';
    g.save();
    g.beginPath();
    g.arc(m, m, r, 0, Math.PI * 2);
    g.clip();
    g.drawImage(img, m - r, m - r, r * 2, r * 2);
    g.restore();
    return c;
  }

  /** Rain every badge in from above the viewport. `settled` skips the fall (reduced motion). */
  drop(settled = false) {
    const small = this.width < 700;
    const base = small ? 34 : Math.min(74, Math.max(48, this.width / 26));
    this.items.forEach((item, i) => {
      const r = base * (0.72 + ((i * 37) % 11) / 20);
      const x = r + ((i * 0.618 * this.width) % Math.max(1, this.width - 2 * r));
      const y = -r - i * (small ? 60 : 90) - Math.random() * 40;
      const body = Matter.Bodies.circle(x, y, r, { restitution: 0.32, friction: 0.08, frictionAir: 0.012, density: 0.0016 });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.12);
      this.badges.push({ body, sprite: this.sprite(item.image, r), radius: r, name: item.name });
      Matter.Composite.add(this.engine.world, body);
    });
    if (settled) for (let i = 0; i < 900; i++) Matter.Engine.update(this.engine, 1000 / 60);
  }

  private hit(x: number, y: number) {
    const bodies = Matter.Query.point(this.badges.map((b) => b.body), { x, y });
    return bodies.length ? this.badges.find((b) => b.body === bodies[0]) ?? null : null;
  }

  pointerDown(x: number, y: number, touch: boolean) {
    const badge = this.hit(x, y);
    if (!badge) return false;
    if (touch) {
      Matter.Body.setVelocity(badge.body, { x: (Math.random() - 0.5) * 10, y: -18 });
      Matter.Body.setAngularVelocity(badge.body, (Math.random() - 0.5) * 0.4);
      return true;
    }
    this.pointer = { x, y };
    this.grab = Matter.Constraint.create({
      pointA: this.pointer,
      bodyB: badge.body,
      pointB: { x: x - badge.body.position.x, y: y - badge.body.position.y },
      stiffness: 0.18,
      damping: 0.08,
      length: 0,
    });
    Matter.Composite.add(this.engine.world, this.grab);
    return true;
  }

  pointerMove(x: number, y: number) {
    this.pointer.x = x;
    this.pointer.y = y;
    const badge = this.grab ? null : this.hit(x, y);
    if (badge !== this.hovered) {
      this.hovered = badge;
      this.canvas.style.cursor = badge ? 'grab' : '';
    }
    if (this.grab) this.canvas.style.cursor = 'grabbing';
    this.onHover(this.hovered?.name ?? null, x, y);
  }

  pointerUp() {
    if (!this.grab) return;
    Matter.Composite.remove(this.engine.world, this.grab);
    this.grab = null;
    this.canvas.style.cursor = this.hovered ? 'grab' : '';
  }

  /** Nudge the whole pile, e.g. when the visitor scrolls back up fast. */
  shake(strength: number) {
    for (const b of this.badges) {
      Matter.Body.setVelocity(b.body, { x: b.body.velocity.x + (Math.random() - 0.5) * strength, y: b.body.velocity.y - strength * Math.random() });
    }
  }

  tick(dt: number) {
    this.accumulator += Math.min(dt, 0.1) * 1000;
    const step = 1000 / 60;
    while (this.accumulator >= step) {
      Matter.Engine.update(this.engine, step);
      this.accumulator -= step;
    }
    const g = this.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const b of this.badges) {
      const { x, y } = b.body.position;
      if (y < -b.radius - PAD) continue;
      const s = b.sprite.width / this.dpr;
      g.setTransform(this.dpr, 0, 0, this.dpr, x * this.dpr, y * this.dpr);
      g.rotate(b.body.angle);
      g.drawImage(b.sprite, -s / 2, -s / 2, s, s);
    }
  }

  dispose() {
    Matter.Engine.clear(this.engine);
    this.badges = [];
  }
}
