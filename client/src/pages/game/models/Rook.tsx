// @ts-nocheck
import type { FC } from 'react'
import React from 'react'
import { useGLTF } from '@react-three/drei'

interface PieceProps {
  color: 'white' | 'black';
}

export const RookComponent: FC<PieceProps> = ({ color }) => {
  const { nodes } = useGLTF(`/models/rook.gltf`)
  
  return (
    <mesh 
      geometry={nodes.Object001001.geometry} 
      scale={[0.15, 0.15, 0.15]} 
      position={[0, 0, 0]}
    >
      <meshStandardMaterial 
        color={color === 'white' ? '#f5f5f5' : '#1a1a1a'} 
        roughness={0.2} 
        metalness={0.1} 
      />
    </mesh>
  )
}
useGLTF.preload(`/models/rook.gltf`)
