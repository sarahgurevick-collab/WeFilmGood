"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./VignetteEau.module.css";

/*
 * Vignette de la pitchothèque avec un effet « reflet dans l'eau » au survol :
 * l'image ondule doucement, parcourue de reflets de lumière.
 *
 * Un navigateur n'accepte qu'une quinzaine de contextes WebGL à la fois ; la
 * grille en affiche bien plus. Le canevas n'est donc créé que pendant le
 * survol, puis détruit : il n'y en a jamais plus d'un ou deux en même temps.
 *
 * Adapté du composant « water-ripple-image » (21st.dev) : l'image remplit la
 * vignette au lieu de l'écran entier, légèrement agrandie pour que les bords
 * ondulés ne laissent pas voir de vide.
 */

const VERT = `
precision mediump float;
varying vec2 vUv;
attribute vec2 a_position;
void main() {
  vUv = .5 * (a_position + 1.);
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;

varying vec2 vUv;
uniform sampler2D u_image_texture;
uniform float u_time;
uniform float u_ratio;
uniform float u_img_ratio;
uniform float u_blueish;
uniform float u_scale;
uniform float u_illumination;
uniform float u_surface_distortion;
uniform float u_water_distortion;

vec3 mod289(vec3 x) { return x - floor(x * (1. / 289.)) * 289.; }
vec2 mod289(vec2 x) { return x - floor(x * (1. / 289.)) * 289.; }
vec3 permute(vec3 x) { return mod289(((x*34.)+1.)*x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1., 0.) : vec2(0., 1.);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.);
  m = m*m;
  m = m*m;
  vec3 x = 2. * fract(p * C.www) - 1.;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130. * dot(m, g);
}

mat2 rotate2D(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

float surface_noise(vec2 uv, float t, float scale) {
  vec2 n = vec2(.1);
  vec2 N = vec2(.1);
  mat2 m = rotate2D(.5);
  for (int j = 0; j < 10; j++) {
    uv *= m;
    n *= m;
    vec2 q = uv * scale + float(j) + n + (.5 + .5 * float(j)) * (mod(float(j), 2.) - 1.) * t;
    n += sin(q);
    N += cos(q) / scale;
    scale *= 1.2;
  }
  return (N.x + N.y + .1);
}

void main() {
  vec2 uv = vUv;
  uv.y = 1. - uv.y;
  uv.x *= u_ratio;

  float t = .002 * u_time;

  float outer_noise = snoise((.3 + .1 * sin(t)) * uv + vec2(0., .2 * t));
  vec2 surface_noise_uv = 2. * uv + (outer_noise * .2);

  float surf = surface_noise(surface_noise_uv, t, u_scale);
  surf *= pow(uv.y, .3);
  surf = pow(surf, 2.);

  // L'image couvre la vignette (comme object-fit: cover), un peu agrandie.
  vec2 img_uv = vUv - .5;
  if (u_ratio > u_img_ratio) {
    img_uv.y *= u_img_ratio / u_ratio;
  } else {
    img_uv.x *= u_ratio / u_img_ratio;
  }
  img_uv *= .92;
  img_uv += .5;
  img_uv.y = 1. - img_uv.y;

  img_uv += u_water_distortion * outer_noise;
  img_uv += u_surface_distortion * surf;

  vec4 img = texture2D(u_image_texture, img_uv);
  img *= (1. + u_illumination * surf);

  vec3 color = img.rgb + u_illumination * vec3(1. - u_blueish, 1., 1.) * surf;
  gl_FragColor = vec4(color, 1.);
}
`;

const REGLAGES = {
  blueish: 0.4,
  scale: 7,
  illumination: 0.15,
  surfaceDistortion: 0.03,
  waterDistortion: 0.02,
};

function compiler(gl: WebGLRenderingContext, source: string, type: number) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) || "shader");
  }
  return sh;
}

/** Lance l'ondulation sur le canevas ; renvoie la fonction qui l'arrête. */
function lancerEau(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
  if (!gl) return null;

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compiler(gl, VERT, gl.VERTEX_SHADER));
  gl.attachShader(prog, compiler(gl, FRAG, gl.FRAGMENT_SHADER));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const u = (nom: string) => gl.getUniformLocation(prog, nom);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(prog, "a_position");
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  try {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  } catch {
    // Image refusée par le navigateur (autre domaine sans autorisation).
    return null;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.uniform1i(u("u_image_texture"), 0);
  gl.uniform1f(u("u_ratio"), canvas.width / canvas.height);
  gl.uniform1f(u("u_img_ratio"), image.naturalWidth / image.naturalHeight);
  gl.uniform1f(u("u_blueish"), REGLAGES.blueish);
  gl.uniform1f(u("u_scale"), REGLAGES.scale);
  gl.uniform1f(u("u_illumination"), REGLAGES.illumination);
  gl.uniform1f(u("u_surface_distortion"), REGLAGES.surfaceDistortion);
  gl.uniform1f(u("u_water_distortion"), REGLAGES.waterDistortion);

  const uTemps = u("u_time");
  let frame = 0;
  const rendu = () => {
    gl.uniform1f(uTemps, performance.now());
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    frame = requestAnimationFrame(rendu);
  };
  frame = requestAnimationFrame(rendu);

  return () => {
    cancelAnimationFrame(frame);
    gl.deleteTexture(tex);
    gl.deleteBuffer(vbo);
    gl.deleteProgram(prog);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}

export default function VignetteEau({ src }: { src: string }) {
  const racine = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [actif, setActif] = useState(false);
  const [visible, setVisible] = useState(false);
  const enMarche = useRef(false);

  // Le survol se lit sur toute la carte (image et légende), comme avant.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const carte = racine.current?.closest("a");
    if (!carte) return;
    let sortie = 0;
    const entrer = () => {
      window.clearTimeout(sortie);
      setActif(true);
      // Retour sur la carte pendant le fondu de sortie : l'eau tourne encore.
      if (enMarche.current) setVisible(true);
    };
    const sortir = () => {
      setVisible(false);
      // Laisse le fondu se terminer avant de détruire le canevas.
      sortie = window.setTimeout(() => setActif(false), 400);
    };
    carte.addEventListener("pointerenter", entrer);
    carte.addEventListener("pointerleave", sortir);
    carte.addEventListener("focus", entrer);
    carte.addEventListener("blur", sortir);
    return () => {
      window.clearTimeout(sortie);
      carte.removeEventListener("pointerenter", entrer);
      carte.removeEventListener("pointerleave", sortir);
      carte.removeEventListener("focus", entrer);
      carte.removeEventListener("blur", sortir);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!actif || !canvas || !img || !img.complete || !img.naturalWidth) return;
    let arreter: (() => void) | null = null;
    try {
      arreter = lancerEau(canvas, img);
    } catch (e) {
      console.error("effet eau", e);
    }
    if (!arreter) return;
    enMarche.current = true;
    const f = requestAnimationFrame(() => setVisible(true));
    return () => {
      cancelAnimationFrame(f);
      enMarche.current = false;
      arreter?.();
    };
  }, [actif]);

  return (
    <div ref={racine} className={styles.racine}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} src={src} alt="" loading="lazy" crossOrigin="anonymous" />
      {actif && (
        <canvas
          ref={canvasRef}
          className={`${styles.eau} ${visible ? styles.visible : ""}`}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
