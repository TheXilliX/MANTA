/*
 * Dither wave and Bayer shader adapted for MANTA. from React Bits.
 * https://reactbits.dev/c/backgrounds/dither
 * https://github.com/DavidHDev/react-bits/blob/main/src/content/Backgrounds/Dither/Dither.jsx
 *
 * MIT + Commons Clause License Condition v1.0
 *
 * Copyright (c) 2026 David Haz
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, and distribute the Software **as part of an application, website, or product**, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * ## Commons Clause Restriction
 *
 * You may use this Software, including for any commercial purpose, **so long as you do not sell, sublicense, or redistribute the components themselves-whether alone, in a bundle, or as a ported version.**
 *
 * The same restriction covers the React Bits tools (Background Studio, Texture Lab, Shape Magic, Center Stage, Sound Lab and any tools added later) and the sounds in the sound library. **You may not sell, sublicense, or redistribute the tools or the sounds themselves, or offer the tools or a substantially similar copy of them as a hosted service-whether alone, in a bundle, or as a ported version.**
 *
 * What you make with the tools is yours to use. You can use exported code, images, videos, and audio files in any personal or commercial application, website, or product, including paid ones. **You may not sell or redistribute the exports on their own, either individually or as the product itself, such as a sound, texture, background, or template pack.**
 *
 * ## No Warranty
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * Classic noise code also includes portions of webgl-noise.
 * https://github.com/ashima/webgl-noise/blob/master/src/classicnoise2D.glsl
 *
 * Copyright (C) 2011 by Ashima Arts (Simplex noise)
 * Copyright (C) 2011-2016 by Stefan Gustavson (Classic noise and others)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(() => {
  const canvas = document.querySelector('canvas.dither-canvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) return;

  const maxTrail = 16;
  const maxRipples = 4;
  const rippleSeconds = 1.6;
  const introSeconds = 1.2;
  const introStart = 0.16;
  const pixelSize = 2;
  const minFrameInterval = 1000 / 35;
  const maxFieldCells = 600000;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const vertexSource = `#version 300 es
void main() {
  vec2 vertex = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(vertex * 2.0 - 1.0, 0.0, 1.0);
}`;

  // The canvas is drawn at the dithering cell resolution, then enlarged in CSS.
  const fragmentSource = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uGrid;
uniform float uAspect;
uniform float uTime;
uniform float uIntro;
uniform vec3 uWave;
uniform vec3 uBackground;
uniform vec3 uTrail[${maxTrail}];
uniform vec4 uRipples[${maxRipples}];
uniform int uTrailCount;
uniform int uRippleCount;
out vec4 outColor;

const float uWaveSpeed = 0.05;
const float uWaveFrequency = 3.0;
const float uWaveAmplitude = 0.3;
const float mouseRadius = 0.3;
const float levels = 3.0;

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fadeXY = fade(Pf.xy);
  vec2 nx = mix(vec2(n00, n01), vec2(n10, n11), fadeXY.x);
  return 2.3 * mix(nx.x, nx.y, fadeXY.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 1.0;
  for (int i = 0; i < 4; i++) {
    value += amp * abs(cnoise(p));
    p *= uWaveFrequency;
    amp *= uWaveAmplitude;
  }
  return value;
}

float pattern(vec2 p) {
  vec2 p2 = p - uTime * uWaveSpeed;
  return fbm(p + fbm(p2));
}


const float bayer8[64] = float[64](
  0.0 / 64.0, 48.0 / 64.0, 12.0 / 64.0, 60.0 / 64.0, 3.0 / 64.0, 51.0 / 64.0, 15.0 / 64.0, 63.0 / 64.0,
  32.0 / 64.0, 16.0 / 64.0, 44.0 / 64.0, 28.0 / 64.0, 35.0 / 64.0, 19.0 / 64.0, 47.0 / 64.0, 31.0 / 64.0,
  8.0 / 64.0, 56.0 / 64.0, 4.0 / 64.0, 52.0 / 64.0, 11.0 / 64.0, 59.0 / 64.0, 7.0 / 64.0, 55.0 / 64.0,
  40.0 / 64.0, 24.0 / 64.0, 36.0 / 64.0, 20.0 / 64.0, 43.0 / 64.0, 27.0 / 64.0, 39.0 / 64.0, 23.0 / 64.0,
  2.0 / 64.0, 50.0 / 64.0, 14.0 / 64.0, 62.0 / 64.0, 1.0 / 64.0, 49.0 / 64.0, 13.0 / 64.0, 61.0 / 64.0,
  34.0 / 64.0, 18.0 / 64.0, 46.0 / 64.0, 30.0 / 64.0, 33.0 / 64.0, 17.0 / 64.0, 45.0 / 64.0, 29.0 / 64.0,
  10.0 / 64.0, 58.0 / 64.0, 6.0 / 64.0, 54.0 / 64.0, 9.0 / 64.0, 57.0 / 64.0, 5.0 / 64.0, 53.0 / 64.0,
  42.0 / 64.0, 26.0 / 64.0, 38.0 / 64.0, 22.0 / 64.0, 41.0 / 64.0, 25.0 / 64.0, 37.0 / 64.0, 21.0 / 64.0
);

vec3 toSrgb(vec3 color) {
  color = clamp(color, 0.0, 1.0);
  return mix(color * 12.92, 1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, color));
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  vec2 uv = (cell / uGrid - 0.5) * vec2(uAspect, 1.0);

  float erase = 0.0;
  for (int i = 0; i < ${maxTrail}; i++) {
    if (i >= uTrailCount) break;
    vec3 point = uTrail[i];
    float radius = mouseRadius * mix(0.55, 1.0, point.z);
    erase = max(erase, point.z * (1.0 - smoothstep(0.0, radius, length(uv - point.xy))));
  }

  vec2 warp = vec2(0.0);
  float ring = 0.0;
  for (int i = 0; i < ${maxRipples}; i++) {
    if (i >= uRippleCount) break;
    vec4 ripple = uRipples[i];
    vec2 delta = uv - ripple.xy;
    float distance = length(delta);
    float fade = 1.0 - clamp(ripple.z / ${rippleSeconds.toFixed(1)}, 0.0, 1.0);
    float crest = (distance - ripple.z * 0.9) / 0.07;
    float strength = exp(-crest * crest) * fade * fade;
    warp += delta / max(distance, 0.0001) * strength * 0.035;
    ring += strength;
  }

  float reach = 0.5 * length(vec2(uAspect, 1.0)) + 0.45;
  float reveal = smoothstep(0.0, 0.45, uIntro * reach - length(uv));
  float field = clamp(pattern(uv + warp) - 0.5 * erase + ring * 0.55, 0.0, 1.0) * reveal;

  ivec2 tile = ivec2(mod(cell, 8.0));
  float threshold = (bayer8[tile.y * 8 + tile.x] - 0.25) / levels;
  vec3 luma = vec3(0.2126, 0.7152, 0.0722);
  float base = dot(uBackground, luma);
  float range = dot(uWave, luma) - base;
  float offset = range * field + threshold;
  offset -= mix(0.2, 0.0, smoothstep(0.45, 0.8, base + offset));
  // Quantize luminance once, so each Bayer step follows the same palette.
  float level = floor(clamp(offset, 0.0, 1.0 - base) * levels + 0.5) / levels;
  outColor = vec4(toSrgb(mix(uBackground, uWave, clamp(level / max(range, 0.0001), 0.0, 1.0))), 1.0);
}`;

  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };

  const makeProgram = () => {
    const shaders = [compileShader(gl.VERTEX_SHADER, vertexSource), compileShader(gl.FRAGMENT_SHADER, fragmentSource)];
    const program = shaders.every(Boolean) ? gl.createProgram() : null;
    if (program) {
      shaders.forEach(shader => gl.attachShader(program, shader));
      gl.linkProgram(program);
    }
    shaders.filter(Boolean).forEach(shader => gl.deleteShader(shader));
    if (!program || gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
    gl.deleteProgram(program);
    return null;
  };

  const linearColor = (r, g, b) => [r, g, b].map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  let program = makeProgram();
  if (!program) return;
  let uniforms;
  const initializeUniforms = () => {
    const names = ['uGrid', 'uAspect', 'uTime', 'uIntro', 'uWave', 'uBackground', 'uTrail[0]', 'uRipples[0]', 'uTrailCount', 'uRippleCount'];
    uniforms = Object.fromEntries(names.map(name => [name.replace('[0]', ''), gl.getUniformLocation(program, name)]));
    gl.useProgram(program);
    gl.uniform3fv(uniforms.uWave, linearColor(230, 236, 241));
    gl.uniform3fv(uniforms.uBackground, linearColor(17, 18, 22));
  };
  initializeUniforms();

  const pointer = { active: false, seen: false, x: 0, y: 0 };
  const trail = [];
  const ripples = [];
  const trailUniform = new Float32Array(maxTrail * 3);
  const rippleUniform = new Float32Array(maxRipples * 4);
  let aspect = 1;
  let headX = 0;
  let headY = 0;
  let presence = 0;
  let viewportVisible = true;
  let frameId = 0;
  let lastFrame = 0;
  let time = 0;
  let intro = document.documentElement.hasAttribute('data-hero-intro') ? introStart : 1;

  function draw() {
    if (!program || !viewportVisible || document.hidden) return;
    const reduced = motion.matches;
    const progress = reduced ? 1 : intro;
    gl.uniform1f(uniforms.uTime, time);
    gl.uniform1f(uniforms.uIntro, progress * progress * (3 - 2 * progress));
    gl.uniform1i(uniforms.uTrailCount, reduced ? 0 : trail.length);
    gl.uniform1i(uniforms.uRippleCount, reduced ? 0 : ripples.length);
    if (!reduced) {
      trail.forEach((point, index) => {
        trailUniform[index * 3] = point.x;
        trailUniform[index * 3 + 1] = point.y;
        trailUniform[index * 3 + 2] = point.weight;
      });
      ripples.forEach((point, index) => {
        rippleUniform[index * 4] = point.x;
        rippleUniform[index * 4 + 1] = point.y;
        rippleUniform[index * 4 + 2] = point.age;
      });
      gl.uniform3fv(uniforms.uTrail, trailUniform);
      gl.uniform4fv(uniforms.uRipples, rippleUniform);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!canvas.dataset.ditherReady) canvas.dataset.ditherReady = 'true';
    if (intro >= 1) document.documentElement.dataset.heroReveal = '';
  }

  function updateTrail(dt) {
    if (!pointer.seen) return;
    const smoothing = 1 - Math.exp(-dt / 0.06);
    headX += (pointer.x - headX) * smoothing;
    headY += (pointer.y - headY) * smoothing;
    presence += ((pointer.active ? 1 : 0) - presence) * (1 - Math.exp(-dt / (pointer.active ? 0.12 : 0.35)));

    // A trail setting of 0.5 gives the lingering impressions a 0.43 s time constant.
    const decay = Math.exp(-dt / 0.43);
    trail.forEach(point => { point.weight *= decay; });
    while (trail.length && trail.at(-1).weight < 0.01) trail.pop();
    if (presence < 0.01) return;

    const head = trail[0];
    if (head && Math.hypot(head.x - headX, head.y - headY) < 0.012) {
      head.x = headX;
      head.y = headY;
      head.weight = presence;
    } else {
      trail.unshift({ x: headX, y: headY, weight: presence });
      if (trail.length > maxTrail) trail.pop();
    }
  }

  function frame(now) {
    frameId = 0;
    if (!program || !viewportVisible || document.hidden || motion.matches) return;
    const elapsed = lastFrame ? now - lastFrame : minFrameInterval;
    if (elapsed >= minFrameInterval) {
      const dt = Math.min(elapsed / 1000, 0.05);
      lastFrame = now;
      time += dt;
      intro = Math.min(1, intro + dt * (1 - introStart) / introSeconds);
      updateTrail(dt);
      ripples.forEach(ripple => { ripple.age += dt; });
      while (ripples.length && ripples[0].age > rippleSeconds) ripples.shift();
      draw();
    }
    frameId = requestAnimationFrame(frame);
  }

  function wake() {
    if (frameId || !program || !viewportVisible || document.hidden) return;
    if (motion.matches) draw();
    else frameId = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(frameId);
    frameId = 0;
    lastFrame = 0;
  }

  function resize() {
    if (!program) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width < 1 || height < 1) return;
    aspect = width / height;
    const cellSize = Math.max(pixelSize, Math.sqrt(width * height / maxFieldCells));
    canvas.width = Math.max(1, Math.ceil(width / cellSize));
    canvas.height = Math.max(1, Math.ceil(height / cellSize));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniforms.uGrid, canvas.width, canvas.height);
    gl.uniform1f(uniforms.uAspect, aspect);
    draw();
    wake();
  }

  function locatePointer(event) {
    if (motion.matches || !program || !viewportVisible) return false;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    pointer.active = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
    if (!pointer.active) return false;
    pointer.x = (x / rect.width - 0.5) * aspect;
    pointer.y = 0.5 - y / rect.height;
    if (!pointer.seen) {
      headX = pointer.x;
      headY = pointer.y;
      pointer.seen = true;
    }
    return true;
  }

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries => {
    viewportVisible = entries.some(entry => entry.isIntersecting);
    if (viewportVisible) wake();
    else stop();
  }).observe(canvas);
  window.addEventListener('pointermove', locatePointer, { passive: true });
  window.addEventListener('pointerdown', event => {
    if (!locatePointer(event)) return;
    ripples.push({ x: pointer.x, y: pointer.y, age: 0 });
    if (ripples.length > maxRipples) ripples.shift();
  }, { passive: true });
  const clearTouch = event => { if (event.pointerType !== 'mouse') pointer.active = false; };
  window.addEventListener('pointerup', clearTouch, { passive: true });
  window.addEventListener('pointercancel', clearTouch, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer.active = false; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else wake();
  });
  motion.addEventListener('change', () => {
    stop();
    intro = 1;
    pointer.active = false;
    presence = 0;
    trail.length = 0;
    ripples.length = 0;
    wake();
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    stop();
    program = null;
    delete canvas.dataset.ditherReady;
    document.documentElement.dataset.heroReveal = '';
  });
  canvas.addEventListener('webglcontextrestored', () => {
    program = makeProgram();
    if (!program) return;
    initializeUniforms();
    resize();
  });
  resize();
})();

