'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Blayne's Consulting — interactive "Neural Gem" hero animation.
 *
 * A faceted crystal boundary (matches the brand reference silhouette: short
 * flat top, hexagonal waist, elongated point at the bottom) containing a
 * tangled wireframe network and a glowing ember core, styled in Blayne's
 * brand palette (Jordy Blue / Delft Blue / Pumpkin / Maize).
 *
 * Install:
 *   npm i three @react-three/fiber @react-three/drei @react-three/postprocessing
 *
 * Note: `mergeGeometries` moved from `mergeBufferGeometries` in three r150+.
 * If your `three` version predates that, import `mergeBufferGeometries`
 * instead and rename the call below.
 *
 * Usage:
 *   <div style={{ width: 480, height: 480 }}>
 *     <BlayneNeuralGem />
 *   </div>
 */

// ---------- Brand palette (blayne-brand-guidelines) ----------
const JORDY_BLUE = '#78B3F5';
const DELFT_BLUE = '#3A405A';
const MAIZE = '#FFF275';
const PUMPKIN = '#FF8C42';

// ---------- Gem boundary dimensions (shared by shape + interior clipping) ----------
const RADIUS = 1;
const TOP_H = 0.55;
const BOTTOM_H = 1.5;
const SIDES = 6;

// Point-in-gem test: the gem is two cones (bipyramid) glued at a hexagonal
// waist, so "inside" just means "inside whichever cone owns this y".
function isInsideGem(x, y, z, shrink = 1) {
  const r = Math.hypot(x, z);
  if (y >= 0) {
    const h = TOP_H * shrink;
    if (y > h) return false;
    return r <= RADIUS * shrink * (1 - y / h);
  }
  const ay = -y;
  const h = BOTTOM_H * shrink;
  if (ay > h) return false;
  return r <= RADIUS * shrink * (1 - ay / h);
}

function buildGemGeometry() {
  const top = new THREE.ConeGeometry(RADIUS, TOP_H, SIDES, 1, false);
  top.translate(0, TOP_H / 2, 0);

  const bottom = new THREE.ConeGeometry(RADIUS, BOTTOM_H, SIDES, 1, false);
  bottom.rotateX(Math.PI);
  bottom.translate(0, -BOTTOM_H / 2, 0);

  return mergeGeometries([top, bottom]);
}

function uniqueVertices(edgesGeo, precision = 3) {
  const pos = edgesGeo.attributes.position;
  const map = new Map();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const key = `${x.toFixed(precision)}_${y.toFixed(precision)}_${z.toFixed(precision)}`;
    if (!map.has(key)) map.set(key, [x, y, z]);
  }
  return Array.from(map.values());
}

