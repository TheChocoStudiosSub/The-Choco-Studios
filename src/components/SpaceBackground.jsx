import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

const SATURN_RADIUS = 1.42;
const RING_INNER_RADIUS = 1.48;
const RING_OUTER_RADIUS = 3.42;

const RIM_VERTEX_SHADER = [
  "varying vec3 vNormalView;",
  "varying vec3 vViewDirection;",
  "varying vec3 vLocalPosition;",
  "void main() {",
  "  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);",
  "  vNormalView = normalize(normalMatrix * normal);",
  "  vViewDirection = normalize(-viewPosition.xyz);",
  "  vLocalPosition = normalize(position);",
  "  gl_Position = projectionMatrix * viewPosition;",
  "}"
].join("\n");

const RIM_FRAGMENT_SHADER = [
  "uniform vec3 uGold;",
  "uniform vec3 uBlue;",
  "uniform float uOpacity;",
  "varying vec3 vNormalView;",
  "varying vec3 vViewDirection;",
  "varying vec3 vLocalPosition;",
  "void main() {",
  "  float facing = max(dot(normalize(vNormalView), normalize(vViewDirection)), 0.0);",
  "  float fresnel = pow(1.0 - facing, 2.8);",
  "  float edge = smoothstep(0.2, 0.98, fresnel);",
  "  float warmSide = smoothstep(-0.5, 0.55, vLocalPosition.x);",
  "  vec3 rimColor = mix(uBlue, uGold, warmSide);",
  "  float alpha = edge * uOpacity * (0.35 + 0.35 * warmSide);",
  "  gl_FragColor = vec4(rimColor, alpha);",
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
  "uniform vec3 uGold;",
  "uniform vec3 uBrown;",
  "uniform float uInnerRadius;",
  "uniform float uOuterRadius;",
  "uniform float uOpacity;",
  "varying vec2 vRingPosition;",
  "void main() {",
  "  float radius = length(vRingPosition);",
  "  float t = clamp((radius - uInnerRadius) / (uOuterRadius - uInnerRadius), 0.0, 1.0);",
  "  float edgeFade = smoothstep(0.0, 0.035, t) * (1.0 - smoothstep(0.94, 1.0, t));",
  "  float cassiniGap = 1.0 - 0.86 * smoothstep(0.675, 0.69, t) * (1.0 - smoothstep(0.715, 0.73, t));",
  "  float enckeGap = 1.0 - 0.36 * smoothstep(0.94, 0.946, t) * (1.0 - smoothstep(0.952, 0.96, t));",
  "  float ringlets = 0.88 + 0.12 * sin(t * 390.0 + sin(t * 41.0) * 1.8);",
  "  float broadBands = 0.72 + 0.28 * sin(t * 22.0 + 0.7);",
  "  vec3 ringColor = mix(uBrown, uGold, 0.24 + 0.58 * smoothstep(0.08, 0.92, t));",
  "  float alpha = edgeFade * cassiniGap * enckeGap * ringlets * broadBands * uOpacity;",
  "  gl_FragColor = vec4(ringColor, alpha);",
  "}"
].join("\n");

function createSaturnAtmosphereTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;

  const context = canvas.getContext("2d");
  if (!context) {
    const fallback = new THREE.CanvasTexture(canvas);
    fallback.colorSpace = THREE.SRGBColorSpace;
    return fallback;
  }

  const dark = new THREE.Color("#3E3022");
  const ochre = new THREE.Color("#8C6D46");
  const pale = new THREE.Color("#B29A76");
  const shadow = new THREE.Color("#5C4934");

  for (let y = 0; y < canvas.height; y += 1) {
    const latitude = 1 - (y / (canvas.height - 1)) * 2;
    const broadWave = Math.sin(latitude * 16.5 + Math.sin(latitude * 4.7) * 1.15);
    const fineWave = Math.sin(latitude * 79 + Math.sin(latitude * 21) * 1.8);
    const thinClouds = Math.sin(latitude * 184 + Math.sin(latitude * 39) * 2.1);
    const polarFade = 1 - Math.pow(Math.abs(latitude), 5) * 0.28;

    const ochreMix = THREE.MathUtils.clamp(
      0.48 + broadWave * 0.19 + fineWave * 0.055 + thinClouds * 0.018,
      0.18,
      0.82
    );
    const bandColor = dark.clone().lerp(ochre, ochreMix);
    if (broadWave > 0.3) {
      bandColor.lerp(pale, (broadWave - 0.3) * 0.13);
    }
    if (broadWave < -0.55) {
      bandColor.lerp(shadow, (-broadWave - 0.55) * 0.15);
    }
    bandColor.multiplyScalar(0.88 + polarFade * 0.12);

    context.fillStyle = "rgb(" + Math.round(bandColor.r * 255) + ", " + Math.round(bandColor.g * 255) + ", " + Math.round(bandColor.b * 255) + ")";
    context.fillRect(0, y, canvas.width, 1);
  }

  context.save();
  context.globalAlpha = 0.055;
  context.lineWidth = 1;
  for (let index = 0; index < 72; index += 1) {
    const y = 80 + index * 12.2;
    context.strokeStyle = index % 3 === 0 ? "#D3B78D" : "#33271D";
    context.beginPath();
    context.moveTo(0, y);
    context.bezierCurveTo(
      canvas.width * 0.28, y - 5 + Math.sin(index * 0.8) * 4,
      canvas.width * 0.68, y + 4 + Math.cos(index * 0.61) * 5,
      canvas.width, y - 2 + Math.sin(index * 0.37) * 4
    );
    context.stroke();
  }
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function SaturnAtmosphere({ animated }) {
  const meshRef = useRef(null);
  const texture = useMemo(() => createSaturnAtmosphereTexture(), []);

  useFrame((_, delta) => {
    if (animated && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.009;
    }
  });

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh ref={meshRef} renderOrder={1}>
      <sphereGeometry args={[SATURN_RADIUS, 128, 96]} />
      <meshPhysicalMaterial
        map={texture}
        color="#F1E5D2"
        roughness={0.96}
        metalness={0.015}
        emissive="#1B1209"
        emissiveIntensity={0.075}
        clearcoat={0.015}
        clearcoatRoughness={1}
        specularIntensity={0.16}
      />
    </mesh>
  );
}

