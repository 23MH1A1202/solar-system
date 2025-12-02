import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import "./App.css";

function App() {
  const mountRef = useRef(null);
  const [selectedPlanet, setSelectedPlanet] = useState(null);

  useEffect(() => {
    const mount = mountRef.current;

    // === Scene Setup ===
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      1,
      5000
    );

    camera.position.set(0, 20, 80);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);

    // === Orbit Controls (Mobile Friendly) ===
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // === Light ===
    const light = new THREE.PointLight(0xffffff, 3);
    light.position.set(0, 0, 0);
    scene.add(light);

    // === Texture Loader ===
    const loader = new THREE.TextureLoader();

    // Function to load planet
    const createPlanet = (file, size, distance, speed, name, extra = null) => {
      const geo = new THREE.SphereGeometry(size, 64, 64);
      const mat = new THREE.MeshStandardMaterial({
        map: loader.load(`/textures/${file}`)
      });
      const mesh = new THREE.Mesh(geo, mat);

      // Orbit group for movement
      const group = new THREE.Group();
      group.add(mesh);
      mesh.position.x = distance;

      // Extra (like clouds)
      if (extra === "earthClouds") {
        const cloudGeo = new THREE.SphereGeometry(size + 0.5, 64, 64);
        const cloudMat = new THREE.MeshStandardMaterial({
          map: loader.load("/textures/2k_earth_clouds.jpg"),
          transparent: true,
          opacity: 0.9,
        });
        const clouds = new THREE.Mesh(cloudGeo, cloudMat);
        mesh.add(clouds);
        mesh.clouds = clouds;
      }

      scene.add(group);

      return { mesh, group, speed, name };
    };

    // === Create Planets ===
    const planets = [
      createPlanet("2k_mercury.jpg", 2, 12, 0.04, "Mercury"),
      createPlanet("2k_venus_surface.jpg", 4, 18, 0.03, "Venus"),
      createPlanet(
        "2k_earth_surface.jpg",
        5,
        24,
        0.025,
        "Earth",
        "earthClouds"
      ),
      createPlanet("2k_mars.jpg", 4, 30, 0.02, "Mars"),
      createPlanet("2k_jupiter.jpg", 10, 40, 0.015, "Jupiter"),
      createPlanet("2k_saturn.jpg", 9, 55, 0.01, "Saturn"),
      createPlanet("2k_uranus.jpg", 7, 65, 0.008, "Uranus"),
      createPlanet("2k_neptune.jpg", 7, 75, 0.007, "Neptune"),
    ];

    // === Sun ===
    const sunTexture = loader.load("/textures/sun.jpg");
    const sunGeo = new THREE.SphereGeometry(12, 64, 64);
    const sunMat = new THREE.MeshBasicMaterial({ map: sunTexture });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sun);

    // === Animation ===
    function animate() {
      requestAnimationFrame(animate);

      planets.forEach((p) => {
        p.group.rotation.y += p.speed;
        p.mesh.rotation.y += 0.004;

        if (p.mesh.clouds) p.mesh.clouds.rotation.y += 0.002;
      });

      sun.rotation.y += 0.002;

      controls.update();
      renderer.render(scene, camera);
    }

    animate();

    // === Resize Handler ===
    const handleResize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      mount.removeChild(renderer.domElement);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="App">
      <div className="canvas-container" ref={mountRef}></div>

      {/* Trending Bottom Card */}
      <div className="bottom-card">
        {selectedPlanet ? (
          <>
            <h3>{selectedPlanet.name}</h3>
            <p>Distance from Sun: {selectedPlanet.distance} M km</p>
            <p>Diameter: {selectedPlanet.diameter} km</p>
          </>
        ) : (
          <p className="placeholder">Tap any planet to see details</p>
        )}
      </div>
    </div>
  );
}

export default App;