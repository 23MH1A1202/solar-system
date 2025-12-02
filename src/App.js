import React, { useRef, useState, useEffect, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture, shaderMaterial } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

// --- 1. SAFETY SHIELD (Catches Missing Images) ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', maxWidth: '400px', background: 'rgba(20,0,0,0.95)', border: '1px solid #ff4444', padding: '20px', borderRadius: '10px', color: 'white', fontFamily: 'monospace', zIndex: 9999 }}>
          <h2 style={{ color: '#ff4444', marginTop: 0 }}>⚠️ Texture Error</h2>
          <p>The app crashed because an image could not be loaded.</p>
          <div style={{ background: '#330000', padding: '10px', borderRadius: '5px', marginBottom: '15px', wordBreak: 'break-all' }}>
            {this.state.error.message}
          </div>
          <p style={{ fontSize: '0.9em', color: '#aaa' }}>
            <strong>How to fix:</strong><br/>
            1. Check "public/textures" folder.<br/>
            2. Ensure filenames match EXACTLY (case-sensitive!).<br/>
            3. Example: "Sun.jpg" is not "sun.jpg".
          </p>
          <button onClick={() => window.location.reload()} style={{ background: '#ff4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Try Reloading</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- 2. SHADERS & MATERIALS ---
const SunMaterial = shaderMaterial(
  { time: 0, color: new THREE.Color(1.2, 0.6, 0.1) },
  `varying vec2 vUv; varying vec3 vNormal; void main() { vUv = uv; vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  `uniform float time; uniform vec3 color; varying vec2 vUv; varying vec3 vNormal;
   float noise(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.5432))) * 43758.5453); }
   void main() { float brightness = noise(vNormal * 4.0 + time * 0.2); gl_FragColor = vec4(color * (0.8 + brightness * 0.3), 1.0); }`
);
const AtmosphereMaterial = shaderMaterial(
  { color: new THREE.Color(0.3, 0.6, 1.0), intensity: 1.0 },
  `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  `uniform vec3 color; uniform float intensity; varying vec3 vNormal; void main() { float i = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 3.0); gl_FragColor = vec4(color, i * intensity); }`
);
extend({ SunMaterial, AtmosphereMaterial });

