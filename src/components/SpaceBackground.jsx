import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const SATURN_RADIUS = 1.42;
const RING_INNER_RADIUS = 1.72;
const RING_OUTER_RADIUS = 3.42;

const BACKDROP_VERTEX_SHADER = [
  "varying vec2 vUv;",
  "void main() {",
  "  vUv = uv;",
  "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
  "}"
].join("\n");

const BACKDROP_FRAGMENT_SHADER = [
  "uniform vec2 uResolution;",
  "uniform float uTime;",
  "varying vec2 vUv;",
  "float hash21(vec2 p) {",
  "  p = fract(p * vec2(123.34, 456.21));",
  "  p += dot(p, p + 45.32);",
  "  return fract(p.x * p.y);",
  "}",
  "vec2 hash22(vec2 p) {",
  "  float n = sin(dot(p, vec2(127.1, 311.7)));",
  "  return fract(vec2(n, n * 1.37 + 1.71) * 43758.5453);",
  "}",
  "float noise2(vec2 p) {",
  "  vec2 i = floor(p);",
  "  vec2 f = fract(p);",
  "  f = f * f * (3.0 - 2.0 * f);",
  "  float a = hash21(i);",
  "  float b = hash21(i + vec2(1.0, 0.0));",
  "  float c = hash21(i + vec2(0.0, 1.0));",
  "  float d = hash21(i + vec2(1.0, 1.0));",
  "  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);",
  "}",
  "float fbm(vec2 p) {",
  "  float value = 0.0;",
  "  float amplitude = 0.5;",
  "  mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);",
  "  for (int i = 0; i < 5; i++) {",
  "    value += amplitude * noise2(p);",
  "    p = rotation * p * 2.03 + 13.17;",
  "    amplitude *= 0.5;",
  "  }",
  "  return value;",
  "}",
  "float starField(vec2 pixel) {",
  "  vec2 cellSize = vec2(24.0);",
  "  vec2 baseCell = floor(pixel / cellSize);",
  "  float stars = 0.0;",
  "  for (int y = -1; y <= 1; y++) {",
  "    for (int x = -1; x <= 1; x++) {",
  "      vec2 cell = baseCell + vec2(float(x), float(y));",
  "      vec2 randomValue = hash22(cell);",
  "      float present = step(0.64, hash21(cell + 18.31));",
  "      vec2 starPosition = (cell + 0.15 + randomValue * 0.70) * cellSize;",
  "      float radius = mix(0.36, 1.12, hash21(cell + 71.9));",
  "      float distanceToStar = length(pixel - starPosition);",
  "      float core = 1.0 - smoothstep(radius * 0.18, radius, distanceToStar);",
  "      float twinkle = 0.66 + 0.34 * sin(uTime * (0.32 + randomValue.x * 0.9) + randomValue.y * 6.28318);",
  "      stars += core * present * twinkle * (0.075 + randomValue.y * 0.13);",
  "    }",
  "  }",
  "  return stars;",
  "}",
  "float meteorTrail(vec2 uv, float seed, float interval) {",
  "  float cycle = floor(uTime / interval);",
  "  float phase = fract(uTime / interval);",
  "  float active = 1.0 - smoothstep(0.105, 0.15, phase);",
  "  if (active <= 0.001) return 0.0;",
  "  float cycleSeed = cycle + seed * 37.1;",
  "  vec2 randomValue = hash22(vec2(cycleSeed, seed + 4.7));",
  "  vec2 start = vec2(-0.12 + randomValue.x * 0.78, 1.08 + randomValue.y * 0.16);",
  "  vec2 direction = normalize(vec2(0.42 + randomValue.x * 0.42, -0.84 - randomValue.y * 0.24));",
  "  float progress = clamp(phase / 0.15, 0.0, 1.0);",
  "  vec2 head = start + direction * progress * 1.58;",
  "  vec2 tail = head - direction * (0.055 + randomValue.x * 0.045);",
  "  float along = clamp(dot(uv - tail, direction) / max(length(head - tail), 0.001), 0.0, 1.0);",
  "  vec2 closestPoint = mix(tail, head, along);",
  "  float distanceToTrail = length(uv - closestPoint);",
  "  float line = exp(-distanceToTrail * distanceToTrail * 190000.0);",
  "  float taper = smoothstep(0.0, 0.18, along) * (1.0 - smoothstep(0.72, 1.0, along) * 0.52);",
  "  float fade = sin(progress * 3.14159);",
  "  return line * taper * fade * active * 0.26;",
  "}",
  "void main() {",
  "  vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));",
  "  vec2 centered = uv - vec2(0.72, 0.48);",
  "  float cloudA = fbm(uv * vec2(3.4, 5.0) + vec2(0.0, uTime * 0.0012));",
  "  float cloudB = fbm(uv * vec2(7.8, 10.5) + vec2(3.4, -uTime * 0.0008));",
  "  float cloudMask = smoothstep(0.43, 0.82, cloudA * 0.67 + cloudB * 0.33);",
  "  float cloudShape = exp(-dot(centered * vec2(1.25, 1.7), centered * vec2(1.25, 1.7)) * 3.4);",
  "  float dust = cloudMask * cloudShape * 0.105;",
  "  vec3 color = vec3(0.0055, 0.0053, 0.0090);",
  "  color += vec3(0.135, 0.087, 0.047) * dust;",
  "  color += vec3(0.060, 0.071, 0.089) * cloudMask * cloudShape * 0.012;",
  "  float stars = starField(gl_FragCoord.xy);",
  "  color += vec3(0.72, 0.77, 0.82) * stars;",
  "  color += vec3(0.78, 0.55, 0.32) * stars * 0.12;",
  "  float meteors = meteorTrail(uv, 1.0, 21.0) + meteorTrail(uv, 3.7, 29.0);",
  "  color += vec3(0.28, 0.17, 0.085) * meteors;",
  "  gl_FragColor = vec4(color, 1.0);",
  "  #include <colorspace_fragment>",
  "}"
].join("\n");

