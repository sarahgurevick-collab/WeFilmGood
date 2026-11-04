"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import styles from "./CarrouselVerre.module.css";

/*
 * Carrousel « glass » des success stories (04/11/2026, Sarah) : une rangée
 * sans fin de vignettes vues à travers une loupe de verre liquide au centre.
 * La rangée est dessinée dans une texture, puis un second shader la courbe :
 * le bord tourbillonne et se sépare en couleurs, un anneau bleu scintille.
 * Un clic sur la vignette du centre l'avance ; les autres tombent.
 *
 * D'après « Glass Carousel » de ham7a311 (21st.dev, licence MIT,
 * github.com/ham7a311/Vitrine), réécrit pour le site : vignettes en 16/9
 * (celles des fiches), défilement vertical de la page laissé libre,
 * entrée jouée quand le carrousel arrive à l'écran.
 */

export type DiapoVerre = { titre: string; sousTitre?: string; image?: string | null };

const ASPECT = 16 / 9;
// Les vignettes allégées font 480 × 270 : la texture en tient 8 par ligne.
const TW = 480;
const TH = 270;

// ---------- shaders ----------
const QUAD_VS = `attribute vec2 a; uniform vec4 uRect; uniform vec2 uView; varying vec2 vUv;
void main(){ vUv = vec2(a.x, 1.0 - a.y); vec2 px = uRect.xy + (a - 0.5) * uRect.zw; gl_Position = vec4(px / (uView * 0.5), 0.0, 1.0); }`;
const QUAD_FS = `precision mediump float; uniform sampler2D uTex; uniform vec4 uTile; uniform float uAlpha; varying vec2 vUv;
void main(){ vec4 c = texture2D(uTex, uTile.xy + vUv * uTile.zw); gl_FragColor = vec4(c.rgb, c.a * uAlpha); }`;
const LENS_VS = `attribute vec2 a; varying vec2 vUv; void main(){ vUv = a; gl_Position = vec4(a * 2.0 - 1.0, 0.0, 1.0); }`;
const LENS_FS = `precision highp float;
uniform sampler2D uScene; uniform vec2 uRes; uniform vec2 uRadius; uniform float uFx; uniform float uTime; uniform float uShimmer; uniform vec3 uRing;
varying vec2 vUv;
void main(){
  vec2 px = vUv * uRes;
  vec2 c = uRes * 0.5;
  vec2 off = px - c;
  vec2 p = off / uRadius;
  float nd = length(p);
  vec3 base = texture2D(uScene, vUv).rgb;
  if (nd > 1.0 || uFx < 0.001) { gl_FragColor = vec4(base, 1.0); return; }
  vec2 rd = normalize(off + 1e-4);
  vec2 td = vec2(-rd.y, rd.x);
  float ang = atan(p.y, p.x);
  float rim = smoothstep(0.58, 1.0, nd);
  float wave = sin(ang * 2.0) * 0.55 + sin(ang) * 0.25;
  float R = (uRadius.x + uRadius.y) * 0.5;
  vec2 bent = px + td * wave * rim * R * 0.1 * uFx;
  vec2 disp = off * 4.0 * 0.004 * smoothstep(0.55, 1.0, nd) * uFx;
  vec3 col = vec3(0.0), w = vec3(0.0);
  for (int i = 0; i < 16; i++) {
    float t = float(i) / 15.0;
    vec3 s = texture2D(uScene, (bent + disp * (t - 0.5)) / uRes).rgb;
    vec3 k = vec3(exp(-pow(t / 0.38, 2.0)), exp(-pow((t - 0.5) / 0.38, 2.0)), exp(-pow((t - 1.0) / 0.38, 2.0)));
    col += s * k; w += k;
  }
  col /= max(w, vec3(0.001));
  col *= mix(0.91, 1.0, smoothstep(0.0, 0.38, nd));
  float r2 = nd * nd * 0.25;
  float gs = 0.12;
  col += vec3(exp(-r2 / gs) + exp(-r2 / (gs * 7.0)) * 0.18) * 0.07 * uFx;
  float dC = nd * 0.5;
  float ring = exp(-pow((dC - 0.49) / 0.012, 2.0)) * 0.7;
  ring *= mix(1.0, sin(ang * 6.0 + uTime * 1.2) * 0.08 + 0.92, uShimmer);
  float aura = exp(-pow((dC - 0.49) / 0.084, 2.0)) * 0.1;
  col += uRing * (ring + aura) * uFx;
  col += vec3(exp(-pow((dC - 0.488) / 0.003, 2.0)) * 0.5) * uFx;
  float a = smoothstep(1.0, 0.93, nd);
  gl_FragColor = vec4(mix(base, col, a), 1.0);
}`;

