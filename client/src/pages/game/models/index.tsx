// @ts-nocheck
import React, { useRef } from 'react'
import type { FC } from 'react'
import { useSpring, animated } from '@react-spring/three'
import { motion } from 'framer-motion-3d'

export const PieceMaterial: FC<any> = ({ color, isSelected, pieceIsBeingReplaced, ...props }) => {
  const { opacity } = useSpring({ opacity: pieceIsBeingReplaced ? 0 : 1 })
  return (
    <animated.meshPhysicalMaterial
      reflectivity={4}
      color={color === `white` ? `#d9d9d9` : `#7c7c7c`}
      emissive={isSelected ? `#733535` : `#000000`}
      metalness={1}
      roughness={0.5}
      attach="material"
      envMapIntensity={0.2}
      opacity={opacity}
      transparent={true}
      {...props}
    />
  )
}

export const MeshWrapper: FC<any> = ({
  movingTo, finishMovingPiece, isSelected, children, pieceIsBeingReplaced, wasSelected, ...props
}) => {
  const ref = useRef(null)
  return (
    <group ref={ref} {...props} dispose={null} castShadow>
      <motion.mesh
        scale={0.03}
        castShadow={!pieceIsBeingReplaced}
        receiveShadow
        animate={{ y: isSelected ? 0.5 : 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        {children}
        <PieceMaterial color={props.color} pieceIsBeingReplaced={pieceIsBeingReplaced} isSelected={isSelected} />
      </motion.mesh>
    </group>
  )
}