const SATURN_VERTEX_SHADER = [
  "varying vec2 vUv;",
  "varying vec3 vNormalView;",
  "varying vec3 vViewPosition;",
  "void main() {",
  "  vUv = uv;",
  "  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);",
  "  vNormalView = normalize(normalMatrix * normal);",
  "  vViewPosition = -viewPosition.xyz;",
  "  gl_Position = projectionMatrix * viewPosition;",
  "}"
].join("\n");

const SATURN_FRAGMENT_SHADER = [
  "uniform vec3 uCream;",
  "uniform vec3 uCaramel;",
  "uniform vec3 uWarmGray;",
  "uniform vec3 uLightDirection;",
  "uniform float uTime;",
  "varying vec2 vUv;",
  "varying vec3 vNormalView;",
  "varying vec3 vViewPosition;",
  "float hash21(vec2 p) {",
  "  p = fract(p * vec2(123.34, 456.21));",
  "  p += dot(p, p + 45.32);",
  "  return fract(p.x * p.y);",
  "}",
  "float noise2(vec2 p) {",
  "  vec2 i = floor(p);",
  "  vec2 f = fract(p);",
  "  f = f * f * (3.0 - 2.0 * f);",
  "  float a = hash21(i);",
  "  float b = hash21(i + vec2(1.0, 0.0));",
  "  float c = hash21(i + vec2(0.0, 1.0));",
  "  float d = hash21(i + vec2(1.0, 1.0));",
  "  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);",
  "}",
  "float fbm(vec2 p) {",
  "  float value = 0.0;",
  "  float amplitude = 0.5;",
  "  mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);",
  "  for (int i = 0; i < 5; i++) {",
  "    value += amplitude * noise2(p);",
  "    p = rotation * p * 2.02 + 17.13;",
  "    amplitude *= 0.5;",
  "  }",
  "  return value;",
  "}",
  "void main() {",
  "  float longitude = vUv.x * 6.2831853;",
  "  float latitude = (vUv.y - 0.5) * 2.0;",
  "  vec2 wrappedLongitude = vec2(cos(longitude), sin(longitude));",
  "  vec2 domain = wrappedLongitude * vec2(2.7, 3.8) + vec2(latitude * 1.8, latitude * 7.1);",
  "  float broadNoise = fbm(domain * 1.05);",
  "  float cloudNoise = fbm(domain * 3.2 + vec2(4.1, -2.3));",
  "  float fineNoise = fbm(domain * 8.4 + vec2(-3.7, 6.2));",
  "  float warp = (broadNoise - 0.5) * 7.8 + (cloudNoise - 0.5) * 2.4;",
  "  float broadBands = sin(latitude * 58.0 + warp);",
  "  float fineBands = sin(latitude * 174.0 + cloudNoise * 4.4 + fineNoise * 1.8);",
  "  float bandValue = broadBands * 0.74 + fineBands * 0.26;",
  "  float creamMask = smoothstep(-0.12, 0.82, bandValue);",
  "  float grayMask = smoothstep(0.54, 0.96, -bandValue + (fineNoise - 0.5) * 0.45);",
  "  vec3 atmosphere = mix(uCaramel, uCream, creamMask * 0.82 + 0.08);",
  "  atmosphere = mix(atmosphere, uWarmGray, grayMask * 0.34);",
  "  atmosphere += vec3(0.012, 0.010, 0.006) * (cloudNoise - 0.5);",
  "  float polarSoftening = smoothstep(0.74, 1.0, abs(latitude));",
  "  atmosphere = mix(atmosphere, uWarmGray * 0.93, polarSoftening * 0.23);",
  "  vec3 normal = normalize(vNormalView);",
  "  vec3 viewDirection = normalize(vViewPosition);",
  "  vec3 lightDirection = normalize(uLightDirection);",
  "  float diffuse = max(dot(normal, lightDirection), 0.0);",
  "  float terminator = smoothstep(-0.11, 0.24, diffuse);",
  "  float illumination = 0.045 + pow(diffuse, 0.82) * 0.92 * terminator;",
  "  vec3 halfDirection = normalize(lightDirection + viewDirection);",
  "  float specular = pow(max(dot(normal, halfDirection), 0.0), 36.0) * 0.045 * terminator;",
  "  float limb = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.4);",
  "  vec3 limbTint = vec3(0.014, 0.018, 0.021) * limb * 0.22;",
  "  vec3 finalColor = atmosphere * illumination + vec3(specular) + limbTint;",
  "  gl_FragColor = vec4(finalColor, 1.0);",
  "  #include <tonemapping_fragment>",
  "  #include <colorspace_fragment>",
  "}"
].join("\n");

