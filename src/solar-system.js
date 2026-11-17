import * as THREE from "three";
import * as Astronomy from "astronomy-engine";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const BODY = Astronomy.Body;
const hasEphemeris = Boolean(BODY && typeof Astronomy.HelioVector === "function");
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;
const OBLIQUITY = 23.439291111 * Math.PI / 180;
const LOG_FACTOR = 3.7;
const MAX_VISUAL_RADIUS = 25.2;
const MAX_AU = 30.07;

const PLANETS = [
  { key:"Mercury", radius:.145, kind:"mercury", seed:11, roughness:.96, metalness:.025, bump:.095, tilt:2.04, spin:.16, period:88, orbit:{a:.3871,e:.2056,i:7.005,node:48.33,peri:29.12} },
  { key:"Venus", radius:.205, kind:"venus", seed:27, roughness:.94, metalness:.01, bump:.035, tilt:177.36, spin:-.055, period:224.7, orbit:{a:.7233,e:.0068,i:3.3947,node:76.68,peri:54.88} },
  { key:"Earth", radius:.245, kind:"earth", seed:42, roughness:.82, metalness:.015, bump:.055, tilt:23.44, spin:.13, period:365.256, orbit:{a:1,e:.0167,i:.00005,node:-11.26,peri:102.94} },
  { key:"Mars", radius:.185, kind:"mars", seed:64, roughness:.96, metalness:.01, bump:.11, tilt:25.19, spin:.11, period:686.98, orbit:{a:1.5237,e:.0934,i:1.85,node:49.56,peri:286.5} },
  { key:"Jupiter", radius:.72, kind:"jupiter", seed:81, roughness:.92, metalness:.025, bump:.018, tilt:3.13, spin:.2, period:4332.6, orbit:{a:5.2028,e:.0485,i:1.303,node:100.46,peri:273.87} },
  { key:"Saturn", radius:.59, kind:"saturn", seed:103, roughness:.9, metalness:.035, bump:.018, tilt:26.73, spin:.18, period:10759.2, orbit:{a:9.5388,e:.0555,i:2.489,node:113.67,peri:339.39} },
  { key:"Uranus", radius:.39, kind:"uranus", seed:128, roughness:.87, metalness:.025, bump:.012, tilt:97.77, spin:-.12, period:30688.5, orbit:{a:19.191,e:.0463,i:.773,node:74.01,peri:96.99} },
  { key:"Neptune", radius:.375, kind:"neptune", seed:149, roughness:.86, metalness:.025, bump:.018, tilt:28.32, spin:.13, period:60182, orbit:{a:30.07,e:.0095,i:1.77,node:131.78,peri:273.19} }
];

