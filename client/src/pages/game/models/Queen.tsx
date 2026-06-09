// @ts-nocheck
import type { FC } from 'react'
import React from 'react'

import { useGLTF } from '@react-three/drei'
import type * as THREE from 'three'
import type { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    Object001003: THREE.Mesh
  }
  materials: {
    [`Object001_mtl.003`]: THREE.MeshStandardMaterial
  }
}

interface PieceProps {
  color: 'white' | 'black';
}

export const QueenComponent: FC<PieceProps> = ({ color }) => {
  const { nodes } = useGLTF(`/models/queen.gltf`)
  
  return (
    <mesh 
      geometry={nodes.Object001003.geometry} 
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

useGLTF.preload(`/models/queen.gltf`)
