// components/3DModels/Node3DComponent.tsx
// Visual representation of a node in 3D space

import React, { useRef, useState } from 'react';
import { Mesh } from 'three';
import { Text } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { Node3D } from './types3D';

interface Node3DComponentProps {
  node: Node3D;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: (node: Node3D, event: ThreeEvent<MouseEvent>) => void;
  onHover?: (node: Node3D, hovered: boolean) => void;
  showLabel?: boolean;
  color?: string;
  size?: number;
}

const Node3DComponent: React.FC<Node3DComponentProps> = ({
  node,
  isSelected = false,
  isHovered = false,
  onClick,
  onHover,
  showLabel = true,
  color,
  size = 0.06, // Default node size
}) => {
  const meshRef = useRef<Mesh>(null);
  const [localHovered, setLocalHovered] = useState(false);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onClick?.(node, event);
  };

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setLocalHovered(true);
    onHover?.(node, true);
  };

  const handlePointerOut = () => {
    setLocalHovered(false);
    onHover?.(node, false);
  };

  // Determine node color based on state
  const getNodeColor = (): string => {
    if (color) return color;
    if (isSelected) return '#4CAF50'; // Green when selected
    if (isHovered || localHovered) return '#2196F3'; // Blue when hovered
    if (node.isFixed) return '#F44336'; // Red if fixed/support
    if (node.connectedElementIds.length > 0) return '#FF9800'; // Orange if connected
    return '#9E9E9E'; // Gray if isolated
  };

  // Calculate node scale based on state
  const getScale = (): number => {
    if (isSelected) return 1.5;
    if (isHovered || localHovered) return 1.3;
    return 1.0;
  };

  const nodeColor = getNodeColor();
  const scale = getScale();

  return (
    <group position={node.position}>
      {/* Node sphere */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        scale={scale}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial 
          color={nodeColor}
          metalness={0.3}
          roughness={0.4}
          emissive={nodeColor}
          emissiveIntensity={isSelected ? 0.3 : 0.1}
        />
      </mesh>

      {/* Fixed/Support indicator (small cone above node) */}
      {node.isFixed && (
        <mesh position={[0, size * 1.5, 0]} rotation={[0, 0, 0]}>
          <coneGeometry args={[size * 0.8, size * 1.5, 4]} />
          <meshStandardMaterial 
            color="#F44336"
            metalness={0.3}
            roughness={0.4}
          />
        </mesh>
      )}

      {/* Node label */}
      {showLabel && node.name && (isSelected || isHovered || localHovered) && (
        <Text
          position={[0, size * 2.5, 0]}
          fontSize={0.08}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.005}
          outlineColor="#000000"
        >
          {node.name}
        </Text>
      )}

      {/* Connection count indicator */}
      {(isSelected || isHovered || localHovered) && node.connectedElementIds.length > 0 && (
        <Text
          position={[0, -size * 2, 0]}
          fontSize={0.06}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.003}
          outlineColor="#000000"
        >
          {`${node.connectedElementIds.length} element${node.connectedElementIds.length > 1 ? 's' : ''}`}
        </Text>
      )}
    </group>
  );
};

export default Node3DComponent;