const JPL_BODIES = [
  { key:"Mercury", id:"199" },
  { key:"Venus", id:"299" },
  { key:"Earth", id:"399" },
  { key:"Mars", id:"499" },
  { key:"Jupiter", id:"599" },
  { key:"Saturn", id:"699" },
  { key:"Uranus", id:"799" },
  { key:"Neptune", id:"899" },
  { key:"Moon", id:"301" }
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const randomBetween = (min, max) => min + Math.random() * (max - min);

function makeCanvas(width, height) {
  const canvas = typeof OffscreenCanvas === "function"
    ? new OffscreenCanvas(width, height)
    : document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function terrainField(u, v, seed) {
  const latitude = v * Math.PI;
  const a = Math.sin(TAU * (u * 2.1) + Math.sin(latitude * 3.1 + seed) * 1.45 + seed) * Math.cos(latitude * 1.45 + seed * .17);
  const b = Math.sin(TAU * (u * 5.3 + v * 1.25) + Math.cos(latitude * 4.3 + seed) * .78 + seed * 1.7);
  const c = Math.sin(TAU * (u * 13.2 - v * 3.8) + Math.sin(u * TAU * 4 + seed) * .38 + seed * 2.4);
  const d = Math.sin(TAU * (u * 31 + v * 17) + seed * 3.2);
  return clamp(.5 + a * .18 + b * .145 + c * .085 + d * .035, 0, 1);
}

function canvasTexture(canvas, renderer, colorTexture = true) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.colorSpace = colorTexture ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createSurfaceMaps(kind, seed, renderer) {
  const width = 1024;
  const height = 512;
  const diffuseCanvas = makeCanvas(width, height);
  const bumpCanvas = makeCanvas(width, height);
  const diffuseContext = diffuseCanvas.getContext("2d", { alpha:false });
  const bumpContext = bumpCanvas.getContext("2d", { alpha:false });
  const diffuseImage = diffuseContext.createImageData(width, height);
  const bumpImage = bumpContext.createImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    const v = y / height;
    const latitude = Math.abs(v - .5) * 2;
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const n = terrainField(u, v, seed);
      const fine = terrainField(u * 1.7 + .13, v * 1.9 + .07, seed + 5);
      const grain = Math.sin(TAU * (u * 87 + v * 43) + seed) * .5 + .5;
      let r = 90, g = 90, b = 90, elevation = 110;

      if (kind === "earth") {
        const coast = .515 + latitude * .055;
        if (n > coast + .035) {
          const upland = clamp((n - coast) * 5.5, 0, 1);
          r = 34 + upland * 42 + fine * 11;
          g = 85 + upland * 45 + fine * 18;
          b = 49 + upland * 12 + fine * 8;
          elevation = 154 + upland * 76;
        } else if (n > coast - .018) {
          r = 154; g = 139; b = 91; elevation = 122;
        } else {
          const depth = clamp((coast - n) * 4, 0, 1);
          r = 7 + depth * 3;
          g = 31 + depth * 19;
          b = 67 + depth * 52;
          elevation = 48 + depth * 22;
        }
        const ice = clamp((latitude - .88) * 8, 0, .88);
        r = r * (1 - ice) + 199 * ice;
        g = g * (1 - ice) + 207 * ice;
        b = b * (1 - ice) + 211 * ice;
      } else if (kind === "mars") {
        const dust = (n - .5) * 85 + (fine - .5) * 35;
        r = 133 + dust; g = 61 + dust * .57; b = 37 + dust * .35;
        elevation = 94 + n * 112 + grain * 20;
      } else if (kind === "mercury" || kind === "moon") {
        const crater = Math.pow(Math.max(0, Math.sin(u * TAU * 37 + Math.sin(v * TAU * 16 + seed) * 2) * Math.cos(v * TAU * 21)), 8);
        const gray = 83 + (n - .5) * 115 + crater * 31 + grain * 8;
        r = gray * (kind === "mercury" ? .98 : 1.02);
        g = gray * (kind === "mercury" ? .98 : .99);
        b = gray * (kind === "mercury" ? 1.01 : .94);
        elevation = 60 + n * 138 + crater * 55;
      } else if (kind === "venus") {
        const cloudBand = Math.sin(v * TAU * 20 + Math.sin(u * TAU * 4 + seed) * .7);
        const cloud = clamp(.5 + cloudBand * .22 + (n - .5) * .65, 0, 1);
        r = 139 + cloud * 61 + fine * 9;
        g = 96 + cloud * 64 + fine * 7;
        b = 51 + cloud * 38 + fine * 5;
        elevation = 132 + cloud * 70;
      } else if (kind === "jupiter" || kind === "saturn" || kind === "uranus" || kind === "neptune") {
        const count = kind === "jupiter" ? 25 : kind === "saturn" ? 30 : kind === "uranus" ? 8 : 12;
        const band = Math.sin(v * TAU * count + Math.sin(u * TAU * 3.5 + seed) * .42 + seed * .03);
        const turbulence = (n - .5) * (kind === "jupiter" ? 54 : 26) + (fine - .5) * 18;
        const stripe = band * (kind === "jupiter" ? 24 : kind === "saturn" ? 14 : 8) + turbulence;
        if (kind === "jupiter") {
          r = 170 + stripe; g = 128 + stripe * .73; b = 88 + stripe * .48;
          const dx = (u - .72) / .085;
          const dy = (v - .57) / .055;
          if (dx * dx + dy * dy < 1) {
            r = 155 + stripe * .2; g = 67 + stripe * .16; b = 43 + stripe * .12;
          }
        } else if (kind === "saturn") {
          r = 162 + stripe; g = 139 + stripe * .9; b = 102 + stripe * .65;
        } else if (kind === "uranus") {
          r = 74 + stripe * .44; g = 151 + stripe * .62; b = 165 + stripe * .75;
        } else {
          r = 34 + stripe * .36; g = 77 + stripe * .62; b = 148 + stripe * .9;
        }
        elevation = 108 + (band + 1) * 23 + (n - .5) * 20;
      } else if (kind === "sun") {
        const flame = Math.sin(u * TAU * 23 + Math.sin(v * 18 + seed) * 2.2) * .5 + .5;
        r = 245;
        g = 133 + flame * 91 + n * 27;
        b = 39 + flame * 32;
        elevation = 160 + flame * 70;
      }

      const index = (y * width + x) * 4;
      diffuseImage.data[index] = clamp(Math.round(r), 0, 255);
      diffuseImage.data[index + 1] = clamp(Math.round(g), 0, 255);
      diffuseImage.data[index + 2] = clamp(Math.round(b), 0, 255);
      diffuseImage.data[index + 3] = 255;
      const heightValue = clamp(Math.round(elevation), 0, 255);
      bumpImage.data[index] = heightValue;
      bumpImage.data[index + 1] = heightValue;
      bumpImage.data[index + 2] = heightValue;
      bumpImage.data[index + 3] = 255;
    }
  }

  diffuseContext.putImageData(diffuseImage, 0, 0);
  bumpContext.putImageData(bumpImage, 0, 0);

  return {
    map: canvasTexture(diffuseCanvas, renderer, true),
    bumpMap: canvasTexture(bumpCanvas, renderer, false)
  };
}

