import React, { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";

// --- NO TEXTURES, JUST COLORS ---
const SOLAR_SYSTEM = [
  { name: "Mercury", diameter: 1, distance: 20, speed: 0.04, color: "#A5A5A5" },
  { name: "Venus", diameter: 2.2, distance: 35, speed: 0.015, color: "#E3BB76" },
  { name: "Earth", diameter: 2.5, distance: 55, speed: 0.01, color: "#2233FF" }, // Blue
  { name: "Mars", diameter: 1.5, distance: 75, speed: 0.008, color: "#E27B58" }, // Red
  { name: "Jupiter", diameter: 7, distance: 110, speed: 0.002, color: "#C99039" },
  { name: "Saturn", diameter: 6, distance: 150, speed: 0.0018, color: "#EAD6B8", ring: true },
  { name: "Uranus", diameter: 4, distance: 190, speed: 0.001, color: "#D1F7FF" },
  { name: "Neptune", diameter: 3.8, distance: 220, speed: 0.0009, color: "#5B5DDF" }
];

function Sun() {
  return (
    <mesh>
      <sphereGeometry args={[8, 32, 32]} />
      <meshBasicMaterial color="#FFCC00" />
    </mesh>
  );
}

function Planet({ planet }) {
  const ref = useRef();
  const startAngle = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const angle = startAngle + t * planet.speed;
    ref.current.position.x = Math.sin(angle) * planet.distance;
    ref.current.position.z = Math.cos(angle) * planet.distance;
  });

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[planet.diameter, 32, 32]} />
        <meshStandardMaterial color={planet.color} />
      </mesh>
      {planet.ring && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[8, 12, 32]} />
          <meshBasicMaterial color="#CDBA96" side={2} transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

export default function App() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "black" }}>
      <Canvas camera={{ position: [0, 100, 200], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[0, 0, 0]} intensity={2} />
        <Stars />
        <OrbitControls />
        
        <Sun />
        {SOLAR_SYSTEM.map((planet) => (
          <Planet key={planet.name} planet={planet} />
        ))}
      </Canvas>
      <div style={{position: 'absolute', top: 20, left: 20, color: 'white'}}>
        <h1>Debug Mode: Colors Only</h1>
        <p>If you see this, your App works!</p>
      </div>
    </div>
  );
}
