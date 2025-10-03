// hooks/useDrawingMode.ts
import { useState, useCallback, useRef } from 'react';
import { Vector3 } from 'three';
import { Element } from '../customTypes/structuralElement';

export interface DrawingPoint {
  position: Vector3;
  timestamp: number;
}

export interface DrawingState {
  isDrawing: boolean;
  startPoint: DrawingPoint | null;
  currentPoint: DrawingPoint | null;
  previewLine: { start: Vector3; end: Vector3 } | null;
}

export const useDrawingMode = () => {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    startPoint: null,
    currentPoint: null,
    previewLine: null,
  });

  const startDrawing = useCallback((point: Vector3) => {
    setDrawingState({
      isDrawing: true,
      startPoint: { position: point, timestamp: Date.now() },
      currentPoint: null,
      previewLine: null,
    });
  }, []);

  const updateDrawing = useCallback((point: Vector3) => {
    setDrawingState(prev => {
      if (!prev.startPoint) return prev;
      
      return {
        ...prev,
        currentPoint: { position: point, timestamp: Date.now() },
        previewLine: {
          start: prev.startPoint.position,
          end: point,
        },
      };
    });
  }, []);

  const finishDrawing = useCallback((point: Vector3): { start: Vector3; end: Vector3 } | null => {
    const result = drawingState.startPoint 
      ? { start: drawingState.startPoint.position, end: point }
      : null;

    setDrawingState({
      isDrawing: false,
      startPoint: null,
      currentPoint: null,
      previewLine: null,
    });

    return result;
  }, [drawingState.startPoint]);

  const cancelDrawing = useCallback(() => {
    setDrawingState({
      isDrawing: false,
      startPoint: null,
      currentPoint: null,
      previewLine: null,
    });
  }, []);

  const toggleDrawingMode = useCallback(() => {
    setIsDrawingMode(prev => !prev);
    if (drawingState.isDrawing) {
      cancelDrawing();
    }
  }, [drawingState.isDrawing, cancelDrawing]);

  return {
    isDrawingMode,
    drawingState,
    toggleDrawingMode,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
  };
};