function createEarthCloudTexture(renderer) {
  const width = 1024;
  const height = 512;
  const canvas = makeCanvas(width, height);
  const context = canvas.getContext("2d");
  const image = context.createImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    const v = y / height;
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const n = terrainField(u * 1.3 + .24, v * 1.7 + .11, 311);
      const streak = Math.sin(v * TAU * 39 + Math.sin(u * TAU * 6) * 1.2);
      const cloud = clamp((n - .55) * 4.4 + Math.max(0, streak) * .18, 0, .8);
      const i = (y * width + x) * 4;
      image.data[i] = 235;
      image.data[i + 1] = 231;
      image.data[i + 2] = 218;
      image.data[i + 3] = Math.round(cloud * 170);
    }
  }
  context.putImageData(image, 0, 0);
  return canvasTexture(canvas, renderer, true);
}

function createSaturnRingTexture(renderer) {
  const width = 1024;
  const height = 32;
  const canvas = makeCanvas(width, height);
  const context = canvas.getContext("2d");
  const image = context.createImageData(width, height);

  for (let x = 0; x < width; x += 1) {
    const t = x / width;
    const band = Math.sin(t * TAU * 81) * .5 + Math.sin(t * TAU * 19 + .6) * .25;
    const gapA = t > .42 && t < .51;
    const gapB = t > .78 && t < .805;
    const brightness = clamp(.63 + band * .19 + Math.sin(t * 1900) * .035, .18, .92);
    for (let y = 0; y < height; y += 1) {
      const i = (y * width + x) * 4;
      image.data[i] = Math.round(188 * brightness);
      image.data[i + 1] = Math.round(158 * brightness);
      image.data[i + 2] = Math.round(111 * brightness);
      image.data[i + 3] = gapA || gapB ? 18 : Math.round(230 * brightness);
    }
  }
  context.putImageData(image, 0, 0);
  return canvasTexture(canvas, renderer, true);
}

function createGlowTexture(renderer) {
  const canvas = makeCanvas(128, 128);
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,250,234,1)");
  gradient.addColorStop(.08, "rgba(255,236,191,.92)");
  gradient.addColorStop(.23, "rgba(238,190,107,.42)");
  gradient.addColorStop(.54, "rgba(201,145,65,.12)");
  gradient.addColorStop(1, "rgba(201,145,65,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return canvasTexture(canvas, renderer, true);
}

function mapDistance(distanceAU) {
  const distance = Math.max(0, distanceAU);
  return Math.log1p(distance * LOG_FACTOR) / Math.log1p(MAX_AU * LOG_FACTOR) * MAX_VISUAL_RADIUS;
}

