// src/App.js
import React, { useRef, useState, useEffect, Suspense, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture, Loader } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

/* -------------------------
   1. Assets (works for CRA/GH Pages)
   ------------------------- */
const getPath = (file) => {
  const base = process.env.PUBLIC_URL || "";
  return `${base}/textures/${file}`;
};

const TEXTURES = {
  sun: getPath("sun.jpg"),
  mercury: getPath("2k_mercury.jpg"),
  venus: getPath("2k_venus_surface.jpg"),
  // primary earth texture (surface + atmosphere)
  earth: getPath("earth_atmos_2048.jpg"),
  // cloud texture (ensure this exists in public/textures)
  earthClouds: getPath("2k_earth_clouds.jpg"),
  mars: getPath("2k_mars.jpg"),
  jupiter: getPath("2k_jupiter.jpg"),
  saturn: getPath("2k_saturn.jpg"),
  saturnRing: getPath("2k_saturn_ring_alpha.png"),
  uranus: getPath("2k_uranus.jpg"),
  neptune: getPath("2k_neptune.jpg"),
  moon: getPath("2k_moon.jpg"),
};

/* -------------------------
   2. Planet data for HUD
   ------------------------- */
const PLANET_DATA = {
  Sun: {
    name: "Sun",
    diameter: "1,392,700 km",
    day: "25 Days",
    temp: "5,500°C",
    info: "The star at the center of our Solar System. Its gravity holds the system together.",
  },
  Mercury: {
    name: "Mercury",
    diameter: "4,880 km",
    day: "59 days",
    temp: "167°C",
    info: "Smallest planet, closest to the Sun. It has a thin exosphere and extreme temperature swings.",
  },
  Venus: {
    name: "Venus",
    diameter: "12,104 km",
    day: "243 days",
    temp: "464°C",
    info: "Hottest planet due to a thick toxic atmosphere creating a runaway greenhouse effect.",
  },
  Earth: {
    name: "Earth",
    diameter: "12,742 km",
    day: "24 hours",
    temp: "15°C",
    info: "The only known planet to support life, with liquid water covering 70% of its surface.",
  },
  Moon: {
    name: "The Moon",
    diameter: "3,474 km",
    day: "27.3 days",
    temp: "-53°C",
    info: "Earth's only natural satellite. It stabilizes Earth's wobble and creates tides.",
  },
  Mars: {
    name: "Mars",
    diameter: "6,779 km",
    day: "24.6 hours",
    temp: "-65°C",
    info: "The 'Red Planet', home to Olympus Mons (largest volcano) and Valles Marineris (largest canyon).",
  },
  Jupiter: {
    name: "Jupiter",
    diameter: "139,820 km",
    day: "9.9 hours",
    temp: "-110°C",
    info: "Largest planet, a gas giant. It has a Great Red Spot storm and over 90 moons.",
  },
  Saturn: {
    name: "Saturn",
    diameter: "116,460 km",
    day: "10.7 hours",
    temp: "-140°C",
    info: "Famous for its complex ring system made of ice and rock particles.",
  },
  Uranus: {
    name: "Uranus",
    diameter: "50,724 km",
    day: "17 hours",
    temp: "-195°C",
    info: "An ice giant that rotates on its side (98° tilt), likely due to a massive collision.",
  },
  Neptune: {
    name: "Neptune",
    diameter: "49,244 km",
    day: "16 hours",
    temp: "-200°C",
    info: "The windiest planet with supersonic winds. It was the first planet predicted by math.",
  },
};

/* -------------------------
   3. Floating HUD / Bottom card
   ------------------------- */
