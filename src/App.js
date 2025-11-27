import React, { useRef, useState, useEffect, Suspense, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Html, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

// --- 1. ASSETS ---
// Fix: Ensure we use the correct base path for GitHub Pages vs Localhost
const getPath = (file) => {
  const base = process.env.PUBLIC_URL || "";
  return `${base}/textures/${file}`;
};

const TEXTURES = {
  sun: getPath("sun.jpg"),
  mercury: getPath("2k_mercury.jpg"),
  venus: getPath("2k_venus_surface.jpg"),
  earth: getPath("earth_atmos_2048.jpg"),
  earthClouds: getPath("2k_earth_clouds.jpg"), // Ensure this file exists!
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
  Venus: { name: "Venus", diameter: "12,104 km", day: "243 days", temp: "464°C", info: "Hottest planet due to greenhouse effect." },
  Earth: { name: "Earth", diameter: "12,742 km", day: "24 hours", temp: "15°C", info: "The only known planet to support life." },
  Moon: { name: "The Moon", diameter: "3,474 km", day: "27.3 days", temp: "-53°C", info: "Earth's only natural satellite." },
  Mars: { name: "Mars", diameter: "6,779 km", day: "24.6 hours", temp: "-65°C", info: "The Red Planet, home to Olympus Mons." },
  Jupiter: { name: "Jupiter", diameter: "139,820 km", day: "9.9 hours", temp: "-110°C", info: "Largest planet, a gas giant with storms." },
  Saturn: { name: "Saturn", diameter: "116,460 km", day: "10.7 hours", temp: "-140°C", info: "Famous for its complex ring system." },
  Uranus: { name: "Uranus", diameter: "50,724 km", day: "17 hours", temp: "-195°C", info: "Rotates on its side with vertical rings." },
  Neptune: { name: "Neptune", diameter: "49,244 km", day: "16 hours", temp: "-200°C", info: "The windiest planet, deep blue ice giant." }
};

// --- 3. UI COMPONENT ---
function PlanetHUD({ focusedPlanet, onClose }) {
  const isMobile = window.innerWidth < 768;
  if (!focusedPlanet) return null;
  const data = PLANET_DATA[focusedPlanet.name];

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          initial={{ y: isMobile ? 100 : 0, x: isMobile ? 0 : 100, opacity: 0 }}
          animate={{ y: 0, x: 0, opacity: 1 }}
          exit={{ y: isMobile ? 100 : 0, x: isMobile ? 0 : 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
          style={{
            position: "absolute",
            bottom: isMobile ? "0" : "auto",
            top: isMobile ? "auto" : "10%",
            right: isMobile ? "0" : "20px",
            left: isMobile ? "0" : "auto",
            width: isMobile ? "100%" : "300px",
            maxHeight: isMobile ? "40vh" : "auto",
            background: "rgba(10, 12, 18, 0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: isMobile ? "20px 20px 0 0" : "16px",
            padding: "24px",
            color: "white",
            fontFamily: "'Inter', sans-serif",
            zIndex: 2000,
            boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
            boxSizing: "border-box"
          }}
        >
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "600", color: "#4db5ff", textTransform: "uppercase", letterSpacing: "1px" }}>
              {data.name}
            </h2>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#fff", fontSize: "24px", cursor: "pointer" }}>×</button>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
            <div>
              <div style={{ fontSize: "10px", color: "#888" }}>DIAMETER</div>
              <div style={{ fontSize: "13px" }}>{data.diameter}</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "#888" }}>TEMP</div>
              <div style={{ fontSize: "13px", color: "#ffaa55" }}>{data.temp}</div>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5", color: "#ccc" }}>
            {data.info}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- 4. VISUAL COMPONENTS ---