const RING_VERTEX_SHADER = [
  "varying vec2 vRingPosition;",
  "void main() {",
  "  vRingPosition = position.xy;",
  "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
  "}"
].join("\n");

const RING_FRAGMENT_SHADER = [
  "uniform vec3 uIceColor;",
  "uniform vec3 uShadowColor;",
  "uniform vec3 uLightDirection;",
  "uniform float uInnerRadius;",
  "uniform float uOuterRadius;",
  "uniform float uOpacity;",
  "varying vec2 vRingPosition;",
  "float hash21(vec2 p) {",
  "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);",
  "}",
  "float noise2(vec2 p) {",
  "  vec2 i = floor(p);",
  "  vec2 f = fract(p);",
  "  f = f * f * (3.0 - 2.0 * f);",
  "  float a = hash21(i);",
  "  float b = hash21(i + vec2(1.0, 0.0));",
  "  float c = hash21(i + vec2(0.0, 1.0));",
  "  float d = hash21(i + vec2(1.0, 1.0));",
  "  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);",
  "}",
  "void main() {",
  "  float radius = length(vRingPosition);",
  "  float t = clamp((radius - uInnerRadius) / (uOuterRadius - uInnerRadius), 0.0, 1.0);",
  "  float edgeFade = smoothstep(0.0, 0.028, t) * (1.0 - smoothstep(0.965, 1.0, t));",
  "  float cassiniDivision = 1.0 - 0.94 * smoothstep(0.585, 0.592, t) * (1.0 - smoothstep(0.625, 0.635, t));",
  "  float enckeGap = 1.0 - 0.48 * smoothstep(0.935, 0.941, t) * (1.0 - smoothstep(0.947, 0.954, t));",
  "  float cRing = smoothstep(0.0, 0.18, t);",
  "  float particleNoise = noise2(vec2(t * 310.0, atan(vRingPosition.y, vRingPosition.x) * 3.0));",
  "  float fineRings = 0.72 + 0.28 * sin(t * 760.0 + particleNoise * 3.0);",
  "  float broadRings = 0.79 + 0.21 * sin(t * 54.0 + particleNoise * 1.8);",
  "  float density = mix(0.48, 1.0, cRing) * fineRings * broadRings;",
  "  vec3 pointOnRing = vec3(vRingPosition, 0.0);",
  "  vec3 lightDirection = normalize(uLightDirection);",
  "  float lightSide = dot(pointOnRing, lightDirection);",
  "  float rayDistance = max(-lightSide, 0.0);",
  "  vec3 closestPoint = pointOnRing + lightDirection * rayDistance;",
  "  float shadowDistance = length(closestPoint);",
  "  float planetShadow = (1.0 - smoothstep(1.30, 1.50, shadowDistance)) * step(0.0, -lightSide);",
  "  float shadowFactor = 1.0 - planetShadow * 0.92;",
  "  float alpha = edgeFade * cassiniDivision * enckeGap * density * uOpacity * shadowFactor;",
  "  vec3 ringColor = mix(uShadowColor, uIceColor, 0.42 + particleNoise * 0.32 + fineRings * 0.10);",
  "  ringColor *= 1.0 - planetShadow * 0.54;",
  "  gl_FragColor = vec4(ringColor, alpha);",
  "  #include <tonemapping_fragment>",
  "  #include <colorspace_fragment>",
  "}"
].join("\n");

