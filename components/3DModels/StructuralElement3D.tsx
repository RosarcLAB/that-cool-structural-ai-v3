// components/structuralEngineering/StructuralElement3D.tsx

import React, { useRef, useState } from 'react';
import { Mesh } from 'three';
import { Text } from '@react-three/drei';
import { Element } from '../../customTypes/structuralElement';
import { ThreeEvent } from '@react-three/fiber';
import { Node3D, Element3D, calculateMidpoint, calculateRotationFromNodes } from './types3D';

interface StructuralElement3DProps {
  element: Element;
  position?: [number, number, number];
  startNode?: Node3D;
  endNode?: Node3D;
  isSelected?: boolean;
  onSelect?: (element: Element) => void;
  onContextMenu?: (element: Element, event: ThreeEvent<MouseEvent>) => void;
  showNodes?: boolean;
}

const StructuralElement3D: React.FC<StructuralElement3DProps> = ({ 
  element, 
  position = [0, 0, 0],
  startNode,
  endNode,
  isSelected = false,
  onSelect,
  onContextMenu,
  showNodes = true,
}) => {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Calculate position and rotation from nodes if provided
  const elementPosition = (startNode && endNode) 
    ? calculateMidpoint(startNode, endNode)
    : position;
    
  const rotationAngle = (startNode && endNode)
    ? calculateRotationFromNodes(startNode, endNode)
    : 0;

  // Get dimensions from element properties
  const span = element.span || 3;
  const sectionHeight = element.sections?.[0]?.d ? element.sections[0].d / 1000 : 0.24; // Convert mm to meters
  const sectionWidth = element.sections?.[0]?.b ? element.sections[0].b / 1000 : 0.045; // Convert mm to meters

  // Color coding based on element type
  const getElementColor = () => {
    if (isSelected) return '#8b5cf6'; // purple when selected
    if (hovered) return '#ffffff'; // white when hovered
    
    switch (element.type) {
      case 'Beam': return '#3b82f6'; // blue
      case 'Joist': return '#10b981'; // green
      case 'Column': return '#ef4444'; // red
      case 'Lintel': return '#f59e0b'; // amber
      default: return '#6b7280'; // gray
    }
  };

  // All elements render horizontally (along X-axis) by default
  const isVertical = false;

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (onSelect) {
      onSelect(element);
    }
  };

  const handleContextMenu = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (onContextMenu) {
      onContextMenu(element, event);
    }
  };

  return (
    <group position={elementPosition} rotation={[0, rotationAngle, 0]}>
      {/* Main structural element mesh */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        rotation={isVertical ? [0, 0, Math.PI / 2] : [0, 0, 0]}
      >
        <boxGeometry args={isVertical ? [sectionHeight, sectionWidth, span] : [span, sectionHeight, sectionWidth]} />
        <meshStandardMaterial 
          color={getElementColor()} 
          metalness={0.3}
          roughness={0.6}
          emissive={isSelected ? '#8b5cf6' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>

      {/* Selection outline */}
      {isSelected && (
        <mesh
          rotation={isVertical ? [0, 0, Math.PI / 2] : [0, 0, 0]}
        >
          <boxGeometry args={isVertical 
            ? [sectionHeight * 1.1, sectionWidth * 1.1, span * 1.02] 
            : [span * 1.02, sectionHeight * 1.1, sectionWidth * 1.1]} 
          />
          <meshBasicMaterial 
            color="#8b5cf6" 
            transparent 
            opacity={0.2}
            wireframe
          />
        </mesh>
      )}

      {/* Node indicators at element ends */}
      {showNodes && (
        <>
          {/* Start node */}
          <mesh
            position={isVertical 
              ? [0, 0, -span / 2]
              : [-span / 2, 0, 0]
            }
          >
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial 
              color="#fbbf24" 
              emissive="#f59e0b"
              emissiveIntensity={0.3}
              metalness={0.5}
              roughness={0.5}
            />
          </mesh>

          {/* End node */}
          <mesh
            position={isVertical 
              ? [0, 0, span / 2]
              : [span / 2, 0, 0]
            }
          >
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial 
              color="#fbbf24" 
              emissive="#f59e0b"
              emissiveIntensity={0.3}
              metalness={0.5}
              roughness={0.5}
            />
          </mesh>
        </>
      )}

      {/* Support indicators */}
      {element.supports?.map((support, idx) => {
        // Handle both legacy number and new Coordinate type
        const supportPos = typeof support.position === 'number' 
          ? support.position 
          : support.position.x;
        const supportOffsetY = typeof support.position === 'number' 
          ? 0 
          : (support.position.y || 0);
        const supportOffsetZ = typeof support.position === 'number' 
          ? 0 
          : (support.position.z || 0);
        const positionRatio = supportPos / span;
        
        // Support colors based on fixity
        const getSupportColor = () => {
          switch (support.fixity) {
            case 'Fixed': return '#dc2626';
            case 'Pinned': return '#fbbf24';
            case 'Roller': return '#10b981';
            default: return '#6b7280';
          }
        };

        return (
          <group key={idx}>
            {/* Support sphere */}
            <mesh
              position={isVertical 
                ? [supportOffsetY, supportOffsetZ, (positionRatio - 0.5) * span]
                : [(positionRatio - 0.5) * span, -sectionHeight / 2 - 0.1 + supportOffsetY, supportOffsetZ]
              }
            >
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshStandardMaterial 
                color={getSupportColor()}
                emissive={support.fixity === 'Fixed' ? '#dc2626' : '#000000'}
                emissiveIntensity={0.2}
              />
            </mesh>

            {/* Support base (cone for direction) */}
            <mesh
              position={isVertical 
                ? [supportOffsetY, supportOffsetZ, (positionRatio - 0.5) * span]
                : [(positionRatio - 0.5) * span, -sectionHeight / 2 - 0.25 + supportOffsetY, supportOffsetZ]
              }
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <coneGeometry args={[0.12, 0.15, 8]} />
              <meshStandardMaterial 
                color={getSupportColor()}
                transparent
                opacity={0.6}
              />
            </mesh>
          </group>
        );
      })}

      {/* Element label */}
      <Text
        position={[0, sectionHeight + 0.3, 0]}
        fontSize={0.15}
        color={isSelected ? '#8b5cf6' : '#1f2937'}
        anchorX="center"
        anchorY="middle"
      >
        {element.name}
      </Text>

      {/* Section name label */}
      <Text
        position={[0, sectionHeight + 0.15, 0]}
        fontSize={0.1}
        color="#6b7280"
        anchorX="center"
        anchorY="middle"
      >
        {element.sectionName}
      </Text>
    </group>
  );
};

export default StructuralElement3D;
