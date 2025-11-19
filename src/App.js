import React, { useRef, useState, useEffect, Suspense, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Html, useTexture, Loader } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";

// --- 1. ASSETS ---
const EXTERNAL_TEXTURES = {
  earth: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg",
  moon: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg"
};

// --- TEXTURE GENERATORS ---

function createGasGiantTexture(colors, hasStorm = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, 1024);
  
  colors.forEach((stop) => {
    gradient.addColorStop(stop.offset, stop.color);
  });

  context.fillStyle = gradient;
  context.fillRect(0, 0, 1024, 1024);
  
  // Add Cloud Noise/Banding
  for (let i = 0; i < 15000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const w = Math.random() * 150;
      const h = Math.random() * 3;
      context.fillStyle = `rgba(255,255,255, ${Math.random() * 0.03})`; // Faint white wisps
      context.fillRect(x, y, w, h);
  }

  // Enhanced Great Red Spot
  if (hasStorm) {
      const cx = 650;
      const cy = 650;
      const rx = 130; // Radius X
      const ry = 75;  // Radius Y

      // 1. Outer Halo (Blending into atmosphere)
      context.beginPath();
      context.ellipse(cx, cy, rx + 20, ry + 20, 0, 0, 2 * Math.PI);
      context.fillStyle = "rgba(160, 100, 80, 0.2)"; 
      context.fill();

      // 2. Main Storm Body (Reddish-Brown)
      context.beginPath();
      context.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      context.fillStyle = "rgba(160, 82, 45, 0.5)"; // Sienna
      context.fill();

      // 3. Inner Core (Darker)
      context.beginPath();
      context.ellipse(cx, cy, rx * 0.7, ry * 0.7, 0, 0, 2 * Math.PI);
      context.fillStyle = "rgba(139, 69, 19, 0.4)"; // SaddleBrown
      context.fill();

      // 4. The Eye (Lighter center)
      context.beginPath();
      context.ellipse(cx, cy, rx * 0.3, ry * 0.3, 0, 0, 2 * Math.PI);
      context.fillStyle = "rgba(200, 120, 100, 0.6)"; 
      context.fill();

      // 5. Storm Swirl Lines (Turbulence)
      context.lineWidth = 3;
      context.strokeStyle = "rgba(255, 200, 180, 0.15)";
      for(let i=0; i<3; i++) {
         context.beginPath();
         context.ellipse(cx, cy, rx - (i*15), ry - (i*10), 0, 0, 2*Math.PI);
         context.stroke();
      }
  }

  return new THREE.CanvasTexture(canvas);
}

