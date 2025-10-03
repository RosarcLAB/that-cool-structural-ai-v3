// components/structuralEngineering/NodeVisualization.tsx
import React from 'react';
import { Element } from '../../customTypes/structuralElement';
import { Vector3 } from 'three';

interface NodeVisualizationProps {
  element: Element;
  position: [number, number, number];
}

const NodeVisualization: React.FC<NodeVisualizationProps> = ({ element, position }) => {
  const span = element.span || 3;
  const isVertical = element.type === 'Column';

  // Calculate node positions at element ends
  const getNodePositions = (): Vector3[] => {
    if (isVertical) {
      return [
        new Vector3(position[0], position[1] - span / 2, position[2]), // Bottom
        new Vector3(position[0], position[1] + span / 2, position[2])  // Top
      ];
    } else {
      return [
        new Vector3(position[0] - span / 2, position[1], position[2]), // Start
        new Vector3(position[0] + span / 2, position[1], position[2])  // End
      ];
    }
  };

  const nodes = getNodePositions();

  return (
    <>
      {nodes.map((nodePos, idx) => (
        <group key={idx} position={nodePos}>
          {/* Node sphere */}
          <mesh>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial 
              color="#fbbf24" 
              emissive="#f59e0b"
              emissiveIntensity={0.3}
              metalness={0.5}
              roughness={0.5}
            />
          </mesh>

          {/* Node halo (for emphasis) */}
          <mesh>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial 
              color="#fbbf24" 
              transparent 
              opacity={0.2}
              wireframe
            />
          </mesh>
        </group>
      ))}
    </>
  );
};

export default NodeVisualization;
