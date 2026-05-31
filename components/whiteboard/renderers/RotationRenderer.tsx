"use client";

import { useRef, useEffect } from "react";
import { Group, Line as KonvaLine, Circle as KonvaCircle } from "react-konva";
import Konva from "konva";
import { denormalizePoints, normalizedToScreen } from "@/lib/whiteboard/konva-utils";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";
import type { CanvasNode } from "@/lib/types/app.types";

interface RendererProps {
  node: CanvasNode;
  stageWidth: number;
  stageHeight: number;
  isSelected: boolean;
  onSelect: () => void;
  draggable: boolean;
  onDragEnd: (x: number, y: number) => void;
}

export function RotationRenderer({
  node,
  stageWidth,
  stageHeight,
  isSelected,
  onSelect,
  draggable,
  onDragEnd,
}: RendererProps) {
  const dashedLineRef = useRef<any>(null);
  const { viewport } = useCanvasStore();
  const scale = viewport.scaleX || 1;

  useEffect(() => {
    const dashedLine = dashedLineRef.current;
    if (!dashedLine) return;

    // Direct animation of the Konva node outside React state for maximum smoothness at 60 FPS
    const anim = new Konva.Animation((frame) => {
      if (!frame) return;
      const speed = 20; // Flow speed (pixels per second)
      // Decrease offset so pattern marches forward
      dashedLine.dashOffset(-(frame.time * speed / 1000) % 16);
    }, dashedLine.getLayer());

    anim.start();
    return () => {
      anim.stop();
    };
  }, []);

  if (!node.points || node.points.length < 4) return null;

  // Denormalize coordinate values
  const screenPos = normalizedToScreen(node.x, node.y, stageWidth, stageHeight);
  const screenPoints = denormalizePoints(node.points, stageWidth, stageHeight);

  // Endpoint arrowhead direction calculations
  const p1x = screenPoints[screenPoints.length - 4];
  const p1y = screenPoints[screenPoints.length - 3];
  const p2x = screenPoints[screenPoints.length - 2];
  const p2y = screenPoints[screenPoints.length - 1];

  const dx = p2x - p1x;
  const dy = p2y - p1y;
  const angle = Math.atan2(dy, dx);

  // Exact visual spec scaled inversely to viewport scale to stay constant pixel size on screen
  const arrowLength = 14 / scale;
  const arrowWidth = 10 / scale;

  const leftX = p2x - arrowLength * Math.cos(angle) + (arrowWidth / 2) * Math.sin(angle);
  const leftY = p2y - arrowLength * Math.sin(angle) - (arrowWidth / 2) * Math.cos(angle);
  const rightX = p2x - arrowLength * Math.cos(angle) - (arrowWidth / 2) * Math.sin(angle);
  const rightY = p2y - arrowLength * Math.sin(angle) + (arrowWidth / 2) * Math.cos(angle);

  const arrowheadPoints = [p2x, p2y, leftX, leftY, rightX, rightY];

  const startX = screenPoints[0];
  const startY = screenPoints[1];
  const color = node.color || "#00FFFF";

  return (
    <Group
      id={node.id}
      x={screenPos.x}
      y={screenPos.y}
      draggable={draggable}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragEnd={(e) => {
        const xNorm = e.target.x() / stageWidth;
        const yNorm = e.target.y() / stageHeight;
        onDragEnd(xNorm, yNorm);
      }}
    >
      {/* 1. Selection Wide Highlight Ring */}
      {isSelected && (
        <KonvaLine
          points={screenPoints}
          stroke="#ffffff"
          strokeWidth={10 / scale}
          opacity={0.35}
          strokeLinecap="round"
          strokeLinejoin="round"
          dash={[6 / scale, 4 / scale]}
        />
      )}

      {/* 2. Glow Shadow Stroke (shadowBlur 6, shadowOpacity 0.4) */}
      <KonvaLine
        points={screenPoints}
        stroke={color}
        strokeWidth={9 / scale}
        opacity={0.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3. Main Solid Base Path (opacity 0.92, strokeWidth 5) */}
      <KonvaLine
        points={screenPoints}
        stroke={color}
        strokeWidth={5 / scale}
        opacity={0.92}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 4. Bold White Marching Dashes Overlay */}
      <KonvaLine
        ref={dashedLineRef}
        points={screenPoints}
        stroke="#ffffff"
        strokeWidth={2.5 / scale}
        strokeLinecap="round"
        strokeLinejoin="round"
        dash={[10 / scale, 6 / scale]}
      />

      {/* 5. End Triangular Arrowhead */}
      <KonvaLine
        points={arrowheadPoints}
        closed={true}
        fill={color}
        stroke={color}
        strokeWidth={3 / scale}
        lineJoin="round"
      />

      {/* 6. Start Dot Indicator */}
      <KonvaCircle
        x={startX}
        y={startY}
        radius={3.5 / scale}
        fill="#ffffff"
        stroke={color}
        strokeWidth={1.5 / scale}
      />
    </Group>
  );
}
