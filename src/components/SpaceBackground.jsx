import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, useTexture } from "@react-three/drei";
import * as THREE from "three";

const SATURN_RADIUS = 2.2;
const RING_INNER_RADIUS = 2.8;
const RING_OUTER_RADIUS = 5.2;

// Commit-pinned jsDelivr assets. The source files are unmodified Solar System Scope maps.
const SATURN_SURFACE_TEXTURE =
  "https://cdn.jsdelivr.net/gh/RTF22/Orrery@6c81feb760cb36d7d83d1421aef257833ba9768e/assets-quellen/texturen/saturn/albedo.jpg";
const SATURN_RING_TEXTURE =
  "https://cdn.jsdelivr.net/gh/RTF22/Orrery@6c81feb760cb36d7d83d1421aef257833ba9768e/public/textures/saturn/ring.png";

const DUST_VERTEX_SHADER = [
  "varying vec2 vUv;",
  "void main() {",
  "  vUv = uv;",
  "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
  "}"
].join("\\n");

const DUST_FRAGMENT_SHADER = [
  "uniform float uTime;",
  "uniform float uOpacity;",
  "varying vec2 vUv;",
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
  "    p = rotation * p * 2.03 + 13.17;",
  "    amplitude *= 0.5;",
  "  }",
  "  return value;",
  "}",
  "void main() {",
  "  vec2 flow = vec2(uTime * 0.004, -uTime * 0.0018);",
  "  vec2 p = vUv * vec2(4.2, 2.7) + flow;",
  "  float cloudA = fbm(p);",
  "  float cloudB = fbm(p * 2.4 + vec2(5.1, -3.2));",
  "  float filaments = smoothstep(0.43, 0.78, cloudA * 0.72 + cloudB * 0.28);",
  "  vec2 centered = (vUv - vec2(0.66, 0.48)) * vec2(1.25, 1.85);",
  "  float envelope = exp(-dot(centered, centered) * 3.25);",
  "  float wisps = filaments * envelope;",
  "  float alpha = wisps * uOpacity;",
  "  vec3 goldDust = vec3(0.83, 0.64, 0.45);",
  "  vec3 color = goldDust * (0.34 + cloudA * 0.24);",
  "  gl_FragColor = vec4(color, alpha);",
  "  #include <colorspace_fragment>",
  "}"
].join("\\n");