function programme(gl: WebGLRenderingContext, vs: string, fs: string) {
  const mk = (t: number, s: string) => {
    const sh = gl.createShader(t)!;
    gl.shaderSource(sh, s);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader");
    return sh;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("link");
  return p;
}

/** Une vignette sans image : fond sombre, trait rouge et le titre. */
function peindreTitre(ctx: CanvasRenderingContext2D, x: number, y: number, titre: string, sousTitre?: string) {
  const g = ctx.createLinearGradient(x, y, x + TW, y + TH);
  g.addColorStop(0, "#1c1c1f");
  g.addColorStop(1, "#0b0b0c");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, TW, TH);
  ctx.fillStyle = "#da2c25";
  ctx.fillRect(x + 36, y + TH / 2 - 44, 46, 5);
  ctx.fillStyle = "#f2efe9";
  ctx.textBaseline = "alphabetic";
  let taille = 34;
  ctx.font = `700 ${taille}px system-ui, sans-serif`;
  while (ctx.measureText(titre).width > TW - 72 && taille > 18) {
    taille -= 2;
    ctx.font = `700 ${taille}px system-ui, sans-serif`;
  }
  ctx.fillText(titre, x + 36, y + TH / 2 + 4, TW - 72);
  if (sousTitre) {
    ctx.fillStyle = "#8a8a8a";
    ctx.font = "500 17px system-ui, sans-serif";
    ctx.fillText(sousTitre, x + 36, y + TH / 2 + 36, TW - 72);
  }
}

// ---------- petit moteur d'animations ----------
type Courbe = (t: number) => number;
const E = {
  out3: (t: number) => 1 - (1 - t) ** 3,
  out4: (t: number) => 1 - (1 - t) ** 4,
  inOut3: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  expoInOut: (t: number) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2,
};
type Tween = {
  get: () => number;
  set: (v: number) => void;
  from?: number;
  to: number;
  start: number;
  dur: number;
  ease: Courbe;
  done?: () => void;
};

const FOND = "#000000";

