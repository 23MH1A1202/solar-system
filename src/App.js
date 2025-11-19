import React, { useRef, useState, useEffect, Suspense, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Html, useTexture, Loader } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";

// --- 1. ASSETS ---
const BASE = process.env.PUBLIC_URL;
const TEXTURES = {
  sun: `${BASE}/textures/sun.jpg`,
  mercury: `${BASE}/textures/2k_mercury.jpg`,
  venus: `${BASE}/textures/2k_venus_surface.jpg`,
  earth: `${BASE}/textures/earth_atmos_2048.jpg`,
  mars: `${BASE}/textures/2k_mars.jpg`,
  jupiter: `${BASE}/textures/2k_jupiter.jpg`,
  saturn: `${BASE}/textures/2k_saturn.jpg`,
  saturnRing: `${BASE}/textures/2k_saturn_ring_alpha.png`,
  uranus: `${BASE}/textures/2k_uranus.jpg`,
  neptune: `${BASE}/textures/2k_neptune.jpg`,
  moon: `${BASE}/textures/2k_moon.jpg`
};

// --- 2. DATA ---
const PLANET_DATA = {
  Sun: { diameter: "1,392,700 km", day: "25 Days", year: "N/A", temp: "5,500°C", info: "The star at the center of our Solar System." },
  Mercury: { diameter: "4,880 km", day: "59 days", year: "88 days", temp: "167°C", info: "Smallest planet, closest to the Sun." },
  Venus: { diameter: "12,104 km", day: "243 days", year: "225 days", temp: "464°C", info: "Hottest planet due to greenhouse effect." },
  Earth: { diameter: "12,742 km", day: "24 hours", year: "365 days", temp: "15°C", info: "The only known planet to support life." },
  Mars: { diameter: "6,779 km", day: "24.6 hours", year: "687 days", temp: "-65°C", info: "Home to Olympus Mons, the largest volcano." },
  Jupiter: { diameter: "139,820 km", day: "9.9 hours", year: "11.8 years", temp: "-110°C", info: "Largest planet, a gas giant with storms." },
  Saturn: { diameter: "116,460 km", day: "10.7 hours", year: "29 years", temp: "-140°C", info: "Famous for its complex, beautiful rings." },
  Uranus: { diameter: "50,724 km", day: "17 hours", year: "84 years", temp: "-195°C", info: "Rotates on its side with vertical rings." },
  Neptune: { diameter: "49,244 km", day: "16 hours", year: "165 years", temp: "-200°C", info: "The windiest planet, deep blue ice giant." }
};

// --- 3. SHADERS ---
const glowShader = {
  uniforms: {
    c: { type: "f", value: 0.1 },
    p: { type: "f", value: 4.0 },
    glowColor: { type: "c", value: new THREE.Color(0xff8c00) },
    viewVector: { type: "v3", value: new THREE.Vector3(0, 0, 0) },
  },
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
};

// --- 4. VISUAL COMPONENTS ---

function SunGlow({ color, size }) {
  const meshRef = useRef();
  const { camera } = useThree();
  
  const uniforms = useMemo(() => ({
    c: { value: 0.1 },
    p: { value: 4.0 },
    glowColor: { value: new THREE.Color(color) },
    viewVector: { value: new THREE.Vector3() }
  }), [color]);

  useFrame(() => {
    if (meshRef.current) {
      uniforms.viewVector.value.copy(camera.position).normalize();
      meshRef.current.material.uniforms.viewVector.value.copy(uniforms.viewVector.value);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[size * 1.2, 64, 64]} />
      <shaderMaterial
        attach="material"
        args={[glowShader]}
        uniforms={uniforms}
        side={THREE.FrontSide}
        blending={THREE.AdditiveBlending}
        transparent={true}
        depthWrite={false}
      />
    </mesh>
  );
}

function Sun({ onPlanetClick, isActive }) {
  const meshRef = useRef();
  const texture = useTexture(TEXTURES.sun);
  const size = 8;

  useFrame(() => {
    if (meshRef.current) meshRef.current.rotation.y -= 0.002;
  });

  const handleClick = (e) => {
    e.stopPropagation();
    onPlanetClick({ name: "Sun", position: new THREE.Vector3(0, 0, 0), size: size });
  };

  const data = PLANET_DATA["Sun"];

  return (
    <group>
      <mesh ref={meshRef} onClick={handleClick} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "auto")}>
        <sphereGeometry args={[size, 64, 64]} />
        <meshBasicMaterial map={texture} color="#ffffff" toneMapped={false} /> 
      </mesh>
      
      <SunGlow color="#FF8C00" size={size} />
      
      <pointLight intensity={5.0} distance={2000} decay={0} color="#ffddaa" />

      {isActive && (
          <Html position={[0, size * 1.3, 0]} center style={{ pointerEvents: 'none', zIndex: 100 }}>
            <InfoCard data={data} name="SUN" />
          </Html>
      )}
    </group>
  );
}