function PlanetHUD({ focusedPlanet, onClose }) {
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
  if (!focusedPlanet) return null;
  const data = PLANET_DATA[focusedPlanet.name];

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          initial={{ y: isMobile ? 150 : 0, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: isMobile ? 150 : 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 90, damping: 20 }}
          style={{
            position: "absolute",
            bottom: isMobile ? 0 : "10%",
            left: isMobile ? 0 : "auto",
            right: isMobile ? 0 : 20,
            width: isMobile ? "100%" : 320,
            background: "linear-gradient(180deg, rgba(12,14,24,0.95), rgba(6,8,12,0.9))",
            padding: 20,
            color: "#fff",
            borderRadius: isMobile ? "18px 18px 0 0" : 12,
            zIndex: 30,
            boxShadow: "0 -10px 40px rgba(0,0,0,0.6)",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#4db5ff", textTransform: "uppercase" }}>{data.name}</div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "#aaa" }}>DIAMETER</div>
              <div style={{ fontSize: 14 }}>{data.diameter}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#aaa" }}>TEMP</div>
              <div style={{ fontSize: 14, color: "#ffaa55" }}>{data.temp}</div>
            </div>
          </div>

          <div style={{ fontSize: 13, color: "#ddd", lineHeight: 1.4 }}>{data.info}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* -------------------------
   4. Visual components
   ------------------------- */

function AsteroidBelt() {
  const asteroidRef = useRef();
  const count = 1200; // lowered for perf
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const asteroids = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 80 + Math.random() * 20;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (Math.random() - 0.5) * 6;
      const scale = Math.random() * 0.6 + 0.1;
      temp.push({ x, y, z, scale, rot: Math.random() * Math.PI });
    }
    return temp;
  }, [count]);

  useEffect(() => {
    if (!asteroidRef.current) return;
    asteroids.forEach((a, i) => {
      dummy.position.set(a.x, a.y, a.z);
      dummy.rotation.set(a.rot, a.rot, a.rot);
      dummy.scale.set(a.scale, a.scale, a.scale);
      dummy.updateMatrix();
      asteroidRef.current.setMatrixAt(i, dummy.matrix);
    });
    asteroidRef.current.instanceMatrix.needsUpdate = true;
  }, [asteroids, dummy]);

  useFrame(() => {
    if (asteroidRef.current) asteroidRef.current.rotation.y += 0.0004;
  });

  return (
    <instancedMesh ref={asteroidRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[0.28, 0]} />
      <meshStandardMaterial color="#888" roughness={0.9} metalness={0.05} />
    </instancedMesh>
  );
}

function SunGlow({ color = "#FF8C00", size = 8 }) {
  const ref = useRef();
  const { camera } = useThree();
  const uniforms = useMemo(() => ({
    c: { value: 0.1 },
    p: { value: 4 },
    glowColor: { value: new THREE.Color(color) },
    viewVector: { value: new THREE.Vector3() },
  }), [color]);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.material.uniforms.viewVector.value.copy(camera.position).normalize();
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size * 1.18, 32, 32]} />
      <shaderMaterial
        args={[{
          uniforms,
          vertexShader: `
            uniform vec3 viewVector;
            uniform float c;
            uniform float p;
            varying float intensity;
            void main() {
              vec3 vNormal = normalize( normalMatrix * normal );
              vec3 vViewPosition = normalize( modelViewMatrix * vec4( position, 1.0 ) ).xyz;
              intensity = pow( c - dot(vNormal, vViewPosition), p );
              gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }
          `,
          fragmentShader: `
            uniform vec3 glowColor;
            varying float intensity;
            void main() {
              gl_FragColor = vec4( glowColor * intensity, 1.0 );
            }
          `,
          side: THREE.FrontSide,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
        }]}
      />
    </mesh>
  );
}

function Sun({ onPlanetClick }) {
  const ref = useRef();
  const tex = useTexture(TEXTURES.sun);
  const size = 8;

  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.002;
  });

  const handleClick = (e) => {
    e.stopPropagation();
    onPlanetClick({ name: "Sun", ref, size });
  };

  return (
    <group>
      <mesh ref={ref} onClick={handleClick} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "auto")}>
        <sphereGeometry args={[size, 64, 64]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <SunGlow color="#FFDDAA" size={size} />
      <pointLight intensity={5} distance={2000} decay={0.5} color="#fff3d6" />
    </group>
  );
}