export default function CarrouselVerre({
  diapos,
  hauteurPanneau = 200,
  ecart = 14,
}: {
  diapos: DiapoVerre[];
  /** Hauteur visée d'une vignette, réduite sur petit écran. */
  hauteurPanneau?: number;
  ecart?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const curseur = useRef<HTMLDivElement>(null);
  const moteur = useRef<{ next: () => void; prev: () => void; close: () => void } | null>(null);
  const [actif, setActif] = useState(0);
  const [avance, setAvance] = useState(false);
  const [montre, setMontre] = useState(false);
  const [echec, setEchec] = useState(false);
  const labelId = useId();

  useEffect(() => {
    const el = host.current,
      cv = canvas.current;
    if (!el || !cv || !diapos.length) return;
    const gl = cv.getContext("webgl", { antialias: true, alpha: false, premultipliedAlpha: false });
    const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let qp: WebGLProgram, lp: WebGLProgram;
    try {
      if (!gl) throw new Error("webgl");
      qp = programme(gl, QUAD_VS, QUAD_FS);
      lp = programme(gl, LENS_VS, LENS_FS);
    } catch {
      // Sans WebGL : une simple rangée qui défile.
      queueMicrotask(() => setEchec(true));
      return;
    }
    const N = diapos.length;

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);
    const uq = { rect: U(qp, "uRect"), view: U(qp, "uView"), tex: U(qp, "uTex"), tile: U(qp, "uTile") };
    const ul = {
      scene: U(lp, "uScene"),
      res: U(lp, "uRes"),
      radius: U(lp, "uRadius"),
      fx: U(lp, "uFx"),
      time: U(lp, "uTime"),
      shimmer: U(lp, "uShimmer"),
      ring: U(lp, "uRing"),
    };
    gl.useProgram(qp);
    gl.uniform1f(U(qp, "uAlpha"), 1);

    // Toutes les vignettes dans une seule texture (8 colonnes).
    const cols = Math.min(8, N),
      rows = Math.ceil(N / cols);
    const atlasCanvas = document.createElement("canvas");
    atlasCanvas.width = cols * TW;
    atlasCanvas.height = rows * TH;
    const actx = atlasCanvas.getContext("2d")!;
    const atlas = gl.createTexture();
    let aPousser = false;
    const pousserAtlas = () => {
      gl.bindTexture(gl.TEXTURE_2D, atlas);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    diapos.forEach((d, i) => {
      const x = (i % cols) * TW,
        y = Math.floor(i / cols) * TH;
      peindreTitre(actx, x, y, d.titre, d.sousTitre);
      if (d.image) {
        const img = new Image();
        img.onload = () => {
          const s = Math.max(TW / img.width, TH / img.height);
          actx.drawImage(img, x + (TW - img.width * s) / 2, y + (TH - img.height * s) / 2, img.width * s, img.height * s);
          // Une seule remise à jour de la texture par image affichée.
          aPousser = true;
          wake();
        };
        img.src = d.image;
      }
    });
    pousserAtlas();
    const tuile = (i: number) => [(i % cols) / cols, Math.floor(i / cols) / rows, 1 / cols, 1 / rows] as const;

    const fb = gl.createFramebuffer();
    const fbTex = gl.createTexture();
    let W = 1,
      H = 1,
      dpr = 1,
      PANEL_H = hauteurPanneau;
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = Math.max(1, el.clientWidth);
      H = Math.max(1, el.clientHeight);
      // Sur téléphone, la vignette du centre ne prend pas plus de 70 % de la largeur.
      PANEL_H = Math.max(100, Math.min(hauteurPanneau, Math.round(H * 0.6), Math.round((W * 0.7) / ASPECT)));
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      gl.bindTexture(gl.TEXTURE_2D, fbTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cv.width, cv.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbTex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };
    resize();

    // ---------- état ----------
    const slot = () => ASPECT * PANEL_H + ecart;
    let scroll = 0,
      target = 0,
      velocity = 0,
      energy = 0,
      prev = 0,
      lastInput = 0,
      snapped = true,
      lastCenter = -1;
    let dragging = false,
      dragX = 0,
      dragDist = 0,
      dragVel = 0,
      dragT = 0,
      suppress = false,
      dragType = "mouse";
    let hover = false,
      pmx = -1,
      pmy = -1,
      inside = false;
    // Version calme (04/11, Sarah : « l'animation est atroce ») : pas d'entrée,
    // les vignettes sont en place dès l'arrivée.
    const avecEntree = false;
    const focus = { on: false, fx: avecEntree ? 0 : 1, scale: 1, index: -1 };
    const M = N * 7;
    const drop = new Float32Array(M);
    const rise = new Float32Array(M).fill(avecEntree ? 0 : 1);
    const grow = new Float32Array(M).fill(avecEntree ? 0 : 1);
    // L'entrée attend que le carrousel soit à l'écran.
    let entering = avecEntree;
    let entreeLancee = !avecEntree;
    const tweens: Tween[] = [];
    const tween = (get: () => number, set: (v: number) => void, to: number, dur: number, delay: number, ease: Courbe, done?: () => void) =>
      tweens.push({ get, set, to, start: performance.now() + delay * 1000, dur: dur * 1000, ease, done });

    const nearest = (v: number) => Math.round(v / slot());
    const centreOf = (k: number) => k * slot();
    const srcOf = (k: number) => ((k % N) + N) % N;
    const slotOf = (k: number) => ((k % M) + M) % M;

    type Dessine = { k: number; src: number; x: number; y: number; w: number; h: number; slotIdx: number };
    let drawn: Dessine[] = [];
    const layout = () => {
      drawn = [];
      const s = slot();
      const shrink = 1;
      const first = Math.floor((scroll - W / 2) / s) - 1,
        last = Math.ceil((scroll + W / 2) / s) + 1;
      const kc = nearest(scroll);
      for (let k = first; k <= last; k++) {
        const slotIdx = slotOf(k);
        const src = srcOf(k);
        let h = PANEL_H * shrink;
        let x = k * s - scroll;
        let y = 0;
        if (focus.on && k === focus.index) h *= focus.scale;
        else y = -(drop[slotIdx] || 0) * H * 1.4;
        if (entering || grow[slotIdx] < 1) {
          const gh = (j: number) => 50 + (PANEL_H - 50) * grow[slotOf(j)];
          let off = 0;
          const di = k - kc;
          for (let j = 0; j < Math.abs(di); j++) {
            const a = kc + Math.sign(di) * j,
              b = a + Math.sign(di);
            off += Math.sign(di) * ((ASPECT * gh(a) + ASPECT * gh(b)) / 2 + ecart);
          }
          x = off + (kc * s - scroll);
          h = gh(k);
          y = -H * 0.9 * (1 - rise[slotIdx]);
        }
        const w = h * ASPECT;
        if (x + w / 2 < -W / 2 - 20 || x - w / 2 > W / 2 + 20) continue;
        drawn.push({ k, src, x, y, w, h, slotIdx });
      }
    };

    const centred = () => drawn.reduce<Dessine | null>((b, d) => (!b || Math.abs(d.x) < Math.abs(b.x) ? d : b), null);
    const hit = (mx: number, my: number) => {
      const x = mx - W / 2,
        y = H / 2 - my;
      return drawn.find((d) => Math.abs(x - d.x) <= d.w / 2 && Math.abs(y - d.y) <= d.h / 2) ?? null;
    };

    // ---------- rendu ----------
    const render = (now: number) => {
      if (aPousser) {
        aPousser = false;
        pousserAtlas();
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.viewport(0, 0, cv.width, cv.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(qp);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      const la = gl.getAttribLocation(qp, "a");
      gl.enableVertexAttribArray(la);
      gl.vertexAttribPointer(la, 2, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, atlas);
      gl.uniform1i(uq.tex, 0);
      gl.uniform2f(uq.view, W, H);
      const ordre = focus.on ? [...drawn.filter((d) => d.k !== focus.index), ...drawn.filter((d) => d.k === focus.index)] : drawn;
      for (const d of ordre) {
        gl.uniform4f(uq.rect, d.x, d.y, d.w, d.h);
        gl.uniform4f(uq.tile, ...tuile(d.src));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(lp);
      const lla = gl.getAttribLocation(lp, "a");
      gl.enableVertexAttribArray(lla);
      gl.vertexAttribPointer(lla, 2, gl.FLOAT, false, 0, 0);
      gl.bindTexture(gl.TEXTURE_2D, fbTex);
      gl.uniform1i(ul.scene, 0);
      gl.uniform2f(ul.res, cv.width, cv.height);
      // La loupe déborde un peu la vignette du centre, en hauteur comme en largeur.
      const lensH = PANEL_H * 0.5 * 1.08,
        lensW = Math.min(W * 0.46, PANEL_H * ASPECT * 0.5 * 1.12);
      gl.uniform2f(ul.radius, lensW * dpr, lensH * dpr);
      gl.uniform1f(ul.fx, focus.fx);
      gl.uniform1f(ul.time, now / 1000);
      gl.uniform1f(ul.shimmer, reduit ? 0 : 1);
      gl.uniform3f(ul.ring, 0, 0.616, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    // ---------- boucle ----------
    let raf = 0,
      visible = false,
      alive = true;
    const tick = (now: number) => {
      raf = 0;
      if (!alive || !visible || document.hidden) return;
      for (let i = tweens.length - 1; i >= 0; i--) {
        const t = tweens[i];
        if (now < t.start) continue;
        if (t.from === undefined) t.from = t.get();
        const k = Math.min(1, (now - t.start) / Math.max(1, t.dur));
        t.set(t.from + (t.to - t.from) * t.ease(k));
        if (k >= 1) {
          tweens.splice(i, 1);
          t.done?.();
        }
      }
      if (!dragging) {
        target += velocity;
        velocity *= 0.865;
        if (Math.abs(velocity) < 0.05) velocity = 0;
        if (!snapped && !focus.on && performance.now() - lastInput > 120) {
          target = centreOf(nearest(scroll));
          snapped = true;
        }
      }
      const follow = dragging && dragType !== "mouse" ? 0.22 : reduit ? 0.28 : snapped ? 0.05 : 0.09;
      scroll += (target - scroll) * follow;
      const speed = Math.abs(scroll - prev);
      prev = scroll;
      const n = Math.min(1, speed / 60);
      energy += (n - energy) * (n > energy ? 0.25 : 0.06);
      layout();
      const c = srcOf(nearest(scroll));
      if (c !== lastCenter) {
        lastCenter = c;
        setActif(c);
      }
      if (inside && dragType === "mouse" && !dragging) {
        const h = !focus.on && !entering && !!hit(pmx, pmy);
        if (h !== hover) {
          hover = h;
          if (h) el.dataset.hover = "";
          else delete el.dataset.hover;
        }
      }
      render(now);
      raf = requestAnimationFrame(tick);
    };
    function wake() {
      if (!raf && alive && visible) raf = requestAnimationFrame(tick);
    }

    // ---------- vignette avancée ----------
    const open = () => {
      const c = centred();
      if (!c || focus.on) return;
      focus.on = true;
      focus.index = c.k;
      target = centreOf(c.k);
      tween(() => focus.fx, (v) => (focus.fx = v), 0, 0.6, 0, E.out3);
      // Version calme : la vignette grandit un peu, les autres restent en place.
      tween(() => focus.scale, (v) => (focus.scale = v), 1.12, 0.6, 0, E.out3);
      setAvance(true);
      wake();
    };
    const close = () => {
      if (!focus.on) return;
      tween(() => focus.fx, (v) => (focus.fx = v), 1, 0.6, 0, E.inOut3);
      tween(() => focus.scale, (v) => (focus.scale = v), 1, 0.6, 0, E.out3, () => {
        focus.on = false;
      });
      setAvance(false);
      wake();
    };
    const step = (dir: number) => {
      if (focus.on || entering) return;
      velocity = 0;
      target = centreOf(nearest(scroll) + dir);
      snapped = true;
      lastInput = performance.now();
      wake();
    };
    moteur.current = { next: () => step(1), prev: () => step(-1), close };

    // ---------- entrée ----------
    const lancerEntree = () => {
      entreeLancee = true;
      layout();
      const vis = drawn.map((d) => d.slotIdx);
      const spread = 0.07 * Math.max(vis.length - 1, 1);
      let riseEnd = 0;
      vis.forEach((s) => {
        const at = 0.2 + Math.random() * spread;
        riseEnd = Math.max(riseEnd, at + 1);
        tween(() => rise[s], (v) => (rise[s] = v), 1, 1, at, E.out3);
      });
      const growStart = riseEnd + 0.2;
      tween(() => focus.fx, (v) => (focus.fx = v), 1, 1.4, growStart, E.inOut3);
      const maxR = Math.max(...drawn.map((d) => Math.abs(d.k - nearest(scroll))));
      let growEnd = growStart;
      for (const d of drawn) {
        const at = growStart + (maxR - Math.abs(d.k - nearest(scroll))) * 0.085;
        growEnd = Math.max(growEnd, at + 2.15);
        tween(() => grow[d.slotIdx], (v) => (grow[d.slotIdx] = v), 1, 2.15, at, E.expoInOut);
      }
      setTimeout(() => {
        rise.fill(1);
        grow.fill(1);
        entering = false;
        setMontre(true);
      }, growEnd * 1000 + 30);
    };
    if (!avecEntree) queueMicrotask(() => setMontre(true));

    // ---------- souris, doigt, molette ----------
    const local = (e: PointerEvent | MouseEvent) => {
      const r = el.getBoundingClientRect();
      const k = r.width / el.offsetWidth || 1;
      return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
    };
    const onWheel = (e: WheelEvent) => {
      // Seul le défilement horizontal (pavé tactile) fait tourner la rangée :
      // la molette verticale continue de faire descendre la page.
      if (focus.on || entering || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      target += e.deltaX * 1.4;
      lastInput = performance.now();
      snapped = false;
      wake();
    };
    const onDown = (e: PointerEvent) => {
      suppress = false;
      if (focus.on || entering || (e.pointerType === "mouse" && e.button !== 0)) return;
      dragging = true;
      dragType = e.pointerType || "mouse";
      cv.setPointerCapture(e.pointerId);
      dragX = local(e).x;
      dragDist = 0;
      dragVel = 0;
      dragT = performance.now();
      velocity = 0;
      snapped = false;
      el.dataset.dragging = "";
      wake();
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      pmx = p.x;
      pmy = p.y;
      inside = true;
      if (curseur.current && e.pointerType === "mouse") curseur.current.style.translate = `${p.x}px ${p.y}px`;
      if (dragging) {
        const sens = dragType === "mouse" ? 1.6 : 1;
        const dx = p.x - dragX;
        dragX = p.x;
        dragDist += Math.abs(dx);
        target -= dx * sens;
        dragVel = dragVel * 0.6 - dx * sens * 0.4;
        dragT = lastInput = performance.now();
      }
      wake();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      delete el.dataset.dragging;
      velocity = performance.now() - dragT > 90 ? 0 : dragVel;
      lastInput = performance.now();
      suppress = dragDist > (dragType === "mouse" ? 6 : 12);
      wake();
    };
    const onLeave = () => {
      inside = false;
      hover = false;
      delete el.dataset.hover;
    };
    const onClick = (e: MouseEvent) => {
      if (suppress) return void (suppress = false);
      if (entering) return;
      if (focus.on) return close();
      const p = local(e);
      const h = hit(p.x, p.y);
      if (!h) return;
      const c = centred();
      if (c && h.k === c.k) return open();
      velocity = 0;
      target = centreOf(h.k);
      snapped = true;
      wake();
    };
    cv.addEventListener("wheel", onWheel, { passive: false });
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);
    cv.addEventListener("pointerleave", onLeave);
    cv.addEventListener("click", onClick);
    const ro = new ResizeObserver(() => {
      resize();
      target = scroll = centreOf(nearest(scroll));
      wake();
    });
    ro.observe(el);
    const io = new IntersectionObserver(
      ([en]) => {
        visible = en.isIntersecting;
        if (visible && !entreeLancee) lancerEntree();
        if (visible) wake();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    const onVis = () => !document.hidden && wake();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      cv.removeEventListener("wheel", onWheel);
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
      cv.removeEventListener("pointerleave", onLeave);
      cv.removeEventListener("click", onClick);
      moteur.current = null;
    };
  }, [diapos, hauteurPanneau, ecart]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") moteur.current?.next();
    else if (e.key === "ArrowLeft") moteur.current?.prev();
    else if (e.key === "Escape") moteur.current?.close();
    else return;
    e.preventDefault();
  };

  const courant = diapos[actif] ?? diapos[0];
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      ref={host}
      className={styles.gc}
      style={{ background: FOND }}
      tabIndex={0}
      role="region"
      aria-roledescription="carrousel"
      aria-labelledby={labelId}
      onKeyDown={onKeyDown}
      data-shown={montre ? "" : undefined}
      data-focused={avance ? "" : undefined}
    >
      <p id={labelId} className={styles.sr}>
        Success stories. Flèches gauche et droite pour passer d&apos;un film à l&apos;autre, Échap pour revenir.
      </p>
      <p className={styles.sr} aria-live="polite">
        {courant?.titre}, {actif + 1} sur {diapos.length}
      </p>
      {echec ? (
        <ul className={styles.repli}>
          {diapos.map((d, i) => (
            <li key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {d.image && <img src={d.image} alt="" loading="lazy" />}
              <span>{d.titre}</span>
            </li>
          ))}
        </ul>
      ) : (
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
      )}
      <div className={styles.titre} aria-hidden="true">
        <span className={styles.titreNom}>{courant?.titre}</span>
        {courant?.sousTitre && <span className={styles.titreSous}>{courant.sousTitre}</span>}
      </div>
      <p className={styles.compte} aria-hidden="true">
        {pad(actif + 1)}/{pad(diapos.length)}
      </p>
      <div ref={curseur} className={styles.curseur} aria-hidden="true">
        Voir
      </div>
      <button
        type="button"
        className={styles.fermer}
        onClick={() => moteur.current?.close()}
        tabIndex={avance ? 0 : -1}
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  );
}