function SaturnRim({ scale, opacity }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uGold: { value: new THREE.Color("#B18A5A") },
      uBlue: { value: new THREE.Color("#596F8C") },
      uOpacity: { value: opacity }
    },
    vertexShader: RIM_VERTEX_SHADER,
    fragmentShader: RIM_FRAGMENT_SHADER,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  }), [opacity]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh scale={scale} renderOrder={2}>
      <sphereGeometry args={[SATURN_RADIUS, 96, 72]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function SaturnRings({ animated }) {
  const groupRef = useRef(null);
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uGold: { value: new THREE.Color("#8C6D46") },
      uBrown: { value: new THREE.Color("#3E3022") },
      uInnerRadius: { value: RING_INNER_RADIUS },
      uOuterRadius: { value: RING_OUTER_RADIUS },
      uOpacity: { value: 0.58 }
    },
    vertexShader: RING_VERTEX_SHADER,
    fragmentShader: RING_FRAGMENT_SHADER,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
    toneMapped: false
  }), []);

  useFrame((_, delta) => {
    if (animated && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.0035;
    }
  });

  useEffect(() => () => material.dispose(), [material]);

  return (
    <group
      ref={groupRef}
      rotation={[1.12, 0.015, -0.45]}
      renderOrder={2}
    >
      <mesh renderOrder={2}>
        <ringGeometry args={[RING_INNER_RADIUS, RING_OUTER_RADIUS, 384]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}

function Saturn({ position, scale, animated }) {
  const groupRef = useRef(null);

  useFrame((_, delta) => {
    if (animated && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.002;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <SaturnAtmosphere animated={animated} />
      <SaturnRings animated={animated} />
      <SaturnRim scale={1.025} opacity={0.105} />
      <SaturnRim scale={1.105} opacity={0.018} />
    </group>
  );
}

function CameraParallax({ pointerRef, animated }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!animated) return;

    const targetX = pointerRef.current.x * 0.13;
    const targetY = pointerRef.current.y * 0.085;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 2.3, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 2.3, delta);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function SpaceScene({ active, reducedMotion, pointerRef }) {
  const { size } = useThree();
  const compact = size.width < 720;
  const saturnPosition = compact ? [1.04, -0.72, -1.15] : [3.0, -0.78, -1.55];
  const saturnScale = compact ? 0.58 : 0.9;
  const animated = active && !reducedMotion;

  return (
    <>
      <color attach="background" args={["#050508"]} />
      <ambientLight color="#9A8C76" intensity={0.31} />
      <pointLight
        color="#D4A373"
        intensity={5.2}
        distance={15}
        decay={2}
        position={[-2.8, 3.6, 5.2]}
      />
      <pointLight
        color="#587DA6"
        intensity={2.2}
        distance={13}
        decay={2}
        position={[4.5, 0.4, -0.2]}
      />
      <directionalLight
        color="#C5AE8B"
        intensity={0.42}
        position={[-4.2, 3.8, 4.8]}
      />

      <Stars
        radius={100}
        depth={82}
        count={compact ? 760 : 1650}
        factor={1.45}
        saturation={0.06}
        fade
        speed={animated ? 0.045 : 0}
      />

      <CameraParallax pointerRef={pointerRef} animated={animated} />
      <Saturn
        position={saturnPosition}
        scale={saturnScale}
        animated={animated}
      />
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