function eclipticFromEquatorial(vector) {
  const cos = Math.cos(OBLIQUITY);
  const sin = Math.sin(OBLIQUITY);
  return {
    x: vector.x,
    y: vector.y * cos + vector.z * sin,
    z: -vector.y * sin + vector.z * cos
  };
}

function eclipticVectorToWorld(vector) {
  const distance = Math.hypot(vector.x, vector.y, vector.z);
  if (!Number.isFinite(distance) || distance < 1e-12) return new THREE.Vector3();
  const scaledDistance = mapDistance(distance);
  const scale = scaledDistance / distance;
  return new THREE.Vector3(vector.x * scale, vector.z * scale, -vector.y * scale);
}

function equatorialVectorToWorld(vector) {
  return eclipticVectorToWorld(eclipticFromEquatorial(vector));
}

function vectorDifference(a, b) {
  return { x:a.x-b.x, y:a.y-b.y, z:a.z-b.z };
}

function moonVectorToWorld(vector) {
  const ecliptic = eclipticFromEquatorial(vector);
  return moonEclipticVectorToWorld(ecliptic);
}

function moonEclipticVectorToWorld(vector) {
  const exaggeration = 150;
  return new THREE.Vector3(
    vector.x * exaggeration,
    vector.z * exaggeration,
    -vector.y * exaggeration
  );
}

function createOrbitLine(definition, scene) {
  const orbit = definition.orbit;
  const points = [];
  const inclination = orbit.i * Math.PI / 180;
  const node = orbit.node * Math.PI / 180;
  const peri = orbit.peri * Math.PI / 180;
  const cosI = Math.cos(inclination);
  const sinI = Math.sin(inclination);
  const cosNode = Math.cos(node);
  const sinNode = Math.sin(node);

  for (let i = 0; i < 240; i += 1) {
    const angle = i / 240 * TAU;
    const radiusAU = orbit.a * (1 - orbit.e * orbit.e) / (1 + orbit.e * Math.cos(angle));
    const radius = mapDistance(radiusAU);
    const localX = radius * Math.cos(angle + peri);
    const localZ = radius * Math.sin(angle + peri);
    const localY = localZ * sinI;
    const inclinedZ = localZ * cosI;
    const x = localX * cosNode - localY * sinNode;
    const y = localX * sinNode + localY * cosNode;
    points.push(x, y, inclinedZ);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0xd4af70,
    transparent: true,
    opacity: .17,
    depthWrite: false,
    toneMapped: false
  });
  const line = new THREE.LineLoop(geometry, material);
  line.renderOrder = 1;
  scene.add(line);
  return line;
}

function createMoonOrbit(earthRoot, radius) {
  const points = [];
  for (let i = 0; i < 128; i += 1) {
    const angle = i / 128 * TAU;
    points.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0xb89a62,
    transparent: true,
    opacity: .24,
    depthWrite: false
  });
  const orbit = new THREE.LineLoop(geometry, material);
  earthRoot.add(orbit);
  return orbit;
}

function createStarfield(scene) {
  const count = 2600;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const theta = Math.random() * TAU;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = randomBetween(82, 155);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    const brightness = randomBetween(.24, .82);
    const tint = Math.random();
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness * (tint > .72 ? .88 : .81);
    colors[i * 3 + 2] = brightness * (tint > .9 ? .82 : .65);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: .17,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: .78,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const stars = new THREE.Points(geometry, material);
  stars.frustumCulled = false;
  scene.add(stars);
  return stars;
}

