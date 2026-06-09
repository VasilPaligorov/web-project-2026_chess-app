// @ts-nocheck
import React from 'react'
import type { FC } from 'react'

import { useGLTF } from '@react-three/drei'
import type * as THREE from 'three'
import type { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    Object001: THREE.Mesh
  }
  materials: {
    [`Object001_mtl.003`]: THREE.MeshStandardMaterial
  }
}

interface PieceProps {
  color: 'white' | 'black';
}

export const PawnModel: FC<PieceProps> = ({ color }) => {
  const { nodes } = useGLTF(`/models/pawn.gltf`) as unknown as GLTFResult
  
  return (
    <mesh 
      geometry={nodes.Object001.geometry} 
      
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

useGLTF.preload(`/models/pawn.gltf`)
