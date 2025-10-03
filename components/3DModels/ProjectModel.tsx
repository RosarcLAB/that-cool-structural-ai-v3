// In components/3DModels/ProjectModel.tsx

import React, { Suspense, useMemo, useState, useCallback, useRef } from 'react';
import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Vector3 } from 'three';
import { Project } from '../../customTypes/types';
import { Element, ELEMENT_TYPE_OPTIONS, SupportFixityType } from '../../customTypes/structuralElement';
import { MaterialType, SectionShape } from '../../customTypes/SectionProperties';
import StructuralElement3D from './StructuralElement3D';
import DrawingPreview from './DrawingPreview';
import ContextMenu3D from './ContextMenu3D';
import ElementEditPanel from './ElementEditPanel';
import { useDrawingMode } from './useDrawingMode';
import { NodeManager } from './NodeManager';
import { Node3D, Element3D, calculateSpanFromNodes } from './types3D';
import Node3DComponent from './Node3DComponent';

interface ProjectModelProps {
  isOpen: boolean;
  project: Project;
  onClose: () => void;
  width: number;
  onMouseDownOnResizer: (e: React.MouseEvent) => void;
  onUpdateProject?: (project: Project) => void;
}

// Helper function to calculate element positions in a grid layout
const calculateElementLayout = (elements: Element[]) => {
  const positions: Record<string, [number, number, number]> = {};
  const gridSize = 3; // meters between elements
  
  elements.forEach((element, index) => {
    // Use grid layout for positioning
    const row = Math.floor(index / 5);
    const col = index % 5;
    
    positions[element.id || index.toString()] = [
      col * gridSize,
      0,
      row * gridSize
    ];
  });
  
  return positions;
};

// Drawing plane component for click detection
const DrawingPlane: React.FC<{
  onPlaneClick: (point: Vector3) => void;
  onPlaneMove: (point: Vector3) => void;
  isDrawingMode: boolean;
}> = ({ onPlaneClick, onPlaneMove, isDrawingMode }) => {
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (isDrawingMode) {
      event.stopPropagation();
      onPlaneClick(event.point);
    }
  };

  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    if (isDrawingMode) {
      event.stopPropagation();
      onPlaneMove(event.point);
    }
  };

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onClick={handleClick}
      onPointerMove={handleMove}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial transparent opacity={0} side={2} />
    </mesh>
  );
};

