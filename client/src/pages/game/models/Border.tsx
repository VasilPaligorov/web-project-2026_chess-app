// @ts-nocheck
import React from 'react'
import type { FC } from 'react'

export const BorderMaterial = ({ ...props }: any) => (
  <meshPhysicalMaterial
    reflectivity={3}
    color="#c6c6c6"
    emissive="#323232"
    metalness={0.8}
    roughness={0.7}
    envMapIntensity={0.15}
    clearcoat={1}
    clearcoatRoughness={0.1}
    attach="material"
    {...props}
  />
);

export const Border: FC = () => {
  return (
    <mesh onClick={(e) => e.stopPropagation()} receiveShadow position={[3.5, -0.35, 3.5]}>
      <boxGeometry attach="geometry" args={[9, 0.5, 9]} />
      <BorderMaterial />
    </mesh>
  )
}