function AnimatedStars() {
  const ref = useRef();
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.00004;
  });
  return <Stars ref={ref} radius={3000} depth={60} count={12000} factor={4} saturation={0} fade={false} speed={1} />;
}

function OrbitPath({ radius = 10 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.08, radius + 0.08, 256]} />
      <meshBasicMaterial color="#fff" transparent opacity={0.08} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Hitbox({ size = 1, onClick }) {
  return (
    <mesh onClick={onClick} visible={false}>
      <sphereGeometry args={[size * 4.5, 8, 8]} />
      <meshBasicMaterial />
    </mesh>
  );
}

/* -------------------------
   5. Moon & Clouds
   ------------------------- */

function Moon({ size = 0.5, distance = 3.5, orbitSpeed = 1.6, onPlanetClick }) {
  const ref = useRef();
  const tex = useTexture(TEXTURES.moon);
  const angle = useRef(Math.random() * Math.PI * 2);

  useFrame((state, delta) => {
    angle.current += delta * orbitSpeed * 0.1;
    if (ref.current) {
      const x = Math.sin(angle.current) * distance;
      const z = Math.cos(angle.current) * distance;
      ref.current.position.set(x, 0, z);
      ref.current.rotation.y += 0.005;
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    onPlanetClick({ name: "Moon", ref, size });
  };

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[distance - 0.02, distance + 0.02, 64]} />
        <meshBasicMaterial color="#666" transparent opacity={0.28} side={THREE.DoubleSide} />
      </mesh>

      <group ref={ref}>
        <mesh onClick={handleClick} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "auto")}>
          <sphereGeometry args={[size, 32, 32]} />
          <meshStandardMaterial map={tex} metalness={0.05} roughness={0.9} />
        </mesh>
        <Hitbox size={size} onClick={handleClick} />
      </group>
    </group>
  );
}

function PlanetClouds({ textureUrl, size = 1 }) {
  const tex = useTexture(textureUrl);
  const ref = useRef();
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.0012;
  });
  return (
    <mesh ref={ref} scale={[1.01, 1.01, 1.01]}>
      <sphereGeometry args={[size, 64, 64]} />
      <meshStandardMaterial map={tex} transparent opacity={0.7} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

function SafeClouds({ textureUrl, size = 1 }) {
  return (
    <Suspense fallback={null}>
      <PlanetClouds textureUrl={textureUrl} size={size} />
    </Suspense>
  );
}

/* -------------------------
   6. Rings
   ------------------------- */

function PlanetRing({ textureKey, size = 1, isVertical = false }) {
  const tex = useTexture(TEXTURES[textureKey]);
  const geometryRef = useRef();

  useEffect(() => {
    if (!geometryRef.current || !tex) return;
    const geo = geometryRef.current;
    const pos = geo.attributes.position;
    const uvs = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const len = Math.sqrt(x * x + y * y);
      const u = (len - (size * 1.4)) / ((size * 2.4) - (size * 1.4));
      uvs.setXY(i, u, 0.5);
    }
    uvs.needsUpdate = true;
  }, [size, tex]);

  const rotation = isVertical ? [0, 0, 0] : [-Math.PI / 2, 0, 0];
  return (
    <mesh rotation={rotation}>
      <ringGeometry ref={geometryRef} args={[size * 1.4, size * 2.4, 128]} />
      <meshStandardMaterial map={tex} transparent opacity={0.88} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* -------------------------
   7. Planet generic
   ------------------------- */

function Planet({
  name,
  textureKey,
  distance = 10,
  startAngle = Math.random() * Math.PI * 2,
  orbitSpeed = 0.6,
  size = 1,
  onPlanetClick,
  hasAtmosphere = false,
  hasClouds = false,
  hasRings = false,
  ringTextureKey,
  isVerticalRing = false,
  tilt = 0,
  children,
}) {
  const orbitRef = useRef();
  const spinRef = useRef();
  const tex = useTexture(TEXTURES[textureKey] || TEXTURES.moon);
  const angle = useRef(startAngle);

  useFrame((state, delta) => {
    if (orbitRef.current) {
      angle.current += delta * orbitSpeed * 0.05;
      const x = Math.sin(angle.current) * distance;
      const z = Math.cos(angle.current) * distance;
      orbitRef.current.position.set(x, 0, z);
    }
    if (spinRef.current) spinRef.current.rotation.y += 0.005;
  });

  const handleClick = (e) => {
    e.stopPropagation();
    onPlanetClick({ name, ref: orbitRef, size });
  };

  return (
    <group>
      <OrbitPath radius={distance} />
      <group ref={orbitRef}>
        <group rotation={[tilt, 0, isVerticalRing ? Math.PI / 2 : 0]}>
          <group ref={spinRef}>
            <mesh onClick={handleClick} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "auto")}>
              <sphereGeometry args={[size, 64, 64]} />
              <meshStandardMaterial map={tex} metalness={0.15} roughness={0.9} />
            </mesh>

            {hasClouds && <SafeClouds textureUrl={TEXTURES.earthClouds} size={size} />}

            {hasAtmosphere && (
              <mesh scale={[1.02, 1.02, 1.02]}>
                <sphereGeometry args={[size, 64, 64]} />
                <meshPhongMaterial color="#4da6ff" transparent opacity={0.18} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
              </mesh>
            )}
          </group>

          {hasRings && <PlanetRing textureKey={ringTextureKey} size={size} isVertical={isVerticalRing} />}
        </group>

        {children}
        <Hitbox size={size} onClick={handleClick} />
      </group>
    </group>
  );
}