// --- 3. DATA & PATHS ---
const getPath = (file) => (process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/textures/${file}` : `/textures/${file}`);

const SOLAR_SYSTEM = [
  { name: "Mercury", diameter: 1, distance: 20, speed: 0.04, color: "#A5A5A5", texture: "2k_mercury.jpg" },
  { name: "Venus", diameter: 2.2, distance: 35, speed: 0.015, color: "#E3BB76", texture: "2k_venus_surface.jpg", atmosphere: true },
  { name: "Earth", diameter: 2.5, distance: 55, speed: 0.01, color: "#2233FF", texture: "earth_atmos_2048.jpg", clouds: "2k_earth_clouds.jpg", atmosphere: true, moons: [{ name: "Moon", diameter: 0.6, distance: 5, speed: 0.05, color: "#888", texture: "2k_moon.jpg" }] },
  { name: "Mars", diameter: 1.5, distance: 75, speed: 0.008, color: "#E27B58", texture: "2k_mars.jpg" },
  { name: "Jupiter", diameter: 7, distance: 110, speed: 0.002, color: "#C99039", texture: "2k_jupiter.jpg" },
  { name: "Saturn", diameter: 6, distance: 150, speed: 0.0018, color: "#EAD6B8", texture: "2k_saturn.jpg", ring: { inner: 8, outer: 12, texture: "2k_saturn_ring_alpha.png" }, tilt: 0.4 },
  { name: "Uranus", diameter: 4, distance: 190, speed: 0.001, color: "#D1F7FF", texture: "2k_uranus.jpg" },
  { name: "Neptune", diameter: 3.8, distance: 220, speed: 0.0009, color: "#5B5DDF", texture: "2k_neptune.jpg" }
];

// --- 4. COMPONENTS ---
function PlanetMesh({ file, color, args, ...props }) {
  const texture = useTexture(getPath(file));
  return <mesh {...props}><sphereGeometry args={args} /><meshStandardMaterial map={texture} roughness={0.8} metalness={0.1} /></mesh>;
}

function Clouds({ file, diameter }) {
  const texture = useTexture(getPath(file));
  const ref = useRef();
  useFrame(() => { if (ref.current) ref.current.rotation.y += 0.002; });
  return <mesh ref={ref} scale={[1.01, 1.01, 1.01]}><sphereGeometry args={[diameter, 64, 64]} /><meshStandardMaterial map={texture} transparent opacity={0.8} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} /></mesh>;
}

function PlanetRings({ file, inner, outer }) {
  const texture = useTexture(getPath(file));
  return <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[inner, outer, 64]} /><meshStandardMaterial map={texture} transparent opacity={0.8} side={THREE.DoubleSide} /></mesh>;
}

function Sun({ onClick }) {
  const materialRef = useRef();
  useFrame((state) => { if (materialRef.current) materialRef.current.time = state.clock.elapsedTime; });
  return (
    <group onClick={(e) => { e.stopPropagation(); onClick("Sun"); }}>
      <mesh><sphereGeometry args={[10, 32, 32]} /><sunMaterial ref={materialRef} transparent /></mesh>
      <pointLight intensity={2} distance={500} decay={0.5} color="#fff" />
    </group>
  );
}

function OrbitSystem({ planet, timeScale, onFocus, isSelected }) {
  const groupRef = useRef();
  const planetRef = useRef();
  const startAngle = useMemo(() => Math.random() * Math.PI * 2, []);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime() * timeScale;
    if (groupRef.current) {
      const angle = startAngle + t * planet.speed;
      groupRef.current.position.set(Math.sin(angle) * planet.distance, 0, Math.cos(angle) * planet.distance);
    }
    if (planetRef.current) planetRef.current.rotation.y += 0.005;
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[planet.distance - 0.2, planet.distance + 0.2, 64]} /><meshBasicMaterial color={isSelected ? "#4db5ff" : "#333"} transparent opacity={isSelected ? 0.6 : 0.2} side={THREE.DoubleSide} /></mesh>
      <group ref={groupRef}>
        <group rotation={[planet.tilt || 0, 0, 0]} onClick={(e) => { e.stopPropagation(); onFocus(planet.name); }}>
          <Suspense fallback={null}>
            <PlanetMesh ref={planetRef} file={planet.texture} color={planet.color} args={[planet.diameter, 32, 32]} />
            {planet.clouds && <Clouds file={planet.clouds} diameter={planet.diameter} />}
            {planet.atmosphere && <mesh scale={[1.2, 1.2, 1.2]}><sphereGeometry args={[planet.diameter, 16, 16]} /><atmosphereMaterial color={new THREE.Color(planet.color)} intensity={0.5} transparent side={THREE.BackSide} blending={THREE.AdditiveBlending} /></mesh>}
            {planet.ring && <PlanetRings file={planet.ring.texture} inner={planet.ring.inner} outer={planet.ring.outer} />}
          </Suspense>
          {planet.moons && planet.moons.map((moon, i) => (
             <Moon key={i} data={moon} timeScale={timeScale} />
          ))}
          {isSelected && <mesh><sphereGeometry args={[planet.diameter * 1.5, 16, 16]} /><meshBasicMaterial color="#4db5ff" wireframe transparent opacity={0.2} /></mesh>}
        </group>
      </group>
    </group>
  );
}

function Moon({ data, timeScale }) {
    const ref = useRef();
    const startAngle = useMemo(() => Math.random() * Math.PI * 2, []);
    useFrame((state) => {
        const t = state.clock.getElapsedTime() * timeScale;
        const angle = startAngle + t * data.speed * 5; 
        if(ref.current) ref.current.position.set(Math.sin(angle) * data.distance, 0, Math.cos(angle) * data.distance);
    });
    return (
        <group ref={ref}>
            <Suspense fallback={null}><PlanetMesh file={data.texture} color={data.color} args={[data.diameter, 16, 16]} /></Suspense>
        </group>
    );
}

// --- 5. UI & APP ---
function Overlay({ currentPlanet, onSelect, timeScale, setTimeScale }) {
    return (
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: 20, left: 20, pointerEvents: "auto" }}>
                <h1 style={{ margin: 0, color: "white", fontSize: "1.2rem", letterSpacing: "2px" }}>SOLARIS <span style={{color:"#4db5ff", fontSize:"0.8rem"}}>MOBILE</span></h1>
            </div>
            <div style={{ position: "absolute", top: "15%", left: 10, display: "flex", flexDirection: "column", gap: "8px", pointerEvents: "auto", maxHeight: "60vh", overflowY: "auto" }}>
                <button onClick={() => onSelect(null)} style={{ background: !currentPlanet ? "#4db5ff" : "rgba(0,0,0,0.5)", border: "1px solid #555", color: "white", padding: "6px 12px", borderRadius: "15px", fontSize: "0.8rem" }}>Overview</button>
                <button onClick={() => onSelect("Sun")} style={{ background: currentPlanet === "Sun" ? "#ffa500" : "rgba(0,0,0,0.5)", border: "1px solid #555", color: "white", padding: "6px 12px", borderRadius: "15px", fontSize: "0.8rem" }}>Sun</button>
                {SOLAR_SYSTEM.map(p => (
                    <button key={p.name} onClick={() => onSelect(p.name)} style={{ background: currentPlanet === p.name ? "#4db5ff" : "rgba(0,0,0,0.5)", border: "1px solid #555", color: "white", padding: "6px 12px", borderRadius: "15px", fontSize: "0.8rem" }}>{p.name}</button>
                ))}
            </div>
            <div style={{ position: "absolute", top: 20, right: 20, pointerEvents: "auto", background: "rgba(0,0,0,0.8)", padding: "8px", borderRadius: "8px", border: "1px solid #333" }}>
                <div style={{ color: "#aaa", fontSize: "10px", marginBottom: "5px" }}>SPEED</div>
                <input type="range" min="0" max="5" step="0.1" value={timeScale} onChange={(e) => setTimeScale(parseFloat(e.target.value))} style={{ width: "100px" }} />
                <div style={{ color: "white", textAlign: "right", fontSize: "10px" }}>{timeScale.toFixed(1)}x</div>
            </div>
        </div>
    );
}

export default function App() {
  const [target, setTarget] = useState(null);
  const [timeScale, setTimeScale] = useState(1.0);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "black", overflow: "hidden" }}>
      <ErrorBoundary>
        <Canvas camera={{ position: [0, 80, 150], fov: 60, far: 5000 }} dpr={[1, 1.5]}>
          <color attach="background" args={['#020205']} />
          <ambientLight intensity={0.2} />
          <Stars radius={200} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
          
          <Suspense fallback={null}>
            <Sun onClick={setTarget} />
            {SOLAR_SYSTEM.map((planet) => (
              <OrbitSystem key={planet.name} planet={planet} timeScale={timeScale} onFocus={setTarget} isSelected={target === planet.name} />
            ))}
          </Suspense>

          <OrbitControls enablePan={true} enableZoom={true} maxDistance={400} minDistance={10} />
        </Canvas>
      </ErrorBoundary>
      <Overlay currentPlanet={target} onSelect={setTarget} timeScale={timeScale} setTimeScale={setTimeScale} />
    </div>
  );
}
