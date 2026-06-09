"use client";

import { useRef } from "react";
import { Stage, Layer, Line, Circle, Rect, Arrow, Text } from "react-konva";

export interface Shape {
  id: string;
  type: "arrow" | "circle" | "rect" | "free" | "text";
  color: string;
  points?: number[]; // normalized [x1, y1, x2, y2, ...]
  x: number; // normalized
  y: number; // normalized
  w?: number; // normalized
  h?: number; // normalized
  radius?: number; // normalized
  text?: string;
}

interface DrawingCanvasProps {
  width: number;
  height: number;
  tool: "select" | "arrow" | "circle" | "rect" | "free" | "text";
  color: string;
  shapes: Shape[];
  onChange: (shapes: Shape[]) => void;
}

export default function DrawingCanvas({
  width,
  height,
  tool,
  color,
  shapes,
  onChange,
}: DrawingCanvasProps) {
  const isDrawing = useRef(false);
  const activeId = useRef<string | null>(null);

  const handleMouseDown = (e: any) => {
    if (tool === "select") return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;

    isDrawing.current = true;
    const shapeId = Math.random().toString(36).substring(2, 9);
    activeId.current = shapeId;

    // Normalize starting position
    const normX = pos.x / width;
    const normY = pos.y / height;

    let newShape: Shape = {
      id: shapeId,
      type: tool,
      color,
      x: normX,
      y: normY,
    };

    if (tool === "free") {
      newShape.points = [normX, normY];
    } else if (tool === "arrow") {
      newShape.points = [normX, normY, normX, normY];
    } else if (tool === "rect") {
      newShape.w = 0;
      newShape.h = 0;
    } else if (tool === "circle") {
      newShape.radius = 0;
    } else if (tool === "text") {
      const txt = prompt("Enter text annotation:");
      if (!txt) {
        isDrawing.current = false;
        activeId.current = null;
        return;
      }
      newShape.text = txt;
      isDrawing.current = false;
      activeId.current = null;
      onChange([...shapes, newShape]);
      return;
    }

    onChange([...shapes, newShape]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || !activeId.current || tool === "select") return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const currentX = pos.x / width;
    const currentY = pos.y / height;

    const updated = shapes.map((shape) => {
      if (shape.id !== activeId.current) return shape;

      if (shape.type === "free" && shape.points) {
        return {
          ...shape,
          points: [...shape.points, currentX, currentY],
        };
      } else if (shape.type === "arrow" && shape.points) {
        return {
          ...shape,
          points: [shape.points[0], shape.points[1], currentX, currentY],
        };
      } else if (shape.type === "rect") {
        return {
          ...shape,
          w: currentX - shape.x,
          h: currentY - shape.y,
        };
      } else if (shape.type === "circle") {
        const dx = currentX - shape.x;
        const dy = currentY - shape.y;
        return {
          ...shape,
          radius: Math.sqrt(dx * dx + dy * dy),
        };
      }
      return shape;
    });

    onChange(updated);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    activeId.current = null;
  };

  return (
    <Stage
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: tool === "select" ? "default" : "crosshair" }}
    >
      <Layer>
        {shapes.map((shape) => {
          const strokeWidth = 3;
          if (shape.type === "free" && shape.points) {
            // Restore line points
            const restoredPoints = shape.points.map((val, idx) =>
              idx % 2 === 0 ? val * width : val * height
            );
            return (
              <Line
                key={shape.id}
                points={restoredPoints}
                stroke={shape.color}
                strokeWidth={strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
              />
            );
          } else if (shape.type === "arrow" && shape.points) {
            // Restore arrow points
            const startX = shape.points[0] * width;
            const startY = shape.points[1] * height;
            const endX = shape.points[2] * width;
            const endY = shape.points[3] * height;
            return (
              <Arrow
                key={shape.id}
                points={[startX, startY, endX, endY]}
                pointerLength={12}
                pointerWidth={8}
                fill={shape.color}
                stroke={shape.color}
                strokeWidth={strokeWidth}
              />
            );
          } else if (shape.type === "rect" && shape.w !== undefined && shape.h !== undefined) {
            const startX = shape.x * width;
            const startY = shape.y * height;
            const w = shape.w * width;
            const h = shape.h * height;
            return (
              <Rect
                key={shape.id}
                x={startX}
                y={startY}
                width={w}
                height={h}
                stroke={shape.color}
                strokeWidth={strokeWidth}
              />
            );
          } else if (shape.type === "circle" && shape.radius !== undefined) {
            const startX = shape.x * width;
            const startY = shape.y * height;
            const radius = shape.radius * Math.min(width, height);
            return (
              <Circle
                key={shape.id}
                x={startX}
                y={startY}
                radius={radius}
                stroke={shape.color}
                strokeWidth={strokeWidth}
              />
            );
          } else if (shape.type === "text" && shape.text) {
            const startX = shape.x * width;
            const startY = shape.y * height;
            return (
              <Text
                key={shape.id}
                x={startX}
                y={startY}
                text={shape.text}
                fontSize={16}
                fontStyle="bold"
                fill={shape.color}
              />
            );
          }
          return null;
        })}
      </Layer>
    </Stage>
  );
}