function createPlanet(definition, scene, sharedGeometry, renderer) {
  const root = new THREE.Group();
  const axialGroup = new THREE.Group();
  root.add(axialGroup);
  scene.add(root);

  const maps = createSurfaceMaps(definition.kind, definition.seed, renderer);
  const material = new THREE.MeshStandardMaterial({
    map: maps.map,
    bumpMap: maps.bumpMap,
    bumpScale: definition.bump,
    roughness: definition.roughness,
    metalness: definition.metalness
  });
  const mesh = new THREE.Mesh(sharedGeometry, material);
  mesh.scale.setScalar(definition.radius);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  axialGroup.add(mesh);
  axialGroup.rotation.z = definition.tilt * Math.PI / 180;

  const planet = { definition, root, axialGroup, mesh, rotationSpeed:definition.spin, textures:[maps.map,maps.bumpMap], extras:[] };

  if (definition.key === "Earth") {
    const cloudMap = createEarthCloudTexture(renderer);
    const cloudMaterial = new THREE.MeshStandardMaterial({
      map: cloudMap,
      transparent: true,
      opacity: .34,
      roughness: 1,
      metalness: 0,
      depthWrite: false
    });
    const clouds = new THREE.Mesh(sharedGeometry, cloudMaterial);
    clouds.scale.setScalar(definition.radius * 1.012);
    axialGroup.add(clouds);
    planet.clouds = clouds;
    planet.textures.push(cloudMap);
  }

  if (definition.key === "Saturn") {
    const inner = definition.radius * 1.22;
    const outer = definition.radius * 2.08;
    const ringGeometry = new THREE.RingGeometry(inner, outer, 256, 8);
    const positions = ringGeometry.getAttribute("position");
    const uv = new Float32Array(positions.count * 2);
    for (let i = 0; i < positions.count; i += 1) {
      const radius = Math.hypot(positions.getX(i), positions.getY(i));
      uv[i * 2] = clamp((radius - inner) / (outer - inner), 0, 1);
      uv[i * 2 + 1] = .5;
    }
    ringGeometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    const ringMap = createSaturnRingTexture(renderer);
    const ringMaterial = new THREE.MeshStandardMaterial({
      map: ringMap,
      color: 0xe4d0a9,
      roughness: .86,
      metalness: .035,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: .025,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = true;
    ring.receiveShadow = true;
    axialGroup.add(ring);
    planet.ring = ring;
    planet.extras.push(ring);
    planet.textures.push(ringMap);
  }

  return planet;
}

function createShootingStar(scene, glowTexture, now) {
  const start = new THREE.Vector3(
    randomBetween(-50, -14),
    randomBetween(21, 34),
    randomBetween(-54, -42)
  );
  const end = start.clone().add(new THREE.Vector3(
    randomBetween(28, 46),
    -randomBetween(20, 31),
    randomBetween(-1.5, 1.5)
  ));
  const direction = end.clone().sub(start).normalize();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6), 3));
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xf3e5ab,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
  const line = new THREE.Line(geometry, lineMaterial);
  const spriteMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xffefd0,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
  const head = new THREE.Sprite(spriteMaterial);
  head.scale.set(.9, .9, 1);
  scene.add(line, head);
  return {
    start,
    end,
    direction,
    line,
    head,
    bornAt: now,
    duration: randomBetween(3.8, 5.9) * 1000,
    length: randomBetween(5.5, 9.5)
  };
}

function updateShootingStar(meteor, now) {
  const progress = clamp((now - meteor.bornAt) / meteor.duration, 0, 1);
  const eased = progress * progress * (3 - 2 * progress);
  const headPosition = meteor.start.clone().lerp(meteor.end, eased);
  const tailPosition = headPosition.clone().addScaledVector(meteor.direction, -meteor.length);
  const values = meteor.line.geometry.attributes.position.array;
  values[0] = tailPosition.x;
  values[1] = tailPosition.y;
  values[2] = tailPosition.z;
  values[3] = headPosition.x;
  values[4] = headPosition.y;
  values[5] = headPosition.z;
  meteor.line.geometry.attributes.position.needsUpdate = true;
  meteor.head.position.copy(headPosition);
  const fadeIn = clamp(progress / .12, 0, 1);
  const fadeOut = clamp((1 - progress) / .34, 0, 1);
  const opacity = fadeIn * fadeOut;
  meteor.line.material.opacity = opacity * .78;
  meteor.head.material.opacity = opacity * .94;
  return progress < 1;
}

function removeShootingStar(scene, meteor) {
  scene.remove(meteor.line, meteor.head);
  meteor.line.geometry.dispose();
  meteor.line.material.dispose();
  meteor.head.material.dispose();
}

