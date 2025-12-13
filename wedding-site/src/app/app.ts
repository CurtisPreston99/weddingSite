import { Component, signal, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.less'
})
export class App {
  protected readonly title = signal('wedding-site');

  @ViewChild('p5container', { static: false }) p5container!: ElementRef<HTMLElement>;
  @ViewChild('p5containerBottomEnvelop', { static: false }) p5containerBottomEnvelop!: ElementRef<HTMLElement>;
  @ViewChild('p5containerBottomFlap', { static: false }) p5containerBottomFlap!: ElementRef<HTMLElement>;

  private p5Instance: any = null;
  private p5InstanceBottom: any = null;
  private p5InstanceBottomFlap: any = null;


  private envelopeOpen: boolean = false;
  private envelopeShared: any = null;

  ngAfterViewInit(): void {
    // initialize a small test sketch using global p5 (loaded from CDN in index.html)
    const parent = this.p5container?.nativeElement;
    if (!parent) return;

    const sketch = (p: any) => {
      // floating polaroid sketch (transparent background)
      let imgs: any[] = [];
      let polaroids: any[] = [];

      function makePolaroid(img: any) {
        const w = Math.min(200, (img?.width || 800) * 0.15);
        const h = Math.min(160, (img?.height || 600) * 0.15);
        const x = p.width / 2 + (Math.random() - 0.5) * 260;
        const y = p.height / 2 + (Math.random() - 0.5) * 80;
        return {
          img,
          x,
          y,
          targetX: x,
          targetY: y,
          vx: 0,
          vy: 0,
          w,
          h,
          angle: (Math.random() - 0.5) * 0.4,
          baseAngle: (Math.random() - 0.5) * 0.1,
          speed: 0.3 + Math.random() * 0.8,
          drift: (Math.random() - 0.5) * 0.4
        };
      }

      p.preload = () => {
        imgs = [
          p.loadImage('/photo1.svg'),
          p.loadImage('/photo2.svg'),
          p.loadImage('/photo3.svg'),
          p.loadImage('/photo4.svg'),
          p.loadImage('/photo5.svg'),
          p.loadImage('/photo6.svg'),
          p.loadImage('/photo7.svg'),
          p.loadImage('/photo8.svg'),
          p.loadImage('/photo9.svg')
        ];
      };

      p.setup = () => {
        p.createCanvas(parent.clientWidth, parent.clientHeight);
        p.noStroke();
        if (p.canvas && p.canvas.style) p.canvas.style.background = 'transparent';

        // build polaroid objects when images are available
        for (let i = 0; i < imgs.length; i++) {
          polaroids.push(makePolaroid(imgs[i]));
        }
      };

      p.draw = () => {
        p.clear();

        const t = p.millis() / 1000;

        // detect which polaroid (if any) is hovered by the mouse
        const mx = p.mouseX;
        const my = p.mouseY;
        let activeIndex = -1;
        for (let i = 0; i < polaroids.length; i++) {
          const pol = polaroids[i];
          const dx = mx - pol.x;
          const dy = my - pol.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const hitRadius = Math.max(pol.w, pol.h) * 0.6;
          if (!isNaN(dist) && dist < hitRadius) {
            activeIndex = i;
            break;
          }
        }

        // physics: spring back to target + repulsion from active polaroid
        const repelRadius = 1800;
        for (let i = 0; i < polaroids.length; i++) {
          const pol = polaroids[i];

          // spring toward target
          const spring = 0.04;
          let ax = (pol.targetX - pol.x) * spring;
          let ay = (pol.targetY - pol.y) * spring;

          // if another polaroid is active, repel this one away from it
          if (activeIndex >= 0 && i !== activeIndex) {
            const aPol = polaroids[activeIndex];
            let dx = pol.x - aPol.x;
            let dy = pol.y - aPol.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1) dist = 1;
            if (dist < repelRadius) {
              const strength = (repelRadius - dist) / repelRadius * 6;
              ax += (dx / dist) * strength;
              ay += (dy / dist) * strength;
            }
          }

          // small upward lift for the hovered polaroid
          if (activeIndex === i) {
            ay -= 0.6;
          }

          // integrate
          pol.vx += ax;
          pol.vy += ay;
          pol.vx *= 0.88; // damping
          pol.vy *= 0.88;
          pol.x += pol.vx;
          pol.y += pol.vy;
        }

        // draw polaroids (after physics update)
        polaroids.forEach((pol: any, idx: number) => {
          const wobble = Math.sin(t * (0.6 + pol.speed * 0.2) + idx) * 0.02;
          const a = pol.baseAngle + wobble + (pol.angle || 0);
          const px = pol.x;
          const py = pol.y;

          // shadow
          p.push();
          p.translate(px + 6, py + 10);
          p.rotate(a);
          p.fill(0, 0, 0, 45);
          p.rectMode(p.CENTER);
          p.rect(0, 0, pol.w + 26, pol.h + 66, 8);
          p.pop();

          // frame and image
          p.push();
          p.translate(px, py);
          p.rotate(a);
          p.fill(255);
          p.rectMode(p.CENTER);
          const frameW = pol.w + 30;
          const frameH = pol.h + 80;
          p.rect(0, 0, frameW, frameH, 8);

          p.imageMode(p.CENTER);
          p.image(pol.img, 0, -12, pol.w, pol.h);

          // bottom caption stripe
          p.fill(230);
          p.noStroke();
          p.rect(0, frameH / 2 - 20, frameW - 36, 5, 3);

          p.pop();
        });
      };

      p.windowResized = () => {
        p.resizeCanvas(parent.clientWidth, parent.clientHeight);
      };
    };

