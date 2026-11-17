import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

const PLANET_RADIUS = 1.42;

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
  "uniform float uTime;",
  "varying vec3 vNormalView;",
  "varying vec3 vViewDirection;",
  "varying vec3 vLocalPosition;",
  "void main() {",
  "  float facing = max(dot(normalize(vNormalView), normalize(vViewDirection)), 0.0);",
  "  float fresnel = pow(1.0 - facing, 2.35);",
  "  float edge = smoothstep(0.08, 0.94, fresnel);",
  "  float warmSide = smoothstep(-0.42, 0.56, vLocalPosition.x + 0.08 * sin(vLocalPosition.y * 7.0 + uTime * 0.12));",
  "  vec3 rimColor = mix(uBlue, uGold, warmSide);",
  "  float alpha = edge * uOpacity * (0.55 + 0.45 * warmSide);",
  "  gl_FragColor = vec4(rimColor, alpha);",
  "}"
].join("\n");

function PlanetRim({ scale, opacity }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uGold: { value: new THREE.Color("#D4A373") },
      uBlue: { value: new THREE.Color("#568BCB") },
      uOpacity: { value: opacity },
      uTime: { value: 0 }
    },
    vertexShader: RIM_VERTEX_SHADER,
    fragmentShader: RIM_FRAGMENT_SHADER,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  }), [opacity]);

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
  });

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh scale={scale} renderOrder={2}>
      <sphereGeometry args={[PLANET_RADIUS, 72, 72]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function Planet({ position, scale, animated }) {
  const bodyRef = useRef(null);

  useFrame((_, delta) => {
    if (animated && bodyRef.current) {
      bodyRef.current.rotation.y += delta * 0.045;
      bodyRef.current.rotation.x = 0.12 + Math.sin(performance.now() * 0.00008) * 0.012;
    }
  });

  return (
    <group position={position} scale={scale}>
      <mesh ref={bodyRef} renderOrder={1}>
        <sphereGeometry args={[PLANET_RADIUS, 96, 96]} />
        <meshPhysicalMaterial
          color="#172333"
          emissive="#08111D"
          emissiveIntensity={0.24}
          roughness={0.88}
          metalness={0.12}
          clearcoat={0.12}
          clearcoatRoughness={0.72}
        />
      </mesh>
      <PlanetRim scale={1.045} opacity={0.72} />
      <PlanetRim scale={1.16} opacity={0.13} />
    </group>
  );
}

function ParticleRing({ position, scale, animated }) {
  const groupRef = useRef(null);
  const meshRef = useRef(null);

  const particles = useMemo(() => {
    const count = 420;
    return Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.018;
      const radius = 2.02 + (Math.random() - 0.5) * 0.34;
      const blue = Math.random() > 0.79;
      return {
        x: Math.cos(angle) * radius,
        y: (Math.random() - 0.5) * 0.17,
        z: Math.sin(angle) * radius,
        size: 0.0045 + Math.random() * 0.012,
        color: blue ? "#7CA9E2" : (Math.random() > 0.72 ? "#F0D3A8" : "#D4A373")
      };
    });
  }, []);

  const geometry = useMemo(() => new THREE.SphereGeometry(1, 6, 6), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#FFFFFF",
    vertexColors: true,
    toneMapped: false
  }), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();
    particles.forEach((particle, index) => {
      dummy.position.set(particle.x, particle.y, particle.z);
      dummy.scale.setScalar(particle.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, new THREE.Color(particle.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [particles]);

  useFrame((_, delta) => {
    if (animated && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.075;
    }
  });

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  return (
    <group
      ref={groupRef}
      position={position}
      scale={scale}
      rotation={[0.28, 0, -0.2]}
    >
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, particles.length]}
        frustumCulled={false}
        renderOrder={3}
      />
    </group>
  );
}

function CameraParallax({ pointerRef, animated }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!animated) return;

    const targetX = pointerRef.current.x * 0.2;
    const targetY = pointerRef.current.y * 0.12;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 3.2, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 3.2, delta);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function SpaceScene({ active, reducedMotion, pointerRef }) {
  const { size } = useThree();
  const compact = size.width < 720;
  const planetPosition = compact ? [1.15, 0.02, -1.3] : [2.35, 0.03, -1.35];
  const planetScale = compact ? 0.78 : 1;
  const animated = active && !reducedMotion;

  return (
    <>
      <color attach="background" args={["#050508"]} />
      <ambientLight color="#8793AA" intensity={0.48} />
      <pointLight
        color="#D4A373"
        intensity={34}
        distance={18}
        decay={2}
        position={[-1.8, 2.2, 3.8]}
      />
      <pointLight
        color="#4F83C5"
        intensity={23}
        distance={15}
        decay={2}
        position={[4.8, 0.25, -0.15]}
      />
      <directionalLight
        color="#D9C7AF"
        intensity={1.05}
        position={[-3.5, 4.2, 5]}
      />

      <Stars
        radius={100}
        depth={82}
        count={compact ? 1250 : 2750}
        factor={3.1}
        saturation={0.2}
        fade
        speed={animated ? 0.22 : 0}
      />

      <CameraParallax pointerRef={pointerRef} animated={animated} />
      <Planet position={planetPosition} scale={planetScale} animated={animated} />
      <ParticleRing position={planetPosition} scale={planetScale} animated={animated} />
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
      dpr={[1, 1.55]}
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