/* -------------------------
   8. Camera controller (smooth)
   ------------------------- */

function CameraController({ focusedPlanet, setFocusedPlanet }) {
  const { camera, controls } = useThree();
  const isTransitioning = useRef(false);
  const isResetting = useRef(false);
  const previousTarget = useRef(new THREE.Vector3());

  useEffect(() => {
    if (focusedPlanet) {
      isTransitioning.current = true;
      isResetting.current = false;
    }
  }, [focusedPlanet]);

  useEffect(() => {
    const onReset = () => {
      isResetting.current = true;
      setFocusedPlanet(null);
    };
    window.addEventListener("reset-camera", onReset);
    return () => window.removeEventListener("reset-camera", onReset);
  }, [setFocusedPlanet]);

  useFrame(() => {
    if (!controls || !camera) return;

    if (isResetting.current && !focusedPlanet) {
      const current = camera.position.clone();
      const safeDist = 250;
      const targetDist = Math.max(current.length(), safeDist);
      const home = current.normalize().multiplyScalar(targetDist);
      if (home.y < 50) home.y = 50;

      controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
      camera.position.lerp(home, 0.05);

      if (controls.target.distanceTo(new THREE.Vector3(0, 0, 0)) < 1) isResetting.current = false;
      controls.update();
      return;
    }

    if (focusedPlanet && focusedPlanet.ref && focusedPlanet.ref.current) {
      const targetPos = new THREE.Vector3();
      focusedPlanet.ref.current.getWorldPosition(targetPos);

      const sun = new THREE.Vector3(0, 0, 0);
      const dirToSun = new THREE.Vector3().subVectors(sun, targetPos).normalize();
      const dist = focusedPlanet.name === "Sun" ? focusedPlanet.size * 4 : focusedPlanet.size * 5 + 15;
      const desired = targetPos.clone().add(dirToSun.multiplyScalar(dist));
      desired.y += focusedPlanet.size * 2;

      if (isTransitioning.current) {
        controls.target.lerp(targetPos, 0.06);
        camera.position.lerp(desired, 0.06);

        if (camera.position.distanceTo(desired) < 0.5) {
          isTransitioning.current = false;
          previousTarget.current.copy(targetPos);
        }
      } else {
        const delta = new THREE.Vector3().subVectors(targetPos, previousTarget.current);
        camera.position.add(delta);
        controls.target.copy(targetPos);
        previousTarget.current.copy(targetPos);
      }

      // auto-exit if camera drifts too far
      if (!isTransitioning.current && camera.position.distanceTo(targetPos) > dist + 60) {
        setFocusedPlanet(null);
      }
    } else {
      // safe drift to origin
      controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
      if (camera.position.length() < 80) {
        camera.position.lerp(camera.position.clone().normalize().multiplyScalar(120), 0.05);
      }
    }

    controls.update();
  });

  return null;
}