function AsteroidBelt() {
  const asteroidRef = useRef();
  const count = 4000; 
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const asteroids = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Radius 100-125 AU (Between Mars 90 and Jupiter 140)
      const radius = 100 + Math.random() * 25; 
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (Math.random() - 0.5) * 10; 
      
      const scaleX = Math.random() * 0.5 + 0.2;
      const scaleY = Math.random() * 0.5 + 0.2;
      const scaleZ = Math.random() * 0.5 + 0.2;

      temp.push({ x, y, z, scaleX, scaleY, scaleZ, rotation: Math.random() * Math.PI });
    }
    return temp;
  }, []);

  useEffect(() => {
    if (asteroidRef.current) {
      asteroids.forEach((data, i) => {
        dummy.position.set(data.x, data.y, data.z);
        dummy.rotation.set(data.rotation, data.rotation, data.rotation);
        dummy.scale.set(data.scaleX, data.scaleY, data.scaleZ);
        dummy.updateMatrix();
        asteroidRef.current.setMatrixAt(i, dummy.matrix);
      });
      asteroidRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [asteroids, dummy]);

  useFrame(() => {
    if (asteroidRef.current) {
      asteroidRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <instancedMesh ref={asteroidRef} args={[null, null, count]} frustumCulled={false}>
      <dodecahedronGeometry args={[0.2, 0]} /> 
      <meshStandardMaterial color="#888888" roughness={0.8} metalness={0.2} />
    </instancedMesh>
  );
}

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
      meshRef.current.material.uniforms.viewVector.value.copy(camera.position).normalize();
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[size * 1.2, 64, 64]} />
      <shaderMaterial
        attach="material"
        args={[{
            uniforms: uniforms,
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
            depthWrite: false
        }]}
      />
    </mesh>
  );
}

function Sun({ onPlanetClick }) {
  const meshRef = useRef();
  const texture = useTexture(TEXTURES.sun);
  const size = 8;
  useFrame(() => { if (meshRef.current) meshRef.current.rotation.y -= 0.002; });

  const handleClick = (e) => {
    e.stopPropagation();
    onPlanetClick({ name: "Sun", ref: meshRef, size: size });
  };

  return (
    <group>
      <mesh ref={meshRef} onClick={handleClick} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "auto")}>
        <sphereGeometry args={[size, 64, 64]} />
        <meshBasicMaterial map={texture} color="#ffffff" toneMapped={false} /> 
      </mesh>
      <SunGlow color="#FF8C00" size={size} />
      <pointLight intensity={5.0} distance={5000} decay={0} color="#ffddaa" />
    </group>
  );
}

function AnimatedStars() {
  const starsRef = useRef();
  useFrame(() => { if (starsRef.current) starsRef.current.rotation.y += 0.00005; });
  return <Stars ref={starsRef} radius={5000} depth={60} count={20000} factor={4} saturation={0} fade={false} speed={1} />;
}

function OrbitPath({ radius }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.2, radius + 0.2, 512]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.15} side={THREE.DoubleSide} />
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

// --- 5. PLANET COMPONENTS ---

function Moon({ size, distance, orbitSpeed, onPlanetClick }) {
  const moonRef = useRef();
  const texture = useTexture(TEXTURES.moon);
  const angleRef = useRef(Math.random() * Math.PI * 2);

  useFrame((state, delta) => {
    if (moonRef.current) {
      angleRef.current += delta * orbitSpeed * 0.1; 
      const x = Math.sin(angleRef.current) * distance;
      const z = Math.cos(angleRef.current) * distance;
      moonRef.current.position.set(x, 0, z);
      moonRef.current.rotation.y += 0.005;
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    onPlanetClick({ name: "Moon", ref: moonRef, size: size });
  };

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[distance - 0.02, distance + 0.02, 64]} />
        <meshBasicMaterial color="#555" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <group ref={moonRef}>
        <mesh onClick={handleClick} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "auto")} castShadow receiveShadow>
          <sphereGeometry args={[size, 32, 32]} />
          <meshStandardMaterial map={texture} metalness={0.1} roughness={0.8} />
        </mesh>
        <Hitbox size={size} onClick={handleClick} />
      </group>
    </group>
  );
}

// Safe wrapper for clouds
function PlanetClouds({ textureUrl, size }) {
  const texture = useTexture(textureUrl);
  const cloudsRef = useRef();
  useFrame(() => { if (cloudsRef.current) cloudsRef.current.rotation.y += 0.0015; });
  return (
    <mesh ref={cloudsRef} scale={[1.01, 1.01, 1.01]}>
      <sphereGeometry args={[size, 64, 64]} />
      <meshStandardMaterial map={texture} transparent={true} opacity={0.8} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
    </mesh>
  );
}