function ProceduralBackdrop({ animated }) {
  const { size, gl } = useThree();
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 }
    },
    vertexShader: BACKDROP_VERTEX_SHADER,
    fragmentShader: BACKDROP_FRAGMENT_SHADER,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  }), []);

  useFrame((state) => {
    material.uniforms.uTime.value = animated ? state.clock.elapsedTime : 0;
    material.uniforms.uResolution.value.set(
      Math.max(1, gl.domElement.width),
      Math.max(1, gl.domElement.height)
    );
  });

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh
      position={[0, 0, -30]}
      scale={[100, 60, 1]}
      renderOrder={-100}
      frustumCulled={false}
    >
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function Saturn({ animated, compact }) {
  const planetRef = useRef(null);
  const planetMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uCream: { value: new THREE.Color("#C8B598") },
      uCaramel: { value: new THREE.Color("#7D6950") },
      uWarmGray: { value: new THREE.Color("#4A3F33") },
      uLightDirection: { value: new THREE.Vector3(-0.56, 0.60, 0.84).normalize() },
      uTime: { value: 0 }
    },
    vertexShader: SATURN_VERTEX_SHADER,
    fragmentShader: SATURN_FRAGMENT_SHADER,
    toneMapped: true
  }), []);

  const ringMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uIceColor: { value: new THREE.Color("#C9C1B2") },
      uShadowColor: { value: new THREE.Color("#514B42") },
      uLightDirection: { value: new THREE.Vector3(-0.78, 0.24, 0.58).normalize() },
      uInnerRadius: { value: RING_INNER_RADIUS },
      uOuterRadius: { value: RING_OUTER_RADIUS },
      uOpacity: { value: 0.58 }
    },
    vertexShader: RING_VERTEX_SHADER,
    fragmentShader: RING_FRAGMENT_SHADER,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: false,
    toneMapped: true
  }), []);

  useFrame((_, delta) => {
    if (animated && planetRef.current) {
      planetRef.current.rotation.y += delta * 0.0022;
    }
    if (animated) {
      planetMaterial.uniforms.uTime.value += delta;
    }
  });

  useEffect(() => () => {
    planetMaterial.dispose();
    ringMaterial.dispose();
  }, [planetMaterial, ringMaterial]);

  const position = compact ? [1.12, -1.20, -1.55] : [2.62, -1.12, -1.65];
  const scale = compact ? 0.48 : 0.91;

  return (
    <group
      position={position}
      scale={scale}
      rotation={[0.466, 0, 0.2]}
    >
      <mesh
        ref={planetRef}
        position={[0, 0, 0]}
        renderOrder={1}
      >
        <sphereGeometry args={[SATURN_RADIUS, 144, 112]} />
        <primitive object={planetMaterial} attach="material" />
      </mesh>

      <mesh
        position={[0, 0, 0]}
        renderOrder={2}
      >
        <ringGeometry args={[RING_INNER_RADIUS, RING_OUTER_RADIUS, 512]} />
        <primitive object={ringMaterial} attach="material" />
      </mesh>
    </group>
  );
}