function createRadialRingGeometry(innerRadius, outerRadius, thetaSegments = 512, radialSegments = 48) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let radialIndex = 0; radialIndex <= radialSegments; radialIndex += 1) {
    const radialUv = radialIndex / radialSegments;
    const radius = THREE.MathUtils.lerp(innerRadius, outerRadius, radialUv);

    for (let angularIndex = 0; angularIndex <= thetaSegments; angularIndex += 1) {
      const angularUv = angularIndex / thetaSegments;
      const angle = angularUv * Math.PI * 2;
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      normals.push(0, 0, 1);

      // The source image is a radial strip: U maps inner-to-outer radius.
      // V samples the strip centre so each radius forms a concentric band.
      uvs.push(radialUv, 0.5);
    }
  }

  const rowLength = thetaSegments + 1;
  for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
    for (let angularIndex = 0; angularIndex < thetaSegments; angularIndex += 1) {
      const a = radialIndex * rowLength + angularIndex;
      const b = a + 1;
      const c = a + rowLength;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

class SaturnTextureBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Saturn({ animated, compact }) {
  const orbitGroupRef = useRef(null);
  const planetRef = useRef(null);
  const { gl } = useThree();
  const [saturnTexture, ringTexture] = useTexture([
    SATURN_SURFACE_TEXTURE,
    SATURN_RING_TEXTURE
  ]);

  const ringGeometry = useMemo(
    () => createRadialRingGeometry(RING_INNER_RADIUS, RING_OUTER_RADIUS),
    []
  );

  useEffect(() => {
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());

    saturnTexture.colorSpace = THREE.SRGBColorSpace;
    saturnTexture.wrapS = THREE.RepeatWrapping;
    saturnTexture.wrapT = THREE.ClampToEdgeWrapping;
    saturnTexture.anisotropy = anisotropy;
    saturnTexture.needsUpdate = true;

    ringTexture.colorSpace = THREE.SRGBColorSpace;
    ringTexture.wrapS = THREE.ClampToEdgeWrapping;
    ringTexture.wrapT = THREE.ClampToEdgeWrapping;
    ringTexture.anisotropy = anisotropy;
    ringTexture.needsUpdate = true;

    return () => ringGeometry.dispose();
  }, [gl, saturnTexture, ringTexture, ringGeometry]);

  useFrame((_, delta) => {
    if (!animated) return;

    if (orbitGroupRef.current) {
      orbitGroupRef.current.rotation.y += delta * 0.03;
    }

    if (planetRef.current) {
      planetRef.current.rotation.y += delta * 0.08;
    }
  });

  const position = compact ? [0.45, -1.15, 0] : [3.0, -0.55, 0];
  const scale = compact ? 0.28 : 0.58;

  return (
    <group ref={orbitGroupRef}>
      <group
        position={position}
        rotation={[0.466, 0, -0.25]}
        scale={scale}
      >
        <mesh
          ref={planetRef}
          position={[0, 0, 0]}
          castShadow={false}
          receiveShadow={false}
        >
          <sphereGeometry args={[SATURN_RADIUS, 128, 96]} />
          <meshStandardMaterial
            map={saturnTexture}
            roughness={0.85}
            metalness={0}
          />
        </mesh>

        <mesh
          position={[0, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow={false}
          receiveShadow={false}
        >
          <primitive object={ringGeometry} attach="geometry" />
          <meshStandardMaterial
            map={ringTexture}
            color="#F2E9D9"
            roughness={0.85}
            metalness={0}
            transparent
            opacity={0.94}
            alphaTest={0.018}
            side={THREE.DoubleSide}
            depthTest
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}

function CosmicDust({ animated }) {
  const material = useMemo(
    () => new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.08 }
      },
      vertexShader: DUST_VERTEX_SHADER,
      fragmentShader: DUST_FRAGMENT_SHADER,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    }),
    []
  );

  useFrame((state) => {
    material.uniforms.uTime.value = animated ? state.clock.elapsedTime : 0;
  });

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh
      position={[0, 0, -30]}
      scale={[76, 44, 1]}
      renderOrder={-20}
      frustumCulled={false}
    >
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function CameraParallax({ pointerRef, animated }) {
  const { camera } = useThree();

  useFrame((state, delta) => {
    if (!animated) return;

    const driftX = Math.sin(state.clock.elapsedTime * 0.026) * 0.008;
    const driftY = Math.cos(state.clock.elapsedTime * 0.021) * 0.006;
    const targetX = pointerRef.current.x * 0.028 + driftX;
    const targetY = pointerRef.current.y * 0.022 + driftY;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 1.5, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 1.5, delta);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function SpaceScene({ active, reducedMotion, pointerRef }) {
  const animated = active && !reducedMotion;
  const { size } = useThree();
  const compact = size.width < 720;

  return (
    <>
      <color attach="background" args={["#020207"]} />

      <CosmicDust animated={animated} />
      <Stars
        radius={100}
        depth={75}
        count={3000}
        factor={1.7}
        saturation={0.12}
        fade
        speed={0.12}
      />

      <ambientLight intensity={0.08} />
      <directionalLight
        color="#FFF5E4"
        intensity={1.8}
        position={[-4.5, 5.5, 8]}
      />

      <CameraParallax pointerRef={pointerRef} animated={animated} />

      <SaturnTextureBoundary>
        <Saturn animated={animated} compact={compact} />
      </SaturnTextureBoundary>
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
      dpr={[1, 1.25]}
      frameloop={active && !reducedMotion ? "always" : "demand"}
      gl={{
        alpha: false,
        antialias: true,
        powerPreference: "low-power",
        toneMapping: THREE.ACESFilmicToneMapping
      }}
      fallback={null}
    >
      <Suspense fallback={null}>
        <SpaceScene
          active={active}
          reducedMotion={reducedMotion}
          pointerRef={pointerRef}
        />
      </Suspense>
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