function AnimatedStars() {
  const starsRef = useRef();
  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.00001; 
    }
  });
  return <Stars ref={starsRef} radius={300} depth={60} count={20000} factor={6} saturation={0} fade speed={0.5} />;
}

function OrbitPath({ radius }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.05, radius + 0.05, 256]} />
      <meshBasicMaterial color="#888" transparent opacity={0.35} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Hitbox({ size, onClick }) {
  return (
    <mesh onClick={onClick} visible={false}>
      <sphereGeometry args={[size * 5, 16, 16]} />
      <meshBasicMaterial />
    </mesh>
  );
}

function InfoCard({ data, name }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.3 }}
      style={{ 
        background: "rgba(10, 15, 30, 0.9)", 
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        color: "white", 
        padding: "20px", 
        borderRadius: "16px", 
        width: "280px", 
        maxWidth: "90vw", 
        border: "1px solid rgba(100, 200, 255, 0.3)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        fontFamily: "'Inter', sans-serif",
        textAlign: "left"
      }}
    >
      <h3 style={{ margin: "0 0 12px 0", color: "#4db5ff", fontSize: "20px", textTransform: "uppercase", letterSpacing: "1px" }}>{name}</h3>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px", color: "#ccc", marginBottom: "15px" }}>
        <div><strong>Dia:</strong> {data.diameter}</div>
        <div><strong>Temp:</strong> {data.temp}</div>
        <div><strong>Day:</strong> {data.day}</div>
        <div><strong>Year:</strong> {data.year}</div>
      </div>
      
      <p style={{ fontSize: "13px", lineHeight: "1.5", color: "#eee", margin: "0 0 15px 0" }}>{data.info}</p>
      
      <div style={{ fontSize: "11px", color: "#888", fontStyle: "italic", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "10px", textAlign: "center" }}>
        Scroll to zoom out
      </div>
    </motion.div>
  );
}

// --- 5. PLANET COMPONENTS ---