const ProjectModel: React.FC<ProjectModelProps> = ({ 
  isOpen, 
  project, 
  onClose, 
  width, 
  onMouseDownOnResizer,
  onUpdateProject 
}) => {
  const [localProject, setLocalProject] = useState<Project>(project);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node3D | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    element: Element | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, element: null });
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  
  // Node manager instance
  const nodeManagerRef = useRef<NodeManager>(new NodeManager());
  const [nodes, setNodes] = useState<Node3D[]>([]);
  const [hoveredNode, setHoveredNode] = useState<Node3D | null>(null);

  const {
    isDrawingMode,
    drawingState,
    toggleDrawingMode,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
  } = useDrawingMode();

  // Calculate element positions using memoization
  const elementPositions = useMemo(
    () => calculateElementLayout(localProject.elements || []),
    [localProject.elements]
  );

  // Update local project when prop changes
  React.useEffect(() => {
    setLocalProject(project);
    
    // Initialize nodes from project elements
    const nodeManager = nodeManagerRef.current;
    nodeManager.clear(); // Start fresh
    
    // Create nodes for elements that have position-based layout
    project.elements?.forEach((element, index) => {
      const element3D = element as Element3D;
      
      // Skip if element already has node connections
      if (element3D.startNodeId && element3D.endNodeId) {
        return;
      }
      
      const position = elementPositions[element.id || index.toString()] || [index * 2, 0, 0];
      const span = element.span || 2;
      
      // Create start and end nodes for each element at Y=0 (ground plane)
      const startPos: [number, number, number] = [position[0] - span/2, 0, position[2]];
      const endPos: [number, number, number] = [position[0] + span/2, 0, position[2]];
      
      const startNode = nodeManager.getOrCreateNodeAt(startPos);
      const endNode = nodeManager.getOrCreateNodeAt(endPos);
      
      // Connect element to nodes
      if (element.id) {
        nodeManager.connectElement(element.id, startNode.id, endNode.id);
        
        // Update element with node IDs
        element3D.startNodeId = startNode.id;
        element3D.endNodeId = endNode.id;
      }
    });
    
    setNodes(nodeManager.getAllNodes());
  }, [project, elementPositions]);

  const createElementFromLine = useCallback((start: Vector3, end: Vector3) => {
    const nodeManager = nodeManagerRef.current;
    
    // Get or create nodes at start and end positions
    const startNode = nodeManager.getOrCreateNodeAt([start.x, start.y, start.z]);
    const endNode = nodeManager.getOrCreateNodeAt([end.x, end.y, end.z]);
    
    // Calculate span from nodes
    const span = calculateSpanFromNodes(startNode, endNode);

    // Create new element with node connections
    const newElement: Element3D = {
      id: `element-${Date.now()}`,
      name: `Element ${(localProject.elements?.length || 0) + 1}`,
      type: 'Beam',
      span: parseFloat(span.toFixed(2)),
      spacing: 0.6,
      section_count: 1,
      sectionName: '200x45 LVL',
      sections: [{
        id: `section-${Date.now()}`,
        name: '200x45 LVL',
        d: 200,
        b: 45,
        t: 0,
        A: 9000,
        Ix: 30000000,
        Iy: 1518750,
        Zx: 300000,
        Zy: 67500,
        Sx: 0,
        Sy: 0,
        material: MaterialType.Timber,
        shape: SectionShape.Rectangular,
        elastic_modulus_E: 11000,
      }],
      supports: [
        { position: 0, fixity: SupportFixityType.Pinned },
        { position: span, fixity: SupportFixityType.Pinned },
      ],
      appliedLoads: [],
      loadCombinations: [],
      reactions: [],
      // Node connections
      startNodeId: startNode.id,
      endNodeId: endNode.id,
    };

    // Connect element to nodes
    nodeManager.connectElement(newElement.id, startNode.id, endNode.id);
    
    // Update nodes state
    setNodes(nodeManager.getAllNodes());

    const updatedProject = {
      ...localProject,
      elements: [...(localProject.elements || []), newElement],
    };

    setLocalProject(updatedProject);
    if (onUpdateProject) {
      onUpdateProject(updatedProject);
    }

    // Exit drawing mode after creating element
    toggleDrawingMode();
  }, [localProject, onUpdateProject, toggleDrawingMode]);

  const handlePlaneClick = useCallback((point: Vector3) => {
    if (!isDrawingMode) return;

    if (!drawingState.isDrawing) {
      // Start drawing
      startDrawing(point);
    } else {
      // Finish drawing
      const line = finishDrawing(point);
      if (line) {
        createElementFromLine(line.start, line.end);
      }
    }
  }, [isDrawingMode, drawingState.isDrawing, startDrawing, finishDrawing, createElementFromLine]);

  const handlePlaneMove = useCallback((point: Vector3) => {
    if (isDrawingMode && drawingState.isDrawing) {
      updateDrawing(point);
    }
  }, [isDrawingMode, drawingState.isDrawing, updateDrawing]);

  const handleElementSelect = (element: Element) => {
    setSelectedElement(element);
  };

  const handleElementContextMenu = (element: Element, event: ThreeEvent<MouseEvent>) => {
    event.nativeEvent.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY },
      element,
    });
  };

  const handleEditElement = () => {
    if (contextMenu.element) {
      setSelectedElement(contextMenu.element);
      setIsEditPanelOpen(true);
    }
  };

  const handleDuplicateElement = () => {
    if (contextMenu.element) {
      const duplicated: Element = {
        ...contextMenu.element,
        id: `element-${Date.now()}`,
        name: `${contextMenu.element.name} (Copy)`,
      };

      const updatedProject = {
        ...localProject,
        elements: [...(localProject.elements || []), duplicated],
      };

      setLocalProject(updatedProject);
      if (onUpdateProject) {
        onUpdateProject(updatedProject);
      }
    }
  };

  const handleDeleteElement = (elementId?: string) => {
    const idToDelete = elementId || contextMenu.element?.id;
    if (!idToDelete) return;

    if (confirm('Are you sure you want to delete this element?')) {
      const nodeManager = nodeManagerRef.current;
      
      // Disconnect element from nodes
      nodeManager.disconnectElement(idToDelete);
      
      const updatedProject = {
        ...localProject,
        elements: (localProject.elements || []).filter((el) => el.id !== idToDelete),
      };

      setLocalProject(updatedProject);
      if (onUpdateProject) {
        onUpdateProject(updatedProject);
      }
      
      // Update nodes state
      setNodes(nodeManager.getAllNodes());
      
      if (selectedElement?.id === idToDelete) {
        setSelectedElement(null);
      }
    }
  };

  const handleSaveElement = (updatedElement: Element) => {
    const updatedProject = {
      ...localProject,
      elements: (localProject.elements || []).map((el) =>
        el.id === updatedElement.id ? updatedElement : el
      ),
    };

    setLocalProject(updatedProject);
    if (onUpdateProject) {
      onUpdateProject(updatedProject);
    }
    
    setSelectedElement(null);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Resizer Handle */}
      <div
        className="w-1.5 h-full cursor-col-resize bg-base-300 hover:bg-primary transition-colors flex-shrink-0"
        onMouseDown={onMouseDownOnResizer}
      />

      {/* Panel Content */}
      <div 
        className="flex-shrink-0 bg-base-100 shadow-lg flex flex-col h-full" 
        style={{ width: `${width}px` }}
      >
        {/* Header */}
        <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-200">
          <div>
            <h2 className="text-xl font-bold">3D Model: {localProject.name}</h2>
            <p className="text-sm text-gray-500">
              {localProject.elements?.length || 0} elements
            </p>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-ghost">✕</button>
        </div>

        {/* Toolbar */}
        <div className="p-2 border-b border-base-300 bg-base-100 flex gap-2">
          <button
            onClick={toggleDrawingMode}
            className={`btn btn-sm ${isDrawingMode ? 'btn-primary' : 'btn-ghost'}`}
            title="Draw Line to Create Element"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {isDrawingMode ? 'Drawing...' : 'Draw Line'}
          </button>

          {isDrawingMode && (
            <button
              onClick={cancelDrawing}
              className="btn btn-sm btn-error"
              title="Cancel Drawing"
            >
              Cancel
            </button>
          )}

          <div className="divider divider-horizontal mx-0"></div>

          <button
            onClick={() => setSelectedElement(null)}
            className="btn btn-sm btn-ghost"
            disabled={!selectedElement}
            title="Deselect"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 3D Canvas */}
        <div className="flex-grow relative">
          <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ position: [10, 10, 10], fov: 50 }}
            onPointerMissed={() => {
              if (!isDrawingMode) {
                setSelectedElement(null);
              }
            }}
          >
            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[10, 10, 5]}
              intensity={1}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />

            {/* Environment for reflections */}
            <Environment preset="city" />

            {/* Grid helper for ground plane */}
            <Grid 
              args={[20, 20]} 
              cellSize={1} 
              cellThickness={0.5}
              cellColor="#6b7280"
              sectionSize={5}
              sectionThickness={1}
              sectionColor="#3b82f6"
              fadeDistance={25}
              fadeStrength={1}
              followCamera={false}
            />

            {/* Drawing plane */}
            <DrawingPlane 
              onPlaneClick={handlePlaneClick}
              onPlaneMove={handlePlaneMove}
              isDrawingMode={isDrawingMode}
            />

            {/* Drawing preview */}
            {isDrawingMode && drawingState.previewLine && (
              <DrawingPreview
                startPoint={drawingState.previewLine.start}
                endPoint={drawingState.previewLine.end}
              />
            )}

            {/* Render all structural elements */}
            <Suspense fallback={null}>
              {localProject.elements?.map((element, index) => {
                const element3D = element as Element3D;
                const nodeManager = nodeManagerRef.current;
                
                // Get nodes for this element
                const startNode = element3D.startNodeId ? nodeManager.getNode(element3D.startNodeId) : undefined;
                const endNode = element3D.endNodeId ? nodeManager.getNode(element3D.endNodeId) : undefined;
                
                // Fallback to grid position if no nodes
                const position = elementPositions[element.id || index.toString()] || [index * 2, 0, 0];
                
                return (
                  <StructuralElement3D 
                    key={element.id || index} 
                    element={element}
                    position={position}
                    startNode={startNode}
                    endNode={endNode}
                    isSelected={selectedElement?.id === element.id}
                    onSelect={handleElementSelect}
                    onContextMenu={handleElementContextMenu}
                    showNodes={true}
                  />
                );
              })}
            </Suspense>

            {/* Render all nodes */}
            <Suspense fallback={null}>
              {nodes.map((node) => (
                <Node3DComponent
                  key={node.id}
                  node={node}
                  isSelected={selectedNode?.id === node.id}
                  isHovered={hoveredNode?.id === node.id}
                  onClick={(node) => setSelectedNode(node)}
                  onHover={(node, hovered) => setHoveredNode(hovered ? node : null)}
                  showLabel={true}
                  size={0.06}
                />
              ))}
            </Suspense>

            {/* Camera controls */}
            <OrbitControls
              makeDefault
              enabled={!isDrawingMode}
              minPolarAngle={0}
              maxPolarAngle={Math.PI / 2}
              enableDamping
              dampingFactor={0.05}
            />
          </Canvas>
        </div>

        {/* Controls Info */}
        <div className="p-2 border-t border-base-300 bg-base-200 text-xs text-gray-600">
          <div className="flex gap-4 justify-center flex-wrap">
            <span>🖱️ Left: {isDrawingMode ? 'Place Point' : 'Rotate'}</span>
            {!isDrawingMode && (
              <>
                <span>🖱️ Right: Pan (or Context Menu on element)</span>
                <span>🖱️ Scroll: Zoom</span>
              </>
            )}
            {isDrawingMode && <span className="text-primary font-semibold">Click to place start point, then end point</span>}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      <ContextMenu3D
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        elementName={contextMenu.element?.name}
        onEdit={handleEditElement}
        onDuplicate={handleDuplicateElement}
        onDelete={() => handleDeleteElement()}
        onClose={() => setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, element: null })}
      />

      {/* Edit Panel */}
      <ElementEditPanel
        element={selectedElement}
        isOpen={isEditPanelOpen}
        onClose={() => {
          setIsEditPanelOpen(false);
          setSelectedElement(null);
        }}
        onSave={handleSaveElement}
        onDelete={handleDeleteElement}
      />
    </>
  );
};

export default ProjectModel;
