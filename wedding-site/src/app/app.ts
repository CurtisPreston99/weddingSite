import { NgIf } from '@angular/common';
import { Component, signal, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,NgIf],
  templateUrl: './app.html',
  styleUrl: './app.less'
})
export class App {
  protected readonly title = signal('wedding-site');

  @ViewChild('p5containerBottomEnvelop', { static: false }) p5containerBottomEnvelop!: ElementRef<HTMLElement>;
  @ViewChild('p5containerBottomFlap', { static: false }) p5containerBottomFlap!: ElementRef<HTMLElement>;

  private p5Instance: any = null;
  private p5InstanceBottom: any = null;
  private p5InstanceBottomFlap: any = null;


  public envelopeOpen: boolean = false;
  private envelopeShared: any = null;

  ngAfterViewInit(): void {

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
              this.envelopeOpen = envelope.open; 
              console.log(this.envelopeOpen)
              console.log(this)
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