// --- NEW: Moon Component ---
function Moon({ size, distance, orbitSpeed }) {
  const moonRef = useRef();
  const texture = useTexture(TEXTURES.moon);
  const angleRef = useRef(Math.random() * Math.PI * 2);

  useFrame((state, delta) => {
    if (moonRef.current) {
      // Orbit around the parent (Earth)
      angleRef.current += delta * orbitSpeed * 0.5;
      const x = Math.sin(angleRef.current) * distance;
      const z = Math.cos(angleRef.current) * distance;
      moonRef.current.position.set(x, 0, z);
      
      // Spin
      moonRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group ref={moonRef}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial map={texture} metalness={0.1} roughness={0.8} />
      </mesh>
    </group>
  );
}

function PlanetRing({ textureKey, size, isVertical }) {
  const texture = useTexture(TEXTURES[textureKey]);
  const geometryRef = useRef();

  useEffect(() => {
    if (geometryRef.current && texture) {
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
    }
  }, [size, texture]);
  
  const rotation = isVertical ? [0, 0, 0] : [-Math.PI / 2, 0, 0];

  return (
    <mesh rotation={rotation}>
      <ringGeometry ref={geometryRef} args={[size * 1.4, size * 2.4, 128]} />
      <meshStandardMaterial map={texture} opacity={0.8} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

function Planet({ 
  name, 
  textureKey, 
  distance, 
  startAngle, 
  orbitSpeed, 
  size, 
  onPlanetClick, 
  isActive, 
  isPaused, 
  hasAtmosphere, 
  hasRings,
  ringTextureKey,
  isVerticalRing, 
  tilt = 0,
  children // Allow nesting (for Moon)
}) {
  const orbitGroupRef = useRef();
  const spinMeshRef = useRef();
  
  const texture = useTexture(TEXTURES[textureKey] || TEXTURES.moon);
  const angleRef = useRef(startAngle); 

  useFrame((state, delta) => {
    if (orbitGroupRef.current && !isPaused) {
      angleRef.current += delta * orbitSpeed * 0.05; 
      const x = Math.sin(angleRef.current) * distance;
      const z = Math.cos(angleRef.current) * distance;
      orbitGroupRef.current.position.set(x, 0, z);
    }
    if (spinMeshRef.current) {
      spinMeshRef.current.rotation.y += 0.005; 
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    onPlanetClick({ name, position: orbitGroupRef.current.position, size });
  };

  const data = PLANET_DATA[name] || {};

  return (
    <group>
      <OrbitPath radius={distance} />
      
      <group ref={orbitGroupRef}>
        <group rotation={[tilt, 0, isVerticalRing ? Math.PI / 2 : 0]}>
            <group ref={spinMeshRef}>
                <mesh 
                onClick={handleClick}
                onPointerOver={() => (document.body.style.cursor = "pointer")}
                onPointerOut={() => (document.body.style.cursor = "auto")}
                castShadow receiveShadow
                >
                <sphereGeometry args={[size, 64, 64]} />
                <meshStandardMaterial map={texture} metalness={0.2} roughness={0.8} />
                </mesh>
                
                {hasAtmosphere && (
                <mesh scale={[1.02, 1.02, 1.02]}>
                    <sphereGeometry args={[size, 64, 64]} />
                    <meshPhongMaterial color="#4da6ff" transparent opacity={0.2} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
                </mesh>
                )}
            </group>

            {hasRings && (
              <PlanetRing textureKey={ringTextureKey} size={size} isVertical={isVerticalRing} />
            )}
        </group>
        
        {/* Render Children (like the Moon) inside the Orbit Group so they move with the planet */}
        {children}

        <Hitbox size={size} onClick={handleClick} />

        {isActive && (
          <Html position={[0, size + 2.5, 0]} center style={{ pointerEvents: 'none', zIndex: 100 }}>
            <InfoCard data={data} name={name} />
          </Html>
        )}
      </group>
    </group>
  );
}

// --- 6. CAMERA CONTROLLER ---
function CameraController({ focusedPlanet, setFocusedPlanet }) {
  const { camera, controls } = useThree();
  const isTransitioning = useRef(false);
  const isResetting = useRef(false);

  useEffect(() => {
    if (focusedPlanet) {
      isTransitioning.current = true;
      isResetting.current = false;
    }
  }, [focusedPlanet]);

  useEffect(() => {
    const handleReset = () => { isResetting.current = true; };
    window.addEventListener('reset-camera', handleReset);
    return () => window.removeEventListener('reset-camera', handleReset);
  }, []);

  useFrame((state, delta) => {
    if (!controls) return;

    let goalLookAt = new THREE.Vector3(0, 0, 0);
    let goalPos = new THREE.Vector3(0, 150, 200); 

    if (focusedPlanet) {
        goalLookAt = new THREE.Vector3(focusedPlanet.position.x, focusedPlanet.position.y, focusedPlanet.position.z);
        
        const sunDirection = new THREE.Vector3(0, 0, 0).sub(goalLookAt).normalize();
        const zoomDistance = focusedPlanet.name === "Sun" ? focusedPlanet.size * 4 : focusedPlanet.size * 6 + 12;
        
        goalPos = goalLookAt.clone().add(sunDirection.multiplyScalar(zoomDistance));
        goalPos.y += focusedPlanet.size * 2; 

        const currentDist = camera.position.distanceTo(goalLookAt);
        if (!isTransitioning.current && currentDist > zoomDistance + 30) {
             setFocusedPlanet(null); 
        }
    }

    if (isTransitioning.current && focusedPlanet) {
      controls.target.lerp(goalLookAt, 0.04);
      camera.position.lerp(goalPos, 0.04);
      if (camera.position.distanceTo(goalPos) < 0.5 && controls.target.distanceTo(goalLookAt) < 0.5) {
        isTransitioning.current = false;
      }
    } 
    else if (isResetting.current && !focusedPlanet) {
       controls.target.lerp(new THREE.Vector3(0,0,0), 0.04);
       camera.position.lerp(new THREE.Vector3(0, 150, 200), 0.04);
       if (camera.position.distanceTo(new THREE.Vector3(0, 150, 200)) < 2) isResetting.current = false;
    }
    else if (!focusedPlanet) {
       controls.target.lerp(new THREE.Vector3(0,0,0), 0.05);
    }
    else if (focusedPlanet && !isTransitioning.current) {
       controls.target.copy(goalLookAt);
    }
    
    controls.update();
  });
  return null;
}

// --- 7. MAIN APP ---
export default function App() {
  const [focusedPlanet, setFocusedPlanet] = useState(null);
  const isPaused = focusedPlanet !== null;

  const handleReturn = () => {
    setFocusedPlanet(null);
    window.dispatchEvent(new Event('reset-camera'));
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050508" }}>
      
      <div style={{ position: "absolute", top: 20, width: "100%", textAlign: "center", zIndex: 10, pointerEvents: "none" }}>
        <h1 style={{ 
          color: "white", fontFamily: "'Inter', sans-serif", fontWeight: "200", 
          letterSpacing: "10px", fontSize: "2rem", margin: 0, 
          textShadow: "0 0 25px rgba(77, 181, 255, 0.4)" 
        }}>
          SOLAR SYSTEM
        </h1>
      </div>

      {focusedPlanet && (
        <button 
          onClick={handleReturn}
          style={{
            position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", zIndex: 20,
            padding: "14px 32px", background: "rgba(20, 20, 30, 0.85)", color: "#4db5ff", 
            border: "1px solid rgba(77, 181, 255, 0.4)", borderRadius: "40px", fontSize: "0.9rem", fontWeight: "bold", 
            backdropFilter: "blur(12px)", cursor: "pointer", letterSpacing: "1px",
            boxShadow: "0 0 20px rgba(0,0,0,0.6)"
          }}
        >
          RETURN TO ORBIT
        </button>
      )}

      <Canvas camera={{ position: [0, 150, 200], fov: 45 }} dpr={[1, 2]} shadows>
        <ambientLight intensity={0.03} /> 
        <AnimatedStars />
        
        <Suspense fallback={null}>
          <Sun onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Sun"} />
          
          <Planet name="Mercury" textureKey="mercury" distance={30} startAngle={0} orbitSpeed={1.5} size={1.0} 
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Mercury"} isPaused={isPaused} 
          />

          <Planet name="Venus" textureKey="venus" distance={45} startAngle={1} orbitSpeed={1.1} size={1.8} 
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Venus"} isPaused={isPaused} 
          />

          {/* Earth with the new Moon child */}
          <Planet name="Earth" textureKey="earth" distance={65} startAngle={2} orbitSpeed={0.8} size={2.0} hasAtmosphere={true}
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Earth"} isPaused={isPaused} 
          >
             <Moon size={0.5} distance={3.5} orbitSpeed={2.0} />
          </Planet>

          <Planet name="Mars" textureKey="mars" distance={90} startAngle={3.5} orbitSpeed={0.6} size={1.4} 
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Mars"} isPaused={isPaused} 
          />

          <Planet name="Jupiter" textureKey="jupiter" distance={140} startAngle={4.2} orbitSpeed={0.3} size={5.0} 
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Jupiter"} isPaused={isPaused} 
          />

          <Planet name="Saturn" textureKey="saturn" distance={190} startAngle={5.5} orbitSpeed={0.2} size={4.2} 
            hasRings={true} ringTextureKey="saturnRing" tilt={0.5}
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Saturn"} isPaused={isPaused} 
          />

          <Planet name="Uranus" textureKey="uranus" distance={240} startAngle={0.5} orbitSpeed={0.1} size={2.8} 
            hasRings={true} ringTextureKey="uranus" isVerticalRing={true} tilt={0} 
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Uranus"} isPaused={isPaused} 
          />

          <Planet name="Neptune" textureKey="neptune" distance={290} startAngle={2} orbitSpeed={0.08} size={2.8} 
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Neptune"} isPaused={isPaused} 
          />

        </Suspense>

        <OrbitControls 
          enablePan={false} 
          minDistance={5} 
          maxDistance={1200} 
          enableDamping={true} 
          dampingFactor={0.05} 
          rotateSpeed={0.6}
          makeDefault 
        />
        <CameraController focusedPlanet={focusedPlanet} setFocusedPlanet={setFocusedPlanet} />
      </Canvas>
      <Loader />
    </div>
  );
}