function createSolarSystem() {
  const stage = document.querySelector("#solar-system-stage");
  const mount = document.querySelector("#solar-system-renderer");
  if (!stage || !mount || !hasEphemeris) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: window.matchMedia("(min-width: 900px)").matches,
      powerPreference: "high-performance",
      logarithmicDepthBuffer: false
    });
  } catch (error) {
    console.error("WebGL initialization failed:", error);
    const fallback = document.querySelector("#solar-system-fallback");
    if (fallback) fallback.hidden = false;
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(Math.max(1, stage.clientWidth), Math.max(1, stage.clientHeight), false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-label", "Interactive three-dimensional solar system");
  renderer.domElement.setAttribute("role", "img");
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.FogExp2(0x050505, .0016);

  const camera = new THREE.PerspectiveCamera(
    42,
    Math.max(1, stage.clientWidth) / Math.max(1, stage.clientHeight),
    .1,
    260
  );
  camera.position.set(0, 30, 58);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .055;
  controls.enablePan = false;
  controls.minDistance = 31;
  controls.maxDistance = 102;
  controls.minPolarAngle = .2;
  controls.maxPolarAngle = Math.PI * .86;
  controls.target.set(0, 0, 0);
  controls.update();

  const ambient = new THREE.HemisphereLight(0x8a7b60, 0x080706, .11);
  scene.add(ambient);

  const sunGeometry = new THREE.SphereGeometry(1, 96, 64);
  const globeGeometry = new THREE.SphereGeometry(1, 72, 48);
  const sunMaps = createSurfaceMaps("sun", 19, renderer);
  const sunMaterial = new THREE.MeshStandardMaterial({
    map: sunMaps.map,
    emissiveMap: sunMaps.map,
    emissive: new THREE.Color(0xffa33e),
    emissiveIntensity: 2.8,
    roughness: .72,
    metalness: 0,
    toneMapped: false
  });
  const sun = new THREE.Mesh(sunGeometry, sunMaterial);
  sun.scale.setScalar(1.48);
  sun.castShadow = true;
  sun.receiveShadow = false;
  scene.add(sun);

  const sunLight = new THREE.PointLight(0xffd39a, 1550, 0, 2);
  sunLight.position.set(0, 0, 0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(512, 512);
  sunLight.shadow.camera.near = .5;
  sunLight.shadow.camera.far = 86;
  sunLight.shadow.bias = -.00012;
  sunLight.shadow.normalBias = .035;
  sunLight.shadow.radius = 5;
  scene.add(sunLight);

  const glowTexture = createGlowTexture(renderer);
  const coronaMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xffd18d,
    transparent: true,
    opacity: .8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
  const corona = new THREE.Sprite(coronaMaterial);
  corona.scale.set(11.5, 11.5, 1);
  scene.add(corona);
  const innerCorona = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xffe8bd,
    transparent: true,
    opacity: .38,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  }));
  innerCorona.scale.set(5.4, 5.4, 1);
  scene.add(innerCorona);

  createStarfield(scene);

  const planetObjects = new Map();
  const orbitLines = [];
  for (const definition of PLANETS) {
    orbitLines.push(createOrbitLine(definition, scene));
    const planet = createPlanet(definition, scene, globeGeometry, renderer);
    planetObjects.set(definition.key, planet);
  }

  const earth = planetObjects.get("Earth");
  const moonMaps = createSurfaceMaps("moon", 211, renderer);
  const moonMaterial = new THREE.MeshStandardMaterial({
    map: moonMaps.map,
    bumpMap: moonMaps.bumpMap,
    bumpScale: .065,
    roughness: .99,
    metalness: 0
  });
  const moon = new THREE.Mesh(globeGeometry, moonMaterial);
  moon.scale.setScalar(.064);
  moon.castShadow = true;
  moon.receiveShadow = true;
  earth.root.add(moon);
  const moonOrbit = createMoonOrbit(earth.root, .39);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(Math.max(1, stage.clientWidth), Math.max(1, stage.clientHeight)),
    .92,
    .55,
    .76
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const modeButtons = [...stage.querySelectorAll("[data-solar-mode]")];
  const resetButton = stage.querySelector("[data-solar-reset]");
  const timeLabel = stage.querySelector("#solar-time-label");
  const sourceLabel = stage.querySelector("#solar-time-source");
  const fallback = stage.querySelector("#solar-system-fallback");
  const eventController = new AbortController();
  const eventOptions = { signal:eventController.signal };

  let mode = "realtime";
  let simulationTimestamp = Date.now();
  let lastFrame = performance.now();
  let lastPositionUpdate = 0;
  let lastJplSync = 0;
  let jplPositions = null;
  let jplEpoch = 0;
  let jplRequest = null;
  let shootingStar = null;
  let nextShootingStar = performance.now() + randomBetween(9000, 16000);
  let visible = true;
  let disposed = false;
  let frameId = 0;
  let resizeObserver = null;

  function setSource(value) {
    if (sourceLabel) sourceLabel.textContent = value;
  }

  function formatTime(date) {
    const formatter = new Intl.DateTimeFormat("id-ID", {
      timeZone: "UTC",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });
    return formatter.format(date).replace(/\./g, ":").toUpperCase() + " UTC";
  }

  function updateTimeLabel(date) {
    if (!timeLabel) return;
    timeLabel.dateTime = date.toISOString();
    timeLabel.textContent = formatTime(date);
  }

  function applyEnginePositions(date) {
    const vectors = new Map();
    for (const definition of PLANETS) {
      const vector = Astronomy.HelioVector(BODY[definition.key], date);
      vectors.set(definition.key, vector);
      const planet = planetObjects.get(definition.key);
      if (planet) planet.root.position.copy(equatorialVectorToWorld(vector));
    }
    const earthVector = vectors.get("Earth");
    const moonVector = Astronomy.HelioVector(BODY.Moon, date);
    const moonOffset = vectorDifference(moonVector, earthVector);
    moon.position.copy(moonVectorToWorld(moonOffset));
  }

  function applyJplPositions(positions) {
    for (const definition of PLANETS) {
      const vector = positions[definition.key];
      const planet = planetObjects.get(definition.key);
      if (vector && planet) planet.root.position.copy(eclipticVectorToWorld(vector));
    }
    const moonVector = positions.Moon;
    const earthVector = positions.Earth;
    if (moonVector && earthVector) {
      moon.position.copy(moonEclipticVectorToWorld(vectorDifference(moonVector, earthVector)));
    }
  }

  async function syncJplEphemeris(force = false) {
    if (mode !== "realtime" || jplRequest || disposed) return;
    const now = Date.now();
    if (!force && now - lastJplSync < 55000) return;
    lastJplSync = now;
    const queryTime = new Date(Math.floor(now / 60000) * 60000).toISOString();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 9500);
    jplRequest = fetch("/api/ephemeris?time=" + encodeURIComponent(queryTime), {
      method: "GET",
      headers: { Accept:"application/json" },
      cache: "no-store",
      signal: controller.signal
    })
      .then(async response => {
        if (!response.ok) throw new Error("JPL endpoint returned HTTP " + response.status);
        const payload = await response.json();
        if (!payload || payload.source !== "NASA/JPL Horizons" || !payload.positions) {
          throw new Error("JPL ephemeris payload was incomplete.");
        }
        jplPositions = payload.positions;
        jplEpoch = Date.parse(payload.epoch) || now;
        if (mode === "realtime") {
          applyJplPositions(jplPositions);
          updateTimeLabel(new Date());
          setSource("NASA / JPL HORIZONS · SYNCED");
        }
      })
      .catch(() => {
        if (!jplPositions) setSource("ASTRONOMY ENGINE · LOCAL EPHEMERIS");
      })
      .finally(() => {
        window.clearTimeout(timeout);
        jplRequest = null;
      });
    await jplRequest;
  }

  function setMode(nextMode) {
    if (nextMode !== "realtime" && nextMode !== "timelapse") return;
    if (mode === nextMode) return;
    mode = nextMode;
    simulationTimestamp = Date.now();
    lastFrame = performance.now();
    lastPositionUpdate = 0;

    modeButtons.forEach(button => {
      const active = button.dataset.solarMode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (mode === "timelapse") {
      setSource("ASTRONOMY ENGINE · 1 DAY / SEC");
    } else {
      setSource("SYNCHRONIZING NASA / JPL");
      syncJplEphemeris(true);
    }
  }

  modeButtons.forEach(button => {
    button.addEventListener("click", () => setMode(button.dataset.solarMode), eventOptions);
  });

  resetButton?.addEventListener("click", () => {
    controls.target.set(0, 0, 0);
    camera.position.set(0, 30, 58);
    controls.update();
  }, eventOptions);

  function resize() {
    if (disposed) return;
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    composer.setSize(width, height);
    bloom.setSize(width, height);
  }

  if (typeof ResizeObserver === "function") {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
  } else {
    window.addEventListener("resize", resize, eventOptions);
  }

  function updateFrame(now) {
    if (disposed || !visible || document.hidden) {
      frameId = 0;
      return;
    }

    const deltaMs = Math.min(50, Math.max(0, now - lastFrame));
    const deltaSeconds = deltaMs / 1000;
    lastFrame = now;

    if (mode === "realtime") {
      simulationTimestamp = Date.now();
    } else {
      simulationTimestamp += deltaMs * 86400;
    }

    const positionInterval = mode === "realtime" ? 1000 : 140;
    if (now - lastPositionUpdate >= positionInterval) {
      const simulationDate = new Date(simulationTimestamp);
      if (mode === "realtime" && jplPositions && Math.abs(simulationTimestamp - jplEpoch) < 90000) {
        applyJplPositions(jplPositions);
      } else {
        applyEnginePositions(simulationDate);
        if (mode === "realtime" && !jplPositions) setSource("ASTRONOMY ENGINE · LOCAL EPHEMERIS");
      }
      updateTimeLabel(simulationDate);
      lastPositionUpdate = now;
    }

    if (mode === "realtime" && now - lastJplSync > 55000) {
      syncJplEphemeris(false);
    }

    for (const planet of planetObjects.values()) {
      planet.mesh.rotation.y += deltaSeconds * planet.rotationSpeed;
      if (planet.clouds) planet.clouds.rotation.y += deltaSeconds * .018;
    }
    sun.rotation.y += deltaSeconds * .018;
    corona.material.rotation += deltaSeconds * .014;
    innerCorona.material.rotation -= deltaSeconds * .02;

    if (!REDUCED_MOTION) {
      if (!shootingStar && now >= nextShootingStar) {
        shootingStar = createShootingStar(scene, glowTexture, now);
      }
      if (shootingStar && !updateShootingStar(shootingStar, now)) {
        removeShootingStar(scene, shootingStar);
        shootingStar = null;
        nextShootingStar = now + randomBetween(14000, 28000);
      }
    }

    controls.update();
    composer.render();
    frameId = requestAnimationFrame(updateFrame);
  }

  function setVisible(nextVisible) {
    if (disposed) return;
    visible = Boolean(nextVisible);
    if (!visible || document.hidden) {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      return;
    }
    lastFrame = performance.now();
    resize();
    if (!frameId) frameId = requestAnimationFrame(updateFrame);
  }

  function handleVisibility() {
    if (document.hidden) {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
    } else if (visible) {
      lastFrame = performance.now();
      if (!frameId) frameId = requestAnimationFrame(updateFrame);
    }
  }
  document.addEventListener("visibilitychange", handleVisibility, eventOptions);

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    resizeObserver?.disconnect();
    eventController.abort();
    controls.dispose();
    composer.dispose();

    if (shootingStar) removeShootingStar(scene, shootingStar);

    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) {
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
        objectMaterials.forEach(material => {
          materials.add(material);
          Object.values(material).forEach(value => {
            if (value && value.isTexture) textures.add(value);
          });
        });
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    textures.add(glowTexture);
    textures.add(sunMaps.map);
    textures.add(sunMaps.bumpMap);
    moonMaps.map.dispose();
    moonMaps.bumpMap.dispose();
    textures.forEach(texture => texture.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    mount.replaceChildren();
  }

  window.addEventListener("pagehide", dispose, { once:true });
  if (fallback) fallback.hidden = true;

  applyEnginePositions(new Date());
  updateTimeLabel(new Date());
  setSource("SYNCHRONIZING NASA / JPL");
  syncJplEphemeris(true);
  resize();
  setVisible(true);

  return { setVisible, dispose };
}

export { createSolarSystem };
