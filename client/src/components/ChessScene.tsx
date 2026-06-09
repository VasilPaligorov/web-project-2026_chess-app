import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import SceneLights from './SceneLights';
import { Board3D } from '../pages/game/Board3D';
import styles from '../pages/game/GamePage.module.css';

interface ChessSceneProps {
  fen: string;
  onMove: (from: string, to: string) => void;
  myColor: 'white' | 'black';
  isMyTurn: boolean;
}

export default function ChessScene({ fen, onMove, myColor, isMyTurn }: ChessSceneProps) {
  return (
    <div className={styles['board-wrapper']}>
      <Canvas 
        camera={{ position: [0, 8, 8], fov: 55 }}
        gl={{ alpha: true, antialias: true }}
        shadows
      >
        <SceneLights />
        
        <Board3D 
          fen={fen} 
          onMove={onMove} 
          myColor={myColor} 
          isMyTurn={isMyTurn} 
        />

        <OrbitControls
          enablePan={false}
          minDistance={6}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2.1}
          enableDamping={true}
        />
      </Canvas>
    </div>
  );
}