function CameraParallax({ pointerRef, animated }) {
  const { camera } = useThree();

  useFrame((state, delta) => {
    if (!animated) return;

    const driftX = Math.sin(state.clock.elapsedTime * 0.035) * 0.012;
    const driftY = Math.cos(state.clock.elapsedTime * 0.028) * 0.009;
    const targetX = pointerRef.current.x * 0.055 + driftX;
    const targetY = pointerRef.current.y * 0.04 + driftY;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 1.8, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 1.8, delta);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function SpaceScene({ active, reducedMotion, pointerRef }) {
  const { size } = useThree();
  const compact = size.width < 720;
  const animated = active && !reducedMotion;

  return (
    <>
      <color attach="background" args={["#050508"]} />
      <ProceduralBackdrop animated={animated} />
      <CameraParallax pointerRef={pointerRef} animated={animated} />
      <Saturn animated={animated} compact={compact} />
    </>
  );
}

export default function SpaceBackground({ active = true }) {
  const pointerRef = useRef({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(() => (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ));

  useEffect(() => {
    const handlePointerMove = (event) => {
      const width = Math.max(window.innerWidth, 1);
      const height = Math.max(window.innerHeight, 1);
      pointerRef.current = {
        x: (event.clientX / width - 0.5) * 2,
        y: (0.5 - event.clientY / height) * 2
      };
    };

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = (event) => setReducedMotion(event.matches);

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    if (motionQuery.addEventListener) {
      motionQuery.addEventListener("change", handleMotionChange);
    } else {
      motionQuery.addListener(handleMotionChange);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (motionQuery.removeEventListener) {
        motionQuery.removeEventListener("change", handleMotionChange);
      } else {
        motionQuery.removeListener(handleMotionChange);
      }
    };
  }, []);

  return (
    <Canvas
      className="tcs-space-scene"
      camera={{ position: [0, 0, 9], fov: 42, near: 0.1, far: 180 }}
      dpr={[1, 1.35]}
      frameloop={active && !reducedMotion ? "always" : "demand"}
      gl={{
        alpha: false,
        antialias: true,
        powerPreference: "low-power",
        toneMapping: THREE.ACESFilmicToneMapping
      }}
      fallback={null}
    >
      <SpaceScene
        active={active}
        reducedMotion={reducedMotion}
        pointerRef={pointerRef}
      />
    </Canvas>
  );
}

export function mountSpaceBackground(parent, initiallyActive = true) {
  if (!parent) return null;

  const host = document.createElement("div");
  host.className = "tcs-r3f-background";
  host.setAttribute("aria-hidden", "true");
  parent.prepend(host);

  const root = createRoot(host);
  let active = Boolean(initiallyActive);
  let disposed = false;

  const render = () => root.render(<SpaceBackground active={active} />);
  render();

  return {
    setActive(value) {
      if (disposed) return;
      const next = Boolean(value);
      if (next === active) return;
      active = next;
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.unmount();
      host.remove();
    }
  };
}
