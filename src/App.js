import React, { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Html, useTexture, Loader } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";

// --- 1. ASSETS (Dynamic Path Handling) ---
// process.env.PUBLIC_URL handles the difference between Localhost (root) and GitHub Pages (/solar-system) automatically.
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

// --- 2. VISUALS ---

function Sun() {
  const meshRef = useRef();
  const texture = useTexture(TEXTURES.sun);

  useFrame(({ clock }) => {
    if (meshRef.current) {
        meshRef.current.rotation.y -= 0.002;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[8, 64, 64]} />
        <meshBasicMaterial map={texture} color="#ffffff" />
        <pointLight intensity={3000} distance={1000} decay={1.5} color="#ffddaa" />
      </mesh>
      <mesh scale={[1.2, 1.2, 1.2]}>
        <sphereGeometry args={[8, 32, 32]} />
        <meshBasicMaterial color="#FF8C00" transparent opacity={0.2} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function AnimatedStars() {
  const starsRef = useRef();
  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.00001; 
      starsRef.current.rotation.x += 0.000005;
    }
  });
  return <Stars ref={starsRef} radius={300} depth={60} count={20000} factor={6} saturation={0} fade speed={0.5} />;
}

function OrbitPath({ radius }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.15, radius + 0.15, 256]} />
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

// --- 3. PLANET COMPONENTS ---

function PlanetRing({ textureKey, size }) {
  const texture = useTexture(TEXTURES[textureKey]);
  texture.rotation = Math.PI / 2; 
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[size * 1.4, size * 2.4, 128]} />
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
  tilt = 0 
}) {
  const orbitGroupRef = useRef();
  const spinMeshRef = useRef();
  
  const texture = useTexture(TEXTURES[textureKey]);
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

  return (
    <group>
      <OrbitPath radius={distance} />
      
      <group ref={orbitGroupRef}>
        <group rotation={[tilt, 0, 0]}>
            <group ref={spinMeshRef}>
                <mesh 
                onClick={handleClick}
                onPointerOver={() => (document.body.style.cursor = "pointer")}
                onPointerOut={() => (document.body.style.cursor = "auto")}
                >
                <sphereGeometry args={[size, 64, 64]} />
                <meshStandardMaterial map={texture} metalness={0.1} roughness={0.7} />
                </mesh>
                
                {hasAtmosphere && (
                <mesh scale={[1.02, 1.02, 1.02]}>
                    <sphereGeometry args={[size, 64, 64]} />
                    <meshPhongMaterial color="#4da6ff" transparent opacity={0.2} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
                </mesh>
                )}
            </group>

            {hasRings && <PlanetRing textureKey={ringTextureKey} size={size} />}
        </group>

        <Hitbox size={size} onClick={handleClick} />

        {isActive && (
          <Html position={[0, size + 2.5, 0]} center style={{ pointerEvents: 'none', zIndex: 100 }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.3 }}
              style={{ 
                background: "rgba(10, 10, 20, 0.85)", 
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                color: "white", 
                padding: "12px", 
                borderRadius: "12px", 
                width: "max-content",
                maxWidth: "80vw",
                border: "1px solid rgba(77, 181, 255, 0.3)",
                boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
                fontFamily: "'Inter', sans-serif",
                textAlign: "center"
              }}
            >
              <h3 style={{ margin: "0 0 4px 0", color: "#4db5ff", textTransform: "uppercase", letterSpacing: "2px", fontSize: "14px" }}>{name}</h3>
              <div style={{ fontSize: "10px", color: "#bbb", lineHeight: "1.4" }}>
                <p style={{ margin: "2px 0" }}>Dist: {distance} AU</p>
                <p style={{ margin: "2px 0 4px 0" }}>Speed: {orbitSpeed}x</p>
                <div style={{ width: "1px", height: "10px", background: "rgba(77,181,255,0.5)", margin: "5px auto 0 auto" }}></div>
              </div>
            </motion.div>
          </Html>
        )}
      </group>
    </group>
  );
}

// --- 4. CAMERA CONTROLLER ---
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
        const zoomDistance = focusedPlanet.size * 6 + 12;
        
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

// --- 5. MAIN APP ---
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
        <ambientLight intensity={0.1} /> 
        <AnimatedStars />
        
        <Suspense fallback={null}>
          <Sun />
          
          <Planet name="Mercury" textureKey="mercury" distance={30} startAngle={0} orbitSpeed={1.5} size={1.0} 
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Mercury"} isPaused={isPaused} 
          />

          <Planet name="Venus" textureKey="venus" distance={45} startAngle={1} orbitSpeed={1.1} size={1.8} 
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Venus"} isPaused={isPaused} 
          />

          <Planet name="Earth" textureKey="earth" distance={65} startAngle={2} orbitSpeed={0.8} size={2.0} hasAtmosphere={true}
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Earth"} isPaused={isPaused} 
          />

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
            tilt={1.5} 
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Uranus"} isPaused={isPaused} 
          />

          <Planet name="Neptune" textureKey="neptune" distance={290} startAngle={2} orbitSpeed={0.08} size={2.8} 
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Neptune"} isPaused={isPaused} 
          />

        </Suspense>

        <OrbitControls 
          enablePan={false} 
          minDistance={5} 
          maxDistance={800} 
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