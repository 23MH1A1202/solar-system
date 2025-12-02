import React, { useRef, useState, useEffect, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture, shaderMaterial } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

// ------------------------------------------------------------------
// 1. ADVANCED SHADERS
// ------------------------------------------------------------------

const SunMaterial = shaderMaterial(
  { time: 0, color: new THREE.Color(1.2, 0.6, 0.1) },
  // Vertex
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment
  `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    varying vec3 vNormal;

    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(fract(sin(dot(i + vec3(0, 0, 0), vec3(12.9898, 78.233, 37.719))) * 43758.5453),
                         fract(sin(dot(i + vec3(1, 0, 0), vec3(12.9898, 78.233, 37.719))) * 43758.5453), f.x),
                     mix(fract(sin(dot(i + vec3(0, 1, 0), vec3(12.9898, 78.233, 37.719))) * 43758.5453),
                         fract(sin(dot(i + vec3(1, 1, 0), vec3(12.9898, 78.233, 37.719))) * 43758.5453), f.x), f.y),
                 mix(mix(fract(sin(dot(i + vec3(0, 0, 1), vec3(12.9898, 78.233, 37.719))) * 43758.5453),
                         fract(sin(dot(i + vec3(1, 0, 1), vec3(12.9898, 78.233, 37.719))) * 43758.5453), f.x),
                     mix(fract(sin(dot(i + vec3(0, 1, 1), vec3(12.9898, 78.233, 37.719))) * 43758.5453),
                         fract(sin(dot(i + vec3(1, 1, 1), vec3(12.9898, 78.233, 37.719))) * 43758.5453), f.x), f.y), f.z);
    }

    void main() {
      float brightness = noise(vNormal * 6.0 + time * 0.5);
      vec3 finalColor = color * (0.8 + brightness * 0.4);
      float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
      gl_FragColor = vec4(finalColor + vec3(fresnel) * 0.5, 1.0);
    }
  `
);

const AtmosphereMaterial = shaderMaterial(
  { color: new THREE.Color(0.3, 0.6, 1.0), intensity: 1.0 },
  `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
    uniform vec3 color;
    uniform float intensity;
    varying vec3 vNormal;
    void main() {
      float intensityVal = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 4.0);
      gl_FragColor = vec4(color, intensityVal * intensity);
    }
  `
);

extend({ SunMaterial, AtmosphereMaterial });

// ------------------------------------------------------------------
// 2. DATA CONFIGURATION
// ------------------------------------------------------------------

