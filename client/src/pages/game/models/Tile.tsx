// @ts-nocheck
import React from 'react'
import type { FC } from 'react'
import { useSpring, animated } from '@react-spring/three'

const getColor = (color: string, canMoveHere: boolean) => {
  if (canMoveHere) return `#ff0101`
  if (color === `white`) return `#aaaaaa`
  if (color === `black`) return `#5a5a5a`
  return `purple`
}

const getEmissive = (color: string, canMoveHere: boolean) => {
  if (canMoveHere && color === `white`) return `#ff0000`
  if (canMoveHere && color === `black`) return `#c50000`
  return `black`
}

export const TileMaterial: FC<any> = ({ color, canMoveHere, ...props }) => {
  const { tileColor, emissiveColor } = useSpring({
    tileColor: getColor(color as string, !!canMoveHere),
    emissiveColor: getEmissive(color as string, !!canMoveHere),
  })
  return (
    <animated.meshPhysicalMaterial
      reflectivity={3}
      color={tileColor}
      emissive={emissiveColor}
      metalness={0.8}
      roughness={0.7}
      envMapIntensity={0.15}
      attach="material"
      {...props}
    />
  )
}

export const TileComponent: FC<any> = ({ color, canMoveHere, ...props }) => {
  return (
    <mesh scale={[1, 0.5, 1]} receiveShadow castShadow {...props}>
      <boxGeometry />
      <TileMaterial color={color} canMoveHere={canMoveHere} />
    </mesh>
  )
}
