export default function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.4} />

      <directionalLight
        position={[10, 15, 10]}
        intensity={2.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />

      <directionalLight
        position={[-10, 5, -5]}
        intensity={0.8}
      />

      <pointLight 
        position={[0, 8, 0]} 
        intensity={0.5} 
        distance={20} 
      />

      <spotLight
        position={[0, 10, 0]}
        angle={0.5}
        penumbra={1}
        intensity={1}
        castShadow
      />
    </>
  );
}