function SafeClouds({ textureUrl, size }) {
  return (
    <Suspense fallback={null}>
      <PlanetClouds textureUrl={textureUrl} size={size} />
    </Suspense>
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
  name, textureKey, distance, startAngle, orbitSpeed, size, 
  onPlanetClick, hasAtmosphere, hasClouds, hasRings, 
  ringTextureKey, isVerticalRing, tilt = 0, children 
}) {
  const orbitGroupRef = useRef();
  const spinMeshRef = useRef();
  const texture = useTexture(TEXTURES[textureKey] || TEXTURES.moon);
  const angleRef = useRef(startAngle); 

  useFrame((state, delta) => {
    if (orbitGroupRef.current) {
      angleRef.current += delta * orbitSpeed * 0.05; 
      const x = Math.sin(angleRef.current) * distance;
      const z = Math.cos(angleRef.current) * distance;
      orbitGroupRef.current.position.set(x, 0, z);
    }
    if (spinMeshRef.current) spinMeshRef.current.rotation.y += 0.005; 
  });

  const handleClick = (e) => {
    e.stopPropagation();
    onPlanetClick({ name, ref: orbitGroupRef, size });
  };

  return (
    <group>
      <OrbitPath radius={distance} />
      <group ref={orbitGroupRef}>
        <group rotation={[tilt, 0, isVerticalRing ? Math.PI / 2 : 0]}>
            <group ref={spinMeshRef}>
                <mesh onClick={handleClick} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "auto")} castShadow receiveShadow>
                  <sphereGeometry args={[size, 64, 64]} />
                  <meshStandardMaterial map={texture} metalness={0.2} roughness={0.8} />
                </mesh>
                {hasClouds && <SafeClouds textureUrl={TEXTURES.earthClouds} size={size} />}
                {hasAtmosphere && (
                  <mesh scale={[1.02, 1.02, 1.02]}>
                      <sphereGeometry args={[size, 64, 64]} />
                      <meshPhongMaterial color="#4da6ff" transparent opacity={0.2} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
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

// --- 6. CAMERA CONTROLLER ---
function CameraController({ focusedPlanet, setFocusedPlanet }) {
  const { camera, controls } = useThree();
  const isTransitioning = useRef(false);
  const isResetting = useRef(false);
  const previousTargetPos = useRef(new THREE.Vector3());

  useEffect(() => {
    if (focusedPlanet) {
      isTransitioning.current = true;
      isResetting.current = false;
    }
  }, [focusedPlanet]);

  useEffect(() => {
    const handleReset = () => { isResetting.current = true; setFocusedPlanet(null); };
    window.addEventListener('reset-camera', handleReset);
    return () => window.removeEventListener('reset-camera', handleReset);
  }, [setFocusedPlanet]);

  useFrame((state, delta) => {
    if (!controls) return;

    if (isResetting.current && !focusedPlanet) {
       const currentPos = camera.position.clone();
       const safeDist = 250;
       const targetDist = Math.max(currentPos.length(), safeDist);
       const homePos = currentPos.normalize().multiplyScalar(targetDist);
       if (homePos.y < 50) homePos.y = 50; 

       controls.target.lerp(new THREE.Vector3(0,0,0), 0.05);
       camera.position.lerp(homePos, 0.05);
       
       if (controls.target.distanceTo(new THREE.Vector3(0,0,0)) < 1) isResetting.current = false;
       controls.update();
       return;
    }

    if (focusedPlanet && focusedPlanet.ref.current) {
      const targetPos = new THREE.Vector3();
      focusedPlanet.ref.current.getWorldPosition(targetPos);

      const sunPos = new THREE.Vector3(0,0,0);
      const directionToSun = new THREE.Vector3().subVectors(sunPos, targetPos).normalize();
      const dist = focusedPlanet.name === "Sun" ? focusedPlanet.size * 4 : focusedPlanet.size * 5 + 15;
      const desiredCamPos = targetPos.clone().add(directionToSun.multiplyScalar(dist));
      desiredCamPos.y += focusedPlanet.size * 2; 

      if (isTransitioning.current) {
        controls.target.lerp(targetPos, 0.05);
        camera.position.lerp(desiredCamPos, 0.05);
        
        if (camera.position.distanceTo(desiredCamPos) < 0.5) {
          isTransitioning.current = false;
          previousTargetPos.current.copy(targetPos);
        }
      } else {
        const deltaMove = new THREE.Vector3().subVectors(targetPos, previousTargetPos.current);
        camera.position.add(deltaMove);
        controls.target.copy(targetPos); 
        previousTargetPos.current.copy(targetPos);
      }
      
      if (!isTransitioning.current && camera.position.distanceTo(targetPos) > dist + 60) {
        setFocusedPlanet(null);
      }
    } else {
      controls.target.lerp(new THREE.Vector3(0,0,0), 0.05);
      if (camera.position.length() < 80) {
          camera.position.lerp(camera.position.clone().normalize().multiplyScalar(120), 0.05);
      }
    }
    controls.update();
  }, 1);
  return null;
}

// --- 7. MAIN APP ---
export default function App() {
  const [focusedPlanet, setFocusedPlanet] = useState(null);

  const handlePlanetClick = (data) => {
    if (focusedPlanet && focusedPlanet.name === data.name) return;
    setFocusedPlanet(data);
  };

  const handleReturn = () => {
    window.dispatchEvent(new Event('reset-camera'));
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050508" }}>
      
      <div style={{ position: "absolute", top: 20, width: "100%", textAlign: "center", zIndex: 10, pointerEvents: "none" }}>
        <h1 style={{ color: "white", fontFamily: "'Inter', sans-serif", fontWeight: "200", letterSpacing: "10px", fontSize: "2rem", margin: 0, textShadow: "0 0 25px rgba(77, 181, 255, 0.4)" }}>
          SOLAR SYSTEM
        </h1>
      </div>

      {focusedPlanet && (
        <button onClick={handleReturn} style={{
            position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", zIndex: 20,
            padding: "14px 32px", background: "rgba(20, 20, 30, 0.85)", color: "#4db5ff", 
            border: "1px solid rgba(77, 181, 255, 0.4)", borderRadius: "40px", fontSize: "0.9rem", fontWeight: "bold", 
            backdropFilter: "blur(12px)", cursor: "pointer", letterSpacing: "1px", boxShadow: "0 0 20px rgba(0,0,0,0.6)"
          }}>
          RETURN TO ORBIT
        </button>
      )}

      <PlanetHUD focusedPlanet={focusedPlanet} onClose={handleReturn} />

      <Canvas camera={{ position: [0, 150, 200], fov: 45, far: 20000 }} dpr={[1, 2]} shadows>
        <ambientLight intensity={0.05} /> 
        <AnimatedStars />
        
        <Suspense fallback={<Html center><div style={{ color: 'white' }}>Loading Solar System...</div></Html>}>
          <Sun onPlanetClick={handlePlanetClick} />
          
          <Planet name="Mercury" textureKey="mercury" distance={30} startAngle={0} orbitSpeed={1.5} size={1.0} onPlanetClick={handlePlanetClick} />
          <Planet name="Venus" textureKey="venus" distance={45} startAngle={1} orbitSpeed={1.1} size={1.8} onPlanetClick={handlePlanetClick} />
          
          <Planet name="Earth" textureKey="earth" distance={65} startAngle={2} orbitSpeed={0.8} size={2.0} hasAtmosphere={true} hasClouds={true} onPlanetClick={handlePlanetClick}>
             <Moon size={0.5} distance={4} orbitSpeed={3.5} onPlanetClick={handlePlanetClick} />
          </Planet>

          <Planet name="Mars" textureKey="mars" distance={90} startAngle={3.5} orbitSpeed={0.6} size={1.4} onPlanetClick={handlePlanetClick} />
          <AsteroidBelt />
          <Planet name="Jupiter" textureKey="jupiter" distance={140} startAngle={4.2} orbitSpeed={0.3} size={5.0} onPlanetClick={handlePlanetClick} />
          <Planet name="Saturn" textureKey="saturn" distance={190} startAngle={5.5} orbitSpeed={0.2} size={4.2} hasRings={true} ringTextureKey="saturnRing" tilt={0.5} onPlanetClick={handlePlanetClick} />
          <Planet name="Uranus" textureKey="uranus" distance={240} startAngle={0.5} orbitSpeed={0.1} size={2.8} hasRings={true} ringTextureKey="uranus" isVerticalRing={true} tilt={0} onPlanetClick={handlePlanetClick} />
          <Planet name="Neptune" textureKey="neptune" distance={290} startAngle={2} orbitSpeed={0.08} size={2.8} onPlanetClick={handlePlanetClick} />
        </Suspense>

        <OrbitControls enablePan={false} minDistance={5} maxDistance={1200} enableDamping={true} dampingFactor={0.05} rotateSpeed={0.6} makeDefault />
        <CameraController focusedPlanet={focusedPlanet} setFocusedPlanet={setFocusedPlanet} />
      </Canvas>
      <Loader />
    </div>
  );
}


