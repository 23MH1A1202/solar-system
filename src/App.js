import React, { useRef, useState, useEffect, Suspense, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture, Loader } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

// --- 1. ASSETS ---
const getPath = (file) => {
  return process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/textures/${file}` : `/textures/${file}`;
};

const TEXTURES = {
  sun: getPath("sun.jpg"),
  mercury: getPath("2k_mercury.jpg"),
  venus: getPath("2k_venus_surface.jpg"),
  earth: getPath("earth_atmos_2048.jpg"),
  earthClouds: getPath("2k_earth_clouds.jpg"), 
  mars: getPath("2k_mars.jpg"),
  jupiter: getPath("2k_jupiter.jpg"),
  saturn: getPath("2k_saturn.jpg"),
  saturnRing: getPath("2k_saturn_ring_alpha.png"),
  uranus: getPath("2k_uranus.jpg"),
  neptune: getPath("2k_neptune.jpg"),
  moon: getPath("2k_moon.jpg")
};

// --- 2. DATA ---
const PLANET_DATA = {
  Sun: { name: "Sun", diameter: "1,392,700 km", day: "25 Days", temp: "5,500°C", info: "The star at the center of our Solar System." },
  Mercury: { name: "Mercury", diameter: "4,880 km", day: "59 days", temp: "167°C", info: "Smallest planet, closest to the Sun." },
  Venus: { name: "Venus", diameter: "12,104 km", day: "243 days", temp: "464°C", info: "Hottest planet due to a thick toxic atmosphere." },
  Earth: { name: "Earth", diameter: "12,742 km", day: "24 hours", temp: "15°C", info: "The only known planet to support life." },
  Moon: { name: "The Moon", diameter: "3,474 km", day: "27.3 days", temp: "-53°C", info: "Earth's only natural satellite." },
  Mars: { name: "Mars", diameter: "6,779 km", day: "24.6 hours", temp: "-65°C", info: "The 'Red Planet', home to the largest volcano in the solar system." },
  Jupiter: { name: "Jupiter", diameter: "139,820 km", day: "9.9 hours", temp: "-110°C", info: "The largest planet, a gas giant with a Great Red Spot." },
  Saturn: { name: "Saturn", diameter: "116,460 km", day: "10.7 hours", temp: "-140°C", info: "Famous for its complex ring system." },
  Uranus: { name: "Uranus", diameter: "50,724 km", day: "17 hours", temp: "-195°C", info: "An ice giant that rotates on its side." },
  Neptune: { name: "Neptune", diameter: "49,244 km", day: "16 hours", temp: "-200°C", info: "The windiest planet, furthest from the Sun." }
};

// --- 3. UI COMPONENT (HUD) ---
function PlanetHUD({ focusedPlanet, onClose }) {
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  if (!focusedPlanet) return null;
  const data = PLANET_DATA[focusedPlanet.name];

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "absolute",
            top: isMobile ? "auto" : "20%",
            bottom: isMobile ? "0" : "auto",
            right: isMobile ? "0" : "20px",
            width: isMobile ? "100%" : "300px",
            background: "rgba(10, 10, 14, 0.85)",
            backdropFilter: "blur(12px)",
            borderLeft: "2px solid #4db5ff",
            padding: "20px",
            color: "white",
            borderRadius: "8px",
            zIndex: 100
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h2 style={{ margin: "0 0 10px 0", color: "#4db5ff" }}>{data.name}</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "white", fontSize: "1.5rem", cursor: "pointer" }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.85rem", marginBottom: "15px" }}>
            <div><strong>Diameter:</strong><br/>{data.diameter}</div>
            <div><strong>Temp:</strong><br/>{data.temp}</div>
            <div><strong>Day Length:</strong><br/>{data.day}</div>
          </div>
          <p style={{ fontSize: "0.9rem", lineHeight: "1.4", color: "#ddd" }}>{data.info}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- 4. 3D COMPONENTS ---

function AsteroidBelt() {
  const asteroidRef = useRef();
  const count = 3000; 
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const asteroids = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 110 + Math.random() * 25; // Located between Mars (60) and Jupiter (100) - scale adjusted
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (Math.random() - 0.5) * 10; 
      const scale = Math.random() * 0.4 + 0.1;
      temp.push({ x, y, z, scale, rotation: Math.random() * Math.PI });
    }
    return temp;
  }, []);

  useEffect(() => {
    if (asteroidRef.current) {
      asteroids.forEach((data, i) => {
        dummy.position.set(data.x, data.y, data.z);
        dummy.rotation.set(data.rotation, data.rotation, data.rotation);
        dummy.scale.set(data.scale, data.scale, data.scale);
        dummy.updateMatrix();
        asteroidRef.current.setMatrixAt(i, dummy.matrix);
      });
      asteroidRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [asteroids, dummy]);

  useFrame(() => {
    if (asteroidRef.current) asteroidRef.current.rotation.y += 0.0005;
  });

  return (
    <instancedMesh ref={asteroidRef} args={[null, null, count]}>
      <dodecahedronGeometry args={[0.2, 0]} /> 
      <meshStandardMaterial color="#888888" roughness={0.8} />
    </instancedMesh>
  );
}

function Sun({ onPlanetClick }) {
  const texture = useTexture(TEXTURES.sun);
  const meshRef = useRef();

  const handleClick = (e) => {
    e.stopPropagation();
    onPlanetClick({ name: "Sun", ref: meshRef, size: 8 });
  };

  return (
    <group>
      <mesh ref={meshRef} onClick={handleClick}>
        <sphereGeometry args={[8, 64, 64]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <pointLight intensity={2} distance={500} decay={0.5} color="#fff" />
      <pointLight intensity={10} distance={100} color="#ffaa00" />
    </group>
  );
}

function Planet({ name, textureKey, distance, size, orbitSpeed, onPlanetClick, hasRings, ringTextureKey, tilt = 0, children }) {
  const groupRef = useRef();
  const meshRef = useRef();
  const texture = useTexture(TEXTURES[textureKey]);
  const angleRef = useRef(Math.random() * Math.PI * 2);

  useFrame((state, delta) => {
    // Orbit
    angleRef.current += delta * orbitSpeed * 0.1;
    groupRef.current.position.x = Math.sin(angleRef.current) * distance;
    groupRef.current.position.z = Math.cos(angleRef.current) * distance;
    
    // Rotate
    meshRef.current.rotation.y += 0.005;
  });

  const handleClick = (e) => {
    e.stopPropagation();
    onPlanetClick({ name, ref: groupRef, size });
  };

  return (
    <group ref={groupRef}>
      <group rotation={[tilt, 0, 0]}>
        <mesh ref={meshRef} onClick={handleClick}>
          <sphereGeometry args={[size, 64, 64]} />
          <meshStandardMaterial map={texture} metalness={0.1} roughness={0.7} />
        </mesh>
        
        {hasRings && (
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[size * 1.4, size * 2.2, 64]} />
            <meshStandardMaterial map={useTexture(TEXTURES[ringTextureKey])} side={THREE.DoubleSide} transparent opacity={0.8} />
          </mesh>
        )}
      </group>
      {/* Orbit Line (Visual only) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-groupRef.current?.position.x || 0, 0, -groupRef.current?.position.z || 0]}>
        <ringGeometry args={[distance - 0.2, distance + 0.2, 128]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.05} side={THREE.DoubleSide} />
      </mesh>
      {children}
    </group>
  );
}

// Camera Helper to move camera to planet
function CameraController({ focusedPlanet, setFocusedPlanet }) {
  const { camera, controls } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const isTransitioning = useRef(false);

  useFrame((state, delta) => {
    if (!controls) return;

    if (focusedPlanet) {
      isTransitioning.current = true;
      const planetPos = new THREE.Vector3();
      focusedPlanet.ref.current.getWorldPosition(planetPos);
      
      // Calculate camera offset based on planet size
      const offset = focusedPlanet.size * 4 + 10;
      const camPos = new THREE.Vector3().copy(planetPos).add(new THREE.Vector3(offset, offset/2, offset));

      // Smoothly move controls target and camera
      controls.target.lerp(planetPos, 0.05);
      camera.position.lerp(camPos, 0.05);
    } else if (isTransitioning.current) {
      // Return to orbit view
      controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
      camera.position.lerp(new THREE.Vector3(0, 100, 200), 0.05);
      
      if (camera.position.distanceTo(new THREE.Vector3(0, 100, 200)) < 10) {
        isTransitioning.current = false;
      }
    }
    controls.update();
  });
  return null;
}

// --- 5. MAIN APP ---

export default function App() {
  const [focusedPlanet, setFocusedPlanet] = useState(null);

  const handleReturn = () => {
    setFocusedPlanet(null);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
      {/* Header Text */}
      <div style={{ position: "absolute", top: 20, width: "100%", textAlign: "center", zIndex: 10, pointerEvents: "none" }}>
        <h1 style={{ color: "white", fontFamily: "sans-serif", letterSpacing: "10px", textTransform: "uppercase", fontSize: "1.5rem" }}>
          Solar System Explorer
        </h1>
      </div>

      {/* Return Button */}
      {focusedPlanet && (
        <button onClick={handleReturn} style={{
          position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", zIndex: 20,
          padding: "10px 30px", background: "rgba(255,255,255,0.1)", border: "1px solid white", color: "white", borderRadius: "20px", cursor: "pointer"
        }}>
          RETURN TO ORBIT
        </button>
      )}

      {/* Info HUD */}
      <PlanetHUD focusedPlanet={focusedPlanet} onClose={handleReturn} />

      {/* 3D Scene */}
      <Canvas camera={{ position: [0, 100, 200], fov: 45, far: 5000 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.2} /> {/* Essential for seeing non-lit sides */}
          <Stars radius={300} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          <CameraController focusedPlanet={focusedPlanet} setFocusedPlanet={setFocusedPlanet} />
          <OrbitControls enablePan={false} maxDistance={400} minDistance={20} />

          <Sun onPlanetClick={setFocusedPlanet} />

          <Planet name="Mercury" textureKey="mercury" distance={25} size={1} orbitSpeed={1.5} onPlanetClick={setFocusedPlanet} />
          <Planet name="Venus" textureKey="venus" distance={40} size={2.2} orbitSpeed={1.2} onPlanetClick={setFocusedPlanet} />
          <Planet name="Earth" textureKey="earth" distance={60} size={2.5} orbitSpeed={1} onPlanetClick={setFocusedPlanet} />
          <Planet name="Mars" textureKey="mars" distance={80} size={1.5} orbitSpeed={0.8} onPlanetClick={setFocusedPlanet} />
          
          <AsteroidBelt />

          <Planet name="Jupiter" textureKey="jupiter" distance={130} size={7} orbitSpeed={0.4} onPlanetClick={setFocusedPlanet} />
          <Planet name="Saturn" textureKey="saturn" distance={170} size={6} orbitSpeed={0.3} onPlanetClick={setFocusedPlanet} hasRings ringTextureKey="saturnRing" tilt={0.4} />
          <Planet name="Uranus" textureKey="uranus" distance={210} size={4} orbitSpeed={0.2} onPlanetClick={setFocusedPlanet} tilt={1.5} />
          <Planet name="Neptune" textureKey="neptune" distance={240} size={3.8} orbitSpeed={0.1} onPlanetClick={setFocusedPlanet} />
          
        </Suspense>
      </Canvas>
      <Loader /> {/* Visual Loading Bar */}
    </div>
  );
}
