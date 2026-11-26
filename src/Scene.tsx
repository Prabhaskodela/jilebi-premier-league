import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Html, OrbitControls, Sky, Stars } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

function Player({ position, color, label, active = false }: { position: [number, number, number]; color: string; label?: string; active?: boolean }) {
  const group = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (!group.current) return
    group.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.025
  })
  return <group ref={group} position={position}>
    <mesh position={[0, .85, 0]} castShadow><capsuleGeometry args={[.22, .65, 4, 8]} /><meshStandardMaterial color={color} roughness={.7} /></mesh>
    <mesh position={[0, 1.42, 0]} castShadow><sphereGeometry args={[.22, 16, 12]} /><meshStandardMaterial color="#d7a782" /></mesh>
    <mesh position={[-.17, .42, 0]} castShadow><boxGeometry args={[.14, .48, .16]} /><meshStandardMaterial color="#f5f1e8" /></mesh>
    <mesh position={[.17, .42, 0]} castShadow><boxGeometry args={[.14, .48, .16]} /><meshStandardMaterial color="#f5f1e8" /></mesh>
    {active && label && <Html position={[0, 1.85, 0]} center distanceFactor={14}><span className="player-tag">{label}</span></Html>}
  </group>
}

function Ground({ ball, swing }: { ball: [number, number, number]; swing: number }) {
  const grass = useMemo(() => new THREE.CanvasTexture((() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#347c48'; ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 1800; i++) { ctx.fillStyle = i % 2 ? '#408b50' : '#286b3d'; ctx.globalAlpha = Math.random() * .23; ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 9) }
    ctx.globalAlpha = 1; return c
  })()), [])
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.08, 0]} receiveShadow><circleGeometry args={[28, 80]} /><meshStandardMaterial map={grass} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.02, 0]}><circleGeometry args={[19, 80]} /><meshStandardMaterial color="#3d8a4d" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .005, 0]}><planeGeometry args={[4, 22]} /><meshStandardMaterial color="#b89a68" roughness={1} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .016, 0]}><planeGeometry args={[2.2, 20]} /><meshStandardMaterial color="#c9ac7c" roughness={1} /></mesh>
    {[-9, 9].map(z => <group key={z} position={[0, .12, z]}>
      {[-.32, 0, .32].map(x => <mesh key={x} position={[x, .72, 0]} castShadow><cylinderGeometry args={[.045, .055, 1.42, 10]} /><meshStandardMaterial color="#eee8d5" /></mesh>)}
      <mesh position={[0, 1.4, 0]}><boxGeometry args={[.9, .08, .12]} /><meshStandardMaterial color="#f2e5bd" /></mesh>
    </group>)}
    {Array.from({ length: 11 }, (_, i) => { const a = i / 11 * Math.PI * 2; return <Player key={i} position={[Math.cos(a) * 13, 0, Math.sin(a) * 11]} color={i % 2 ? '#e9eee5' : '#c69d31'} /> })}
    <Player position={[0, 0, 7]} color="#f2ce38" label="BATTER" active />
    <Player position={[0, 0, -7]} color="#3980d7" label="BOWLER" active />
    <mesh position={ball} castShadow><sphereGeometry args={[.19, 24, 16]} /><meshStandardMaterial color="#d93b34" roughness={.38} metalness={.12} /></mesh>
    <group position={[0, .05, 0]} rotation={[0, 0, swing]}><mesh position={[.45, .8, 7]} rotation={[0, 0, -.45]} castShadow><boxGeometry args={[.19, 1.55, .11]} /><meshStandardMaterial color="#c9914e" /></mesh></group>
    {Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 25, 2.2, Math.sin(a) * 25]}><boxGeometry args={[.28, 3.5, .28]} /><meshStandardMaterial color="#23483a" /></mesh> })}
  </>
}

export function Scene({ ball, swing }: { ball: [number, number, number]; swing: number }) {
  return <Canvas shadows camera={{ position: [0, 19, 25], fov: 42 }} dpr={[1, 1.6]}>
    <color attach="background" args={['#122a26']} /><fog attach="fog" args={['#122a26', 35, 75]} />
    <ambientLight intensity={1.1} /><directionalLight position={[9, 18, 5]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]} />
    <Sky sunPosition={[30, 12, 0]} turbidity={8} rayleigh={.8} /><Stars radius={65} depth={25} count={500} factor={2} fade />
    <Ground ball={ball} swing={swing} /><Environment preset="city" />
    <OrbitControls enablePan={false} minDistance={19} maxDistance={40} maxPolarAngle={Math.PI / 2.12} target={[0, 0, 0]} />
  </Canvas>
}