function createNoiseTexture(baseColor, secondaryColor, noiseScale = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");

  context.fillStyle = baseColor;
  context.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 20 * noiseScale;
      const opacity = Math.random() * 0.15;
      
      context.globalAlpha = opacity;
      context.fillStyle = secondaryColor;
      context.beginPath();
      context.arc(x, y, size, 0, Math.PI * 2);
      context.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

// --- 2. VISUALS ---

function Sun() {
  const meshRef = useRef();
  const sunTexture = useMemo(() => createNoiseTexture("#FFD700", "#FF4500", 3), []);

  useFrame(({ clock }) => {
    const scale = 1 + Math.sin(clock.getElapsedTime() * 1.5) * 0.01; 
    if (meshRef.current) {
        meshRef.current.scale.set(scale, scale, scale);
        meshRef.current.rotation.y -= 0.002;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[4.5, 64, 64]} />
        <meshBasicMaterial map={sunTexture} color="#ffffff" />
        <pointLight intensity={1500} distance={400} decay={1.5} color="#ffddaa" />
      </mesh>
      <mesh scale={[3.0, 3.0, 3.0]}>
        <sphereGeometry args={[1.6, 32, 32]} />
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
      <meshBasicMaterial color="#888" transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Hitbox({ size, onClick }) {
  return (
    <mesh onClick={onClick} visible={false}>
      <sphereGeometry args={[size * 4, 16, 16]} />
      <meshBasicMaterial />
    </mesh>
  );
}

// --- 3. PLANET COMPONENT ---
function Planet({ 
  name, 
  textureUrl, 
  proceduralType, 
  proceduralColors, 
  noiseBase, noiseSecond,
  color, 
  distance, 
  startAngle, 
  orbitSpeed, 
  size, 
  onPlanetClick, 
  isActive, 
  isPaused, 
  hasAtmosphere, 
  hasRings,
  hasStorm,
  ringColor,
  tilt = 0 
}) {
  const orbitGroupRef = useRef();
  const spinMeshRef = useRef();
  
  const loadedTexture = useTexture(textureUrl || EXTERNAL_TEXTURES.moon);
  const angleRef = useRef(startAngle); 
  
  const generatedTexture = useMemo(() => {
      if (proceduralType === 'gas') return createGasGiantTexture(proceduralColors, hasStorm);
      if (proceduralType === 'noise') return createNoiseTexture(noiseBase, noiseSecond);
      return null;
  }, [proceduralType, proceduralColors, noiseBase, noiseSecond, hasStorm]);

  const finalMap = (proceduralType) ? generatedTexture : (textureUrl ? loadedTexture : null);
  const finalColor = (proceduralType || textureUrl) ? "white" : color;

  useFrame((state, delta) => {
    if (orbitGroupRef.current && !isPaused) {
      angleRef.current += delta * orbitSpeed * 0.08;
      const x = Math.sin(angleRef.current) * distance;
      const z = Math.cos(angleRef.current) * distance;
      orbitGroupRef.current.position.set(x, 0, z);
    }
    if (spinMeshRef.current) {
      spinMeshRef.current.rotation.y += 0.003; 
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
                <meshStandardMaterial 
                    map={finalMap} 
                    color={finalColor}
                    metalness={0.1} 
                    roughness={0.7} 
                />
                </mesh>
                
                {hasAtmosphere && (
                <mesh scale={[1.15, 1.15, 1.15]}>
                    <sphereGeometry args={[size, 64, 64]} />
                    <meshPhongMaterial 
                        color="#00bfff" 
                        transparent 
                        opacity={0.15} 
                        side={THREE.BackSide} 
                        blending={THREE.AdditiveBlending} 
                    />
                </mesh>
                )}
            </group>

            {hasRings && (
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[size * 1.4, size * 2.4, 128]} />
                <meshStandardMaterial color={ringColor || color} opacity={0.7} transparent side={THREE.DoubleSide} />
            </mesh>
            )}
        </group>

        <Hitbox size={size} onClick={handleClick} />

        {isActive && (
          <Html position={[0, size + 2.0, 0]} center style={{ pointerEvents: 'none', zIndex: 100 }}>
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
    let goalPos = new THREE.Vector3(0, 80, 120); 

    if (focusedPlanet) {
        // 1. Define where we are looking (Planet Center)
        goalLookAt = new THREE.Vector3(focusedPlanet.position.x, focusedPlanet.position.y, focusedPlanet.position.z);
        
        // 2. Define where the camera should be (Bright Side Calculation)
        // Vector from Planet -> Sun (0,0,0)
        const sunDirection = new THREE.Vector3(0, 0, 0).sub(goalLookAt).normalize();
        const zoomDistance = focusedPlanet.size * 6 + 10;
        
        goalPos = goalLookAt.clone().add(sunDirection.multiplyScalar(zoomDistance));
        goalPos.y += focusedPlanet.size * 1.5; 

        const currentDist = camera.position.distanceTo(goalLookAt);
        if (!isTransitioning.current && currentDist > zoomDistance + 20) {
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
       camera.position.lerp(new THREE.Vector3(0, 80, 120), 0.04);
       if (camera.position.distanceTo(new THREE.Vector3(0, 80, 120)) < 2) isResetting.current = false;
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

      <Canvas camera={{ position: [0, 80, 120], fov: 40 }} dpr={[1, 2]} shadows>
        <ambientLight intensity={0.1} /> 
        <AnimatedStars />
        
        <Suspense fallback={null}>
          <Sun />
          
          <Planet name="Mercury" textureUrl={EXTERNAL_TEXTURES.moon} distance={20} startAngle={0} orbitSpeed={1.5} size={0.8} 
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Mercury"} isPaused={isPaused} 
          />

          <Planet name="Venus" distance={35} startAngle={1} orbitSpeed={1.1} size={1.4} 
            proceduralType="noise" noiseBase="#E6B873" noiseSecond="#C59E58"
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Venus"} isPaused={isPaused} 
          />

          <Planet name="Earth" textureUrl={EXTERNAL_TEXTURES.earth} distance={50} startAngle={2} orbitSpeed={0.8} size={1.6} hasAtmosphere={true}
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Earth"} isPaused={isPaused} 
          />

          <Planet name="Mars" textureUrl={EXTERNAL_TEXTURES.moon} color="#C1440E" distance={70} startAngle={3.5} orbitSpeed={0.6} size={1.2} 
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Mars"} isPaused={isPaused} 
          />

          <Planet name="Jupiter" distance={100} startAngle={4.2} orbitSpeed={0.3} size={4.5} hasStorm={true}
            proceduralType="gas"
            proceduralColors={[
                { offset: 0.0, color: '#584C3E' },
                { offset: 0.2, color: '#9C8366' },
                { offset: 0.4, color: '#7A654B' },
                { offset: 0.6, color: '#D4BE9E' },
                { offset: 0.8, color: '#584C3E' },
                { offset: 1.0, color: '#9C8366' }
            ]}
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Jupiter"} isPaused={isPaused} 
          />

          <Planet name="Saturn" distance={140} startAngle={5.5} orbitSpeed={0.2} size={3.8} hasRings={true} ringColor="#C3A675" tilt={0.5}
             proceduralType="gas"
             proceduralColors={[
                { offset: 0.0, color: '#C8B382' },
                { offset: 0.4, color: '#E6D6AD' },
                { offset: 0.7, color: '#C8B382' },
                { offset: 1.0, color: '#A89060' }
            ]}
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Saturn"} isPaused={isPaused} 
          />

          <Planet name="Uranus" color="#93B8BE" distance={180} startAngle={0.5} orbitSpeed={0.1} size={2.5} 
            hasRings={true} ringColor="#ffffff" tilt={1.5} 
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Uranus"} isPaused={isPaused} 
          />

          <Planet name="Neptune" distance={220} startAngle={2} orbitSpeed={0.08} size={2.4} 
            proceduralType="noise" noiseBase="#3E54E8" noiseSecond="#2a3b9c"
            onPlanetClick={setFocusedPlanet} isActive={focusedPlanet?.name === "Neptune"} isPaused={isPaused} 
          />

        </Suspense>

        <OrbitControls 
          enablePan={false} 
          minDistance={3} 
          maxDistance={600} 
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