/* -------------------------
   9. Main App (complete)
   ------------------------- */

export default function App() {
  const [focusedPlanet, setFocusedPlanet] = useState(null);

  const handlePlanetClick = (data) => {
    if (focusedPlanet && focusedPlanet.name === data.name) return;
    setFocusedPlanet(data);
  };

  const handleReturn = () => {
    window.dispatchEvent(new Event("reset-camera"));
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050508", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", top: 18, width: "100%", textAlign: "center", zIndex: 50, pointerEvents: "none" }}>
        <h1 style={{ margin: 0, color: "#fff", fontFamily: "'Inter',sans-serif", fontWeight: 200, letterSpacing: 10, fontSize: 20, textShadow: "0 0 20px rgba(77,181,255,0.2)" }}>
          SOLAR SYSTEM
        </h1>
      </div>

      {focusedPlanet && (
        <button
          onClick={handleReturn}
          style={{
            position: "absolute",
            bottom: 90,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            padding: "12px 28px",
            background: "rgba(16, 18, 24, 0.9)",
            color: "#4db5ff",
            border: "1px solid rgba(77,181,255,0.35)",
            borderRadius: 30,
            fontWeight: 700,
            cursor: "pointer",
            backdropFilter: "blur(10px)",
          }}
        >
          RETURN TO ORBIT
        </button>
      )}

      <PlanetHUD focusedPlanet={focusedPlanet} onClose={handleReturn} />

      <Canvas camera={{ position: [0, 150, 250], fov: 45, far: 20000 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.25} />
          <directionalLight position={[50, 100, 50]} intensity={0.6} />
          <pointLight position={[0, 0, 0]} intensity={0.6} />

          {/* Make OrbitControls default so CameraController can access useThree().controls */}
          <OrbitControls makeDefault enableDamping minDistance={20} maxDistance={3000} />

          <CameraController focusedPlanet={focusedPlanet} setFocusedPlanet={setFocusedPlanet} />

          {/* Stars and Sun */}
          <AnimatedStars />
          <Sun onPlanetClick={handlePlanetClick} />

          {/* Planets (visual scale, not physical) */}
          <Planet name="Mercury" textureKey="mercury" distance={18} orbitSpeed={1.3} size={0.8} onPlanetClick={handlePlanetClick} />
          <Planet name="Venus" textureKey="venus" distance={28} orbitSpeed={0.95} size={1.6} onPlanetClick={handlePlanetClick} />
          <Planet name="Earth" textureKey="earth" distance={38} orbitSpeed={0.8} size={1.7} onPlanetClick={handlePlanetClick} hasClouds hasAtmosphere />
          <Moon size={0.45} distance={3.6} orbitSpeed={1.9} onPlanetClick={handlePlanetClick} />
          <Planet name="Mars" textureKey="mars" distance={52} orbitSpeed={0.7} size={1.2} onPlanetClick={handlePlanetClick} />
          <AsteroidBelt />
          <Planet name="Jupiter" textureKey="jupiter" distance={95} orbitSpeed={0.45} size={4.0} onPlanetClick={handlePlanetClick} />
          <Planet name="Saturn" textureKey="saturn" distance={130} orbitSpeed={0.4} size={3.6} onPlanetClick={handlePlanetClick} hasRings ringTextureKey="saturnRing" />
          <Planet name="Uranus" textureKey="uranus" distance={170} orbitSpeed={0.33} size={2.6} onPlanetClick={handlePlanetClick} tilt={Math.PI / 24} />
          <Planet name="Neptune" textureKey="neptune" distance={200} orbitSpeed={0.28} size={2.5} onPlanetClick={handlePlanetClick} />
        </Suspense>
      </Canvas>

      {/* Drei Loader */}
      <Loader />

    </div>
  );
}