const getPath = (file) => (process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/textures/${file}` : `/textures/${file}`);

const SOLAR_SYSTEM = [
  {
    name: "Mercury",
    diameter: 1,
    distance: 25,
    speed: 0.04,
    color: "#A5A5A5",
    texture: getPath("2k_mercury.jpg"),
    info: "Mercury is the smallest planet and closest to the Sun. It has no atmosphere to retain heat.",
    moons: []
  },
  {
    name: "Venus",
    diameter: 2.2,
    distance: 40,
    speed: 0.015,
    color: "#E3BB76",
    texture: getPath("2k_venus_surface.jpg"),
    atmosphere: true,
    info: "Venus is the hottest planet in the solar system due to its thick, toxic atmosphere.",
    moons: []
  },
  {
    name: "Earth",
    diameter: 2.5,
    distance: 60,
    speed: 0.01,
    color: "#2233FF",
    texture: getPath("earth_atmos_2048.jpg"),
    clouds: getPath("2k_earth_clouds.jpg"),
    atmosphere: true,
    info: "Our home. The only known planet to support life. 70% of the surface is water.",
    moons: [
      { name: "Moon", diameter: 0.6, distance: 5, speed: 0.05, color: "#888", texture: getPath("2k_moon.jpg") }
    ]
  },
  {
    name: "Mars",
    diameter: 1.5,
    distance: 80,
    speed: 0.008,
    color: "#E27B58",
    texture: getPath("2k_mars.jpg"),
    info: "The Red Planet. Home to Olympus Mons, the largest volcano in the solar system.",
    moons: [
      { name: "Phobos", diameter: 0.2, distance: 2.5, speed: 0.1, color: "#555" },
      { name: "Deimos", diameter: 0.1, distance: 3.5, speed: 0.08, color: "#444" }
    ]
  },
  {
    name: "Jupiter",
    diameter: 8,
    distance: 130,
    speed: 0.002,
    color: "#C99039",
    texture: getPath("2k_jupiter.jpg"),
    info: "A gas giant and the largest planet. It has a Great Red Spot storm larger than Earth.",
    moons: [
      { name: "Europa", diameter: 0.8, distance: 10, speed: 0.02, color: "#ddd" },
      { name: "Io", diameter: 0.9, distance: 8, speed: 0.03, color: "#ddaa00" }
    ]
  },
  {
    name: "Saturn",
    diameter: 7,
    distance: 180,
    speed: 0.0018,
    color: "#EAD6B8",
    texture: getPath("2k_saturn.jpg"),
    ring: { inner: 9, outer: 14, texture: getPath("2k_saturn_ring_alpha.png") },
    tilt: 0.4,
    info: "Distinguished by its complex ring system composed of ice and rock particles.",
    moons: [
        { name: "Titan", diameter: 1.0, distance: 12, speed: 0.02, color: "#EAD6B8" }
    ]
  },
  {
    name: "Uranus",
    diameter: 4,
    distance: 230,
    speed: 0.001,
    color: "#D1F7FF",
    texture: getPath("2k_uranus.jpg"),
    info: "An ice giant that spins on its side. It has a very cold and windy atmosphere.",
    moons: []
  },
  {
    name: "Neptune",
    diameter: 3.8,
    distance: 270,
    speed: 0.0009,
    color: "#5B5DDF",
    texture: getPath("2k_neptune.jpg"),
    info: "The most distant planet. It has the strongest winds in the solar system.",
    moons: []
  }
];

// ------------------------------------------------------------------
// 3. HELPER COMPONENTS (FIXED FOR HOOKS)
// ------------------------------------------------------------------

function PlanetMesh({ textureUrl, color, args, ...props }) {
  const texture = useTexture(textureUrl);
  return (
    <mesh {...props}>
      <sphereGeometry args={args} />
      {texture ? (
        <meshStandardMaterial map={texture} roughness={0.8} metalness={0.1} />
      ) : (
        <meshStandardMaterial color={color} roughness={0.8} />
      )}
    </mesh>
  );
}

function FallbackMesh({ color, args, ...props }) {
  return (
    <mesh {...props}>
      <sphereGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  );
}

// NEW: Separated Clouds component to safely use Hooks
function Clouds({ textureUrl, diameter }) {
  const texture = useTexture(textureUrl);
  const ref = useRef();
  useFrame(() => { if (ref.current) ref.current.rotation.y += 0.007; });
  
  return (
    <mesh ref={ref} scale={[1.01, 1.01, 1.01]}>
      <sphereGeometry args={[diameter, 64, 64]} />
      <meshStandardMaterial map={texture} transparent opacity={0.8} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false}/>
    </mesh>
  );
}

// NEW: Separated Rings component to safely use Hooks
function PlanetRings({ textureUrl, inner, outer }) {
  const texture = useTexture(textureUrl);
  return (
    <mesh rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[inner, outer, 64]} />
        <meshStandardMaterial map={texture} transparent opacity={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ------------------------------------------------------------------
// 4. SCENE COMPONENTS
// ------------------------------------------------------------------

function Sun({ onClick }) {
  const materialRef = useRef();
  
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.time = state.clock.elapsedTime;
    }
  });

  return (
    <group onClick={(e) => { e.stopPropagation(); onClick("Sun"); }}>
      <mesh>
        <sphereGeometry args={[12, 64, 64]} />
        <sunMaterial ref={materialRef} transparent />
      </mesh>
      <mesh scale={[1.2, 1.2, 1.2]}>
        <sphereGeometry args={[12, 32, 32]} />
        <meshBasicMaterial color="#FF5500" transparent opacity={0.1} side={THREE.BackSide} />
      </mesh>
      <pointLight intensity={2.5} distance={1000} decay={0.5} color="#fff" />
    </group>
  );
}

function AsteroidBelt() {
  const meshRef = useRef();
  const count = 4000;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const asteroids = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
      angle: Math.random() * Math.PI * 2,
      radius: 95 + Math.random() * 25,
      y: (Math.random() - 0.5) * 10,
      scale: Math.random() * 0.4 + 0.05,
      rotationSpeed: Math.random() * 0.02
    }));
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime * 0.05;
    asteroids.forEach((data, i) => {
      const angle = data.angle + time * (100 / data.radius);
      dummy.position.set(
        Math.cos(angle) * data.radius,
        data.y + Math.sin(time + i) * 2,
        Math.sin(angle) * data.radius
      );
      dummy.rotation.set(time * data.rotationSpeed, time * data.rotationSpeed, time);
      dummy.scale.setScalar(data.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <dodecahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color="#666" roughness={0.9} />
    </instancedMesh>
  );
}

function OrbitSystem({ planet, timeScale, onFocus, isSelected }) {
  const groupRef = useRef();
  const planetRef = useRef();
  
  const startAngle = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * timeScale;
    
    // 1. Orbit Logic
    if (groupRef.current) {
      const angle = startAngle + t * planet.speed;
      groupRef.current.position.x = Math.sin(angle) * planet.distance;
      groupRef.current.position.z = Math.cos(angle) * planet.distance;
    }

    // 2. Self Rotation
    if (planetRef.current) {
      planetRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group>
      {/* Orbit Path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[planet.distance - 0.2, planet.distance + 0.2, 128]} />
        <meshBasicMaterial color={isSelected ? "#4db5ff" : "#333"} transparent opacity={isSelected ? 0.6 : 0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* The Moving Group */}
      <group ref={groupRef}>
        <group rotation={[planet.tilt || 0, 0, 0]} onClick={(e) => { e.stopPropagation(); onFocus(planet.name); }}>
          
          <Suspense fallback={<FallbackMesh color={planet.color} args={[planet.diameter, 32, 32]} />}>
             <PlanetMesh 
                ref={planetRef}
                textureUrl={planet.texture} 
                color={planet.color} 
                args={[planet.diameter, 64, 64]} 
             />
             
             {/* Safe Clouds Component */}
             {planet.clouds && (
               <Clouds textureUrl={planet.clouds} diameter={planet.diameter} />
             )}

             {/* Atmosphere Glow */}
             {planet.atmosphere && (
                <mesh scale={[1.2, 1.2, 1.2]}>
                  <sphereGeometry args={[planet.diameter, 32, 32]} />
                  <atmosphereMaterial color={new THREE.Color(planet.color)} intensity={0.5} transparent side={THREE.BackSide} blending={THREE.AdditiveBlending} />
                </mesh>
             )}

             {/* Safe Rings Component */}
             {planet.ring && (
                <PlanetRings textureUrl={planet.ring.texture} inner={planet.ring.inner} outer={planet.ring.outer} />
             )}
          </Suspense>

          {/* Moons */}
          {planet.moons.map((moon, i) => (
             <Moon key={i} data={moon} timeScale={timeScale} />
          ))}

          {/* Selection Highlight */}
          {isSelected && (
            <mesh>
               <sphereGeometry args={[planet.diameter * 1.5, 32, 32]} />
               <meshBasicMaterial color="#4db5ff" wireframe transparent opacity={0.2} />
            </mesh>
          )}

        </group>
      </group>
    </group>
  );
}

function Moon({ data, timeScale }) {
    const moonRef = useRef();
    const startAngle = useMemo(() => Math.random() * Math.PI * 2, []);

    useFrame((state) => {
        const t = state.clock.getElapsedTime() * timeScale;
        const angle = startAngle + t * data.speed * 5; 
        if(moonRef.current) {
            moonRef.current.position.x = Math.sin(angle) * data.distance;
            moonRef.current.position.z = Math.cos(angle) * data.distance;
            moonRef.current.rotation.y += 0.01;
        }
    });

    return (
        <group ref={moonRef}>
            <Suspense fallback={<FallbackMesh color={data.color} args={[data.diameter, 16, 16]} />}>
                {data.texture ? (
                   <PlanetMesh textureUrl={data.texture} color={data.color} args={[data.diameter, 32, 32]} />
                ) : (
                   <FallbackMesh color={data.color} args={[data.diameter, 16, 16]} />
                )}
            </Suspense>
        </group>
    );
}

// ------------------------------------------------------------------
// 5. CAMERA & CONTROLS
// ------------------------------------------------------------------

function CameraManager({ targetName, sceneRef }) {
  const { controls } = useThree();

  useEffect(() => {
     if(targetName === "Sun") {
         controls.minDistance = 25;
     } else {
         controls.minDistance = 5;
     }
  }, [targetName, controls]);

  return null;
}

// ------------------------------------------------------------------
// 6. UI OVERLAY
// ------------------------------------------------------------------

function Overlay({ currentPlanet, onSelect, timeScale, setTimeScale }) {
    const planetInfo = SOLAR_SYSTEM.find(p => p.name === currentPlanet) || (currentPlanet === "Sun" ? { name: "Sun", info: "The Star." } : null);

    return (
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            
            <div style={{ position: "absolute", top: 20, left: 20, pointerEvents: "auto" }}>
                <h1 style={{ margin: 0, color: "white", fontSize: "1.5rem", letterSpacing: "4px" }}>SOLARIS <span style={{color:"#4db5ff", fontSize:"0.8rem"}}>PRO</span></h1>
                <p style={{ margin: 0, color: "#888", fontSize: "0.8rem" }}>Interactive System Simulation</p>
            </div>

            <div style={{ 
                position: "absolute", top: "20%", left: 20, display: "flex", flexDirection: "column", gap: "10px", pointerEvents: "auto" 
            }}>
                <button 
                    onClick={() => onSelect(null)}
                    style={{ background: !currentPlanet ? "#4db5ff" : "rgba(0,0,0,0.5)", border: "1px solid #555", color: "white", padding: "8px 20px", borderRadius: "20px", cursor: "pointer", textAlign: "left" }}
                >
                    Overview
                </button>
                <button 
                    onClick={() => onSelect("Sun")}
                    style={{ background: currentPlanet === "Sun" ? "#ffa500" : "rgba(0,0,0,0.5)", border: "1px solid #555", color: "white", padding: "8px 20px", borderRadius: "20px", cursor: "pointer", textAlign: "left" }}
                >
                    Sun
                </button>
                {SOLAR_SYSTEM.map(p => (
                    <button 
                        key={p.name}
                        onClick={() => onSelect(p.name)}
                        style={{ 
                            background: currentPlanet === p.name ? "#4db5ff" : "rgba(0,0,0,0.5)", 
                            border: "1px solid #555", color: "white", padding: "8px 20px", borderRadius: "20px", cursor: "pointer", textAlign: "left",
                            transition: "all 0.2s"
                        }}
                    >
                        {p.name}
                    </button>
                ))}
            </div>

            <div style={{ position: "absolute", top: 20, right: 20, pointerEvents: "auto", background: "rgba(0,0,0,0.8)", padding: "10px", borderRadius: "10px", border: "1px solid #333" }}>
                <div style={{ color: "#aaa", fontSize: "12px", marginBottom: "5px" }}>SIMULATION SPEED</div>
                <input 
                    type="range" min="0" max="5" step="0.1" value={timeScale} 
                    onChange={(e) => setTimeScale(parseFloat(e.target.value))}
                    style={{ width: "150px", cursor: "pointer" }} 
                />
                <div style={{ color: "white", textAlign: "right", fontSize: "12px" }}>{timeScale.toFixed(1)}x</div>
            </div>

            <AnimatePresence>
                {planetInfo && (
                    <motion.div
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 300, opacity: 0 }}
                        style={{ 
                            position: "absolute", bottom: 40, right: 40, width: "300px", 
                            background: "rgba(16, 18, 27, 0.9)", backdropFilter: "blur(20px)",
                            padding: "25px", borderRadius: "15px", borderLeft: `4px solid ${currentPlanet === "Sun" ? "#ffa500" : "#4db5ff"}`,
                            pointerEvents: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
                        }}
                    >
                        <h2 style={{ margin: "0 0 10px 0", color: "white", fontSize: "2rem" }}>{planetInfo.name.toUpperCase()}</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px", fontSize: "0.8rem", color: "#aaa" }}>
                            {planetInfo.diameter && <div>DIAM: {planetInfo.diameter * 12742} km</div>}
                            {planetInfo.distance && <div>DIST: {planetInfo.distance} AU</div>}
                        </div>
                        <p style={{ color: "#ddd", lineHeight: "1.6", fontSize: "0.95rem" }}>{planetInfo.info}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ------------------------------------------------------------------
// 7. MAIN APP COMPONENT
// ------------------------------------------------------------------

export default function App() {
  const [target, setTarget] = useState(null);
  const [timeScale, setTimeScale] = useState(1.0);
  const sceneRef = useRef();

  // Expose timescale to window for deep access
  useEffect(() => { window.timeScale = timeScale; }, [timeScale]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "black", overflow: "hidden" }}>
      
      <Canvas camera={{ position: [0, 100, 250], fov: 45, far: 10000 }} shadows dpr={[1, 2]}>
        <color attach="background" args={['#050505']} />
        
        <ambientLight intensity={0.15} />
        
        <Stars radius={300} depth={50} count={6000} factor={4} saturation={0} fade speed={1} />
        
        <Suspense fallback={null}>
          <group ref={sceneRef}>
            <Sun onClick={setTarget} />
            <AsteroidBelt />
            
            {SOLAR_SYSTEM.map((planet) => (
              <OrbitSystem 
                key={planet.name} 
                planet={planet} 
                timeScale={timeScale} 
                onFocus={setTarget}
                isSelected={target === planet.name}
              />
            ))}
          </group>

          <CameraManager targetName={target} sceneRef={sceneRef} />
        </Suspense>

        <OrbitControls 
          enablePan={true} 
          enableZoom={true} 
          maxDistance={600} 
          minDistance={15} 
          zoomSpeed={0.5}
          autoRotate={!target}
          autoRotateSpeed={0.5}
        />
      </Canvas>

      <Overlay 
        currentPlanet={target} 
        onSelect={setTarget} 
        timeScale={timeScale}
        setTimeScale={setTimeScale}
      />
    </div>
  );
}
