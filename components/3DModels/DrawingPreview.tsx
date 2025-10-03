// components/structuralEngineering/DrawingPreview.tsx
import React from 'react';
import { Line } from '@react-three/drei';
import { Vector3 } from 'three';

interface DrawingPreviewProps {
  startPoint: Vector3 | null;
  endPoint: Vector3 | null;
}

const DrawingPreview: React.FC<DrawingPreviewProps> = ({ startPoint, endPoint }) => {
  if (!startPoint || !endPoint) return null;

  const length = startPoint.distanceTo(endPoint);

  return (
    <group>
      {/* Preview line */}
      <Line
        points={[
          [startPoint.x, startPoint.y, startPoint.z],
          [endPoint.x, endPoint.y, endPoint.z]
        ]}
        color="#10b981"
        lineWidth={3}
        dashed
        dashScale={2}
        dashSize={0.2}
        gapSize={0.1}
      />
      
      {/* Start point indicator */}
      <mesh position={[startPoint.x, startPoint.y, startPoint.z]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.5} />
      </mesh>

      {/* End point indicator */}
      <mesh position={[endPoint.x, endPoint.y, endPoint.z]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
      </mesh>

      {/* Length label */}
      <group position={[
        (startPoint.x + endPoint.x) / 2,
        (startPoint.y + endPoint.y) / 2 + 0.3,
        (startPoint.z + endPoint.z) / 2
      ]}>
        <mesh>
          <planeGeometry args={[1, 0.3]} />
          <meshBasicMaterial color="#ffffff" opacity={0.9} transparent />
        </mesh>
        {/* You can add Text component here for showing length */}
      </group>
    </group>
  );
};

export default DrawingPreview;