// The chaotic "tangled thread ball" inside the gem, built from randomly
// placed points (rejection-sampled to stay inside the boundary) connected
// to their nearest neighbors.
function buildTangleNetwork(count = 100, shrink = 0.88) {
  const points = [];
  let attempts = 0;
  while (points.length < count && attempts < count * 50) {
    attempts++;
    const x = (Math.random() * 2 - 1) * RADIUS;
    const z = (Math.random() * 2 - 1) * RADIUS;
    const y = (Math.random() * 2 - 1) * Math.max(TOP_H, BOTTOM_H);
    if (isInsideGem(x, y, z, shrink)) points.push(new THREE.Vector3(x, y, z));
  }

  const cJordy = new THREE.Color(JORDY_BLUE);
  const cDelft = new THREE.Color(DELFT_BLUE);
  const segments = [];
  const colors = [];
  const seen = new Set();

  points.forEach((p, i) => {
    const nearest = points
      .map((q, j) => [j === i ? Infinity : p.distanceTo(q), j])
      .sort((a, b) => a[0] - b[0])
      .slice(0, 2);

    nearest.forEach(([, j]) => {
      const key = i < j ? `${i}_${j}` : `${j}_${i}`;
      if (seen.has(key)) return;
      seen.add(key);
      const q = points[j];
      segments.push(p.x, p.y, p.z, q.x, q.y, q.z);
      const t = Math.random();
      const c1 = cJordy.clone().lerp(cDelft, t);
      const c2 = cJordy.clone().lerp(cDelft, 1 - t);
      colors.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b);
    });
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}

// The glowing ember cluster, offset slightly off-center like the reference
// video's light source, in the warm accent pair (Pumpkin / Maize).
function buildEmberField(count = 40, center = new THREE.Vector3(0.05, -0.15, 0.1)) {
  const cPumpkin = new THREE.Color(PUMPKIN);
  const cMaize = new THREE.Color(MAIZE);
  const positions = [];
  const colors = [];

  for (let i = 0; i < count; i++) {
    let x = 0;
    let y = 0;
    let z = 0;
    let attempts = 0;
    do {
      x = center.x + (Math.random() - 0.5) * 0.5;
      y = center.y + (Math.random() - 0.5) * 0.5;
      z = center.z + (Math.random() - 0.5) * 0.5;
      attempts++;
    } while (!isInsideGem(x, y, z, 0.8) && attempts < 30);
    positions.push(x, y, z);
    const c = cPumpkin.clone().lerp(cMaize, Math.random());
    colors.push(c.r, c.g, c.b);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}

function GemOrb({ spin }) {
  const groupRef = useRef(null);
  const coreRef = useRef(null);
  const emberMatRef = useRef(null);
  const glowRef = useRef(1);
  const [hovered, setHovered] = useState(false);

  const gemGeometry = useMemo(() => buildGemGeometry(), []);
  const edgesGeometry = useMemo(() => new THREE.EdgesGeometry(gemGeometry, 1), [gemGeometry]);
  const vertexPositions = useMemo(() => uniqueVertices(edgesGeometry), [edgesGeometry]);
  const tangleGeometry = useMemo(() => buildTangleNetwork(100, 0.88), []);
  const emberGeometry = useMemo(() => buildEmberField(40), []);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.06 * spin;
    }

    const target = hovered ? 1.6 : 1;
    glowRef.current += (target - glowRef.current) * Math.min(1, delta * 3);
    const breathe = 1 + Math.sin(state.clock.elapsedTime * 1.4) * 0.12;

    if (coreRef.current) {
      coreRef.current.scale.setScalar(0.85 * glowRef.current * breathe);
    }
    if (emberMatRef.current) {
      emberMatRef.current.size = 0.05 * glowRef.current * breathe;
    }
  });

  return (
    <group ref={groupRef}>
      {/* invisible hover target sized to the gem's bounding sphere */}
      <mesh onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
        <sphereGeometry args={[1.3, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* faceted gem boundary (matches the reference silhouette) */}
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color={JORDY_BLUE} transparent opacity={0.85} />
      </lineSegments>

      {/* boundary vertex nodes */}
      {vertexPositions.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color={DELFT_BLUE} />
        </mesh>
      ))}

      {/* tangled interior thread network, clipped inside the gem */}
      <lineSegments geometry={tangleGeometry}>
        <lineBasicMaterial vertexColors transparent opacity={0.55} />
      </lineSegments>

      {/* ember glow field */}
      <points geometry={emberGeometry}>
        <pointsMaterial
          ref={emberMatRef}
          size={0.05}
          vertexColors
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* central glow core */}
      <mesh ref={coreRef} position={[0.05, -0.15, 0.1]}>
        <icosahedronGeometry args={[0.16, 1]} />
        <meshBasicMaterial color={PUMPKIN} toneMapped={false} />
      </mesh>

      {/* faint outer guide ring, echoing the concentric circle in the reference */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.9, 0.004, 8, 96]} />
        <meshBasicMaterial color={JORDY_BLUE} transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

export default function BlayneNeuralGem({ style, className, spin = 1 }) {
  return (
    <div className={className} style={{ width: '100%', height: '100%', minHeight: 360, ...style }}>
      <Canvas camera={{ position: [0, 0.15, 4.2], fov: 40 }} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.5} />
        <GemOrb spin={spin} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.5}
        />
        <EffectComposer>
          <Bloom intensity={1.2} luminanceThreshold={0.15} luminanceSmoothing={0.4} mipmapBlur radius={0.8} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
