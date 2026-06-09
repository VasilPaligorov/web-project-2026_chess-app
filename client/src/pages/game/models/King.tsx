// @ts-nocheck
import React from 'react'
import type { FC } from 'react'
import { useGLTF } from '@react-three/drei'

interface PieceProps {
  color: 'white' | 'black';
}

export const KingComponent: FC<PieceProps> = ({ color }) => {
  const { nodes } = useGLTF(`/models/king.gltf`)
  
  const geometry = nodes.Object001?.geometry || Object.values(nodes).find(n => n.type === 'Mesh')?.geometry

  return (
    <mesh 
      geometry={geometry} 
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
useGLTF.preload(`/models/king.gltf`)