    // If p5 is not yet available on window, wait briefly (should be loaded from index.html)
    const ensureP5 = (cb: (P5: any) => void) => {
      const P5 = (window as any).p5;
      if (!P5) {
        setTimeout(() => ensureP5(cb), 100);
        return;
      }
      cb(P5);
    };

    ensureP5((P5: any) => {
      this.p5Instance = new P5(sketch, parent);
      // make sure the main canvas is transparent
      if (this.p5Instance && this.p5Instance.canvas && this.p5Instance.canvas.style) {
        const c = this.p5Instance.canvas;
        c.style.background = 'transparent';
        c.style.backgroundColor = 'transparent';
      }

      // create second sketch if bottom container exists
      const bottomParent = this.p5containerBottomEnvelop?.nativeElement;
      if (bottomParent) {
        const bottomSketch = (q: any) => {
          let envelope: any = null;

          q.setup = () => {
            q.createCanvas(bottomParent.clientWidth, bottomParent.clientHeight);
            q.noStroke();
            // create some particles
            // initialize envelope centered in the canvas
            const baseW = Math.min(180, q.width * 0.4);
            const baseH = Math.min(110, q.height * 0.35);
            envelope = {
              x: q.width / 2,
              y: q.height / 2,
              baseW,
              baseH,
              curW: baseW,
              curH: baseH,
              open: false,
              anim: 0, // flap animation 0 closed -> 1 open
              target: 0,
              scale: 0, // scale animation 0 closed -> 1 expanded
              scaleTarget: 0
            };

            if (q.canvas && q.canvas.style) q.canvas.style.background = 'transparent';

          };

          q.draw = () => {
            // transparent background (draw only particles/envelope)
            q.clear();

            if (!envelope) return;

            // animate envelope opening/closing (flap) and expansion (scale)
            envelope.anim += (envelope.target - envelope.anim) * 0.12;
            envelope.scale += (envelope.scaleTarget - envelope.scale) * 0.12;

            // compute current closed/base and full sizes
            const closedW = envelope.baseW;   
            const closedH = envelope.baseH;
            const fullW = Math.max(q.width - 20, closedW);
            const fullH = Math.min(Math.max(q.height - 40, closedH), q.height * 0.85);

            const curW = closedW + (fullW - closedW) * envelope.scale;
            const curH = closedH + (fullH - closedH) * envelope.scale;

            // persist current size for hit detection
            envelope.curW = curW;
            envelope.curH = curH;

            // animate envelope vertical position: move further down when opened
            const baseCenterY = q.height / 2;
            const openOffset = curH * 0.6; // move down by 60% of the envelope height when fully opened
            const targetY = baseCenterY + envelope.scale * openOffset;
            envelope.y += (targetY - envelope.y) * 0.12;

            // update shared state for the external flap sketch to read
            (this as any).envelopeShared = {
              x: envelope.x,
              y: envelope.y,
              curW,
              curH,
              apexY: (0 + ((-curH) - 0) * envelope.anim), // same apexY computed below
              anim: envelope.anim,
              scale: envelope.scale
            };
            // mark whether flap sketch should take over drawing when mostly open
            this.envelopeOpen = envelope.scale >= 0.98;

            // draw envelope body (centered)
            q.push();
            q.translate(envelope.x, envelope.y);
            q.rectMode(q.CENTER);
            q.stroke(200);
            q.strokeWeight(1);
            q.fill(245);
            q.rect(0, 0, curW, curH, 6);

            // draw flap (animated) using current height only when not yet fully open;
            // when mostly open, the separate flap sketch will render it so skip here
            if (envelope.scale < 0.98) {
              // instead of rotating the flap, animate its middle cord (apex) vertically
              const flapAnim = envelope.anim; // 0 closed -> 1 open
              // apex moves from the middle of the envelope (closed) up to half the envelope height above the top edge (open)
              const apexClosedY = 0; // middle of square (center)
              const apexOpenY = -curH; // move apex up to full curH above center
              const apexY = apexClosedY + (apexOpenY - apexClosedY) * flapAnim;

              q.push();
              q.noStroke();
              q.fill(230);
              // triangle flap sized to current width/height; base at top-left/top-right of the square, apex animated
              q.triangle(-curW / 2, -curH / 2, curW / 2, -curH / 2, 0, apexY);
              q.pop();
            }

            // subtle inner letter when open (scaled)
            const letterAlpha = Math.max(0, (envelope.anim - 0.15) / 0.85);
            if (letterAlpha > 0.01) {
              q.push();
              q.translate(0, 0);
              q.noStroke();
              q.fill(255, 255, 240, 230 * letterAlpha);
              const lw = curW - 30;
              const lh = curH - 40;
              q.rect(0, 4, lw, lh, 4);
              q.fill(200, 100 * letterAlpha);
              q.textAlign(q.CENTER, q.CENTER);
              q.noStroke();
              q.fill(120, 80 * letterAlpha);
              q.textSize(Math.min(18, lw * 0.08 + 8 * envelope.scale));
              q.text('Open Me', 0, 4);
              q.pop();
            }

            q.pop();
          };

          q.mousePressed = () => {
            if (!envelope) return;
            const mx = q.mouseX;
            const my = q.mouseY;
            const dx = mx - envelope.x;
            const dy = my - envelope.y;
            const halfW = (envelope.curW || envelope.baseW) / 2;
            const halfH = (envelope.curH || envelope.baseH) / 2;
            if (Math.abs(dx) <= halfW && Math.abs(dy) <= halfH) {
              // toggle open state and set targets for flap and expansion
              envelope.open = !envelope.open;
              envelope.target = envelope.open ? 1 : 0; // flap
              envelope.scaleTarget = envelope.open ? 1 : 0; // expand to full width when opening
            }
          };

          q.windowResized = () => {
            q.resizeCanvas(bottomParent.clientWidth, bottomParent.clientHeight || 320);
            if (!envelope) return;
            envelope.x = q.width / 2;
            envelope.y = q.height / 2;
            envelope.baseW = Math.min(180, q.width * 0.4);
            envelope.baseH = Math.min(110, q.height * 0.35);
            // if currently closed, keep cur size in sync
            if (!envelope.scale || envelope.scale < 0.0001) {
              envelope.curW = envelope.baseW;
              envelope.curH = envelope.baseH;
            }
          };
        };

        this.p5InstanceBottom = new P5(bottomSketch, bottomParent);
        // ensure bottom canvas is transparent (safety) and placed beneath flap canvas
        if (this.p5InstanceBottom && this.p5InstanceBottom.canvas && this.p5InstanceBottom.canvas.style) {
          const c = this.p5InstanceBottom.canvas;
          c.style.background = 'transparent';
          c.style.backgroundColor = 'transparent';
        }

        // initialize a lightweight p5 instance for the separate flap container if present
        const flapParent = this.p5containerBottomFlap?.nativeElement;
        if (flapParent) {
          // create the flap canvas inside the same bottomParent so canvases can overlap
          const flapSketch = (r: any) => {
            r.setup = () => {
              r.createCanvas(bottomParent.clientWidth, bottomParent.clientHeight || 120);
              if (r.canvas && r.canvas.style) r.canvas.style.background = 'transparent';
              // make both canvases absolute and overlapping
              if (r.canvas && r.canvas.style) {
                r.canvas.style.position = 'absolute';
                r.canvas.style.left = '0px';
                r.canvas.style.top = '0px';
                r.canvas.style.width = '100%';
                r.canvas.style.height = '100%';
                r.canvas.style.zIndex = '2';
                r.canvas.style.pointerEvents = 'none'; // flap canvas shouldn't block pointer events
              }
              r.clear();
            };
            r.windowResized = () => {
              r.resizeCanvas(bottomParent.clientWidth, bottomParent.clientHeight || 120);
              r.clear();
            };
            r.draw = () => {
              r.clear();
              const s = (this as any).envelopeShared;
              if (s) {
                // draw flap using the shared coordinates; apex absolute = s.y + s.apexY
                const apexAbsY = s.y + s.apexY;
                r.noStroke();
                r.fill(230);
                r.triangle(s.x - s.curW / 2, s.y - s.curH / 2, s.x + s.curW / 2, s.y - s.curH / 2, s.x, apexAbsY);
              }
            };
          };

          // create flap p5 inside bottomParent so canvases overlap
          this.p5InstanceBottomFlap = new P5(flapSketch, bottomParent);
          // ensure flap canvas is transparent (safety)
          if (this.p5InstanceBottomFlap && this.p5InstanceBottomFlap.canvas && this.p5InstanceBottomFlap.canvas.style) {
            const c = this.p5InstanceBottomFlap.canvas;
            c.style.background = 'transparent';
            c.style.backgroundColor = 'transparent';
          }

          // ensure bottomParent is positioned so absolute canvases line up
          if (bottomParent && bottomParent.style) {
            bottomParent.style.position = bottomParent.style.position || 'relative';
            bottomParent.style.overflow = 'hidden';
          }

          // style the envelope canvas (lower layer)
          if (this.p5InstanceBottom && this.p5InstanceBottom.canvas && this.p5InstanceBottom.canvas.style) {
            const c = this.p5InstanceBottom.canvas;
            c.style.position = 'absolute';
            c.style.left = '0px';
            c.style.top = '0px';
            c.style.width = '100%';
            c.style.height = '100%';
            c.style.zIndex = '1';
          }
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.p5Instance && typeof this.p5Instance.remove === 'function') {
      this.p5Instance.remove();
      this.p5Instance = null;
    }
    if (this.p5InstanceBottom && typeof this.p5InstanceBottom.remove === 'function') {
      this.p5InstanceBottom.remove();
      this.p5InstanceBottom = null;
    }
    if (this.p5InstanceBottomFlap && typeof this.p5InstanceBottomFlap.remove === 'function') {
      this.p5InstanceBottomFlap.remove();
      this.p5InstanceBottomFlap = null;
    }
  }
}
