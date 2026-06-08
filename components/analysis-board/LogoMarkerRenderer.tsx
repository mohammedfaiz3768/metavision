"use client";

import { Group, Circle, Rect, Image as KonvaImage, Text, Line as KonvaLine } from "react-konva";
import useImage from "use-image";
import { normalizedToScreen } from "@/lib/whiteboard/konva-utils";
import type { CanvasNode } from "@/lib/types/app.types";
import { useCanvasStore } from "@/lib/whiteboard/canvas-store";

interface LogoMarkerRendererProps {
  node: CanvasNode & { logoUrl?: string };
  stageWidth: number;
  stageHeight: number;
  isSelected: boolean;
  onSelect: () => void;
  draggable: boolean;
  onDragEnd: (x: number, y: number) => void;
  listening?: boolean;
}

export function LogoMarkerRenderer({
  node,
  stageWidth,
  stageHeight,
  isSelected,
  onSelect,
  draggable,
  onDragEnd,
  listening = true,
}: LogoMarkerRendererProps) {
  const screenPos = normalizedToScreen(node.x, node.y, stageWidth, stageHeight);
  const radius = (node.radius ?? 0.035) * stageWidth; // Default radius about 35px

  // Use team logo URL from node
  const logoUrl = node.markerType || "";
  const [logoImg] = useImage(logoUrl, "anonymous");

  // Pin dimensions — tip is at (0, 0), logo circle sits above
  const pinTipHeight = radius * 0.7;        // height of the pointed triangle tip
  const circleRadius = radius;              // radius of the circular logo head
  const baseLength = circleRadius + pinTipHeight;

  // Overlap detection and fanning rotation/height calculations
  const allNodes = useCanvasStore((state) => state.nodes);
  const logoNodes = allNodes.filter(
    (n) => (n.type as string) === "logo-marker" && n.layer === node.layer
  );

  const CLOSE_THRESHOLD = 0.095; // ~97px distance threshold to catch adjacent building overlaps
  const closeLogos = logoNodes.filter((n) => {
    const dx = n.x - node.x;
    const dy = n.y - node.y;
    return Math.sqrt(dx * dx + dy * dy) < CLOSE_THRESHOLD;
  });

  // Sort by X coordinate so left-most pins tilt left and right-most pins tilt right (never crossing over)
  closeLogos.sort((a, b) => {
    if (a.x !== b.x) {
      return a.x - b.x;
    }
    return a.id.localeCompare(b.id);
  });
  const N = closeLogos.length;
  const index = closeLogos.findIndex((n) => n.id === node.id);

  let rotationAngle = 0;
  let heightFactor = 1;
  if (N > 1) {
    const maxSpread = 90; // max fanning spread of 90 degrees
    const spreadPerNode = 40;
    const spread = Math.min(maxSpread, (N - 1) * spreadPerNode);
    const startAngle = -spread / 2;
    const step = spread / (N - 1);
    rotationAngle = startAngle + index * step;
    
    // Stack heights (stagger them vertically) to guarantee no overlapping heads
    heightFactor = 1 + index * 0.65;
  }

  const circleCenterY = -baseLength * heightFactor; // center of the logo circle above tip
  const totalHeight = circleRadius * 2 + pinTipHeight * heightFactor;

  // Dynamic scale factor to prevent cropping
  const isCircular = node.isCircular !== false;
  const imageScale = isCircular ? 0.82 : 0.7;
  const imageSize = circleRadius * 2 * imageScale;

  // Pin body color: use node.color (default is white "#ffffff", fallback to "#1e293b")
  const defaultColor = "#1e293b";
  const hasCustomColor = node.color && node.color !== "#ffffff" && node.color !== "";
  const basePinColor = hasCustomColor ? node.color : defaultColor;

  const pinColor = isSelected ? "hsl(210, 100%, 50%)" : basePinColor;
  const pinBorderColor = isSelected ? "hsl(210, 100%, 65%)" : (hasCustomColor ? basePinColor : "#475569");
  const shadowColor = "rgba(0, 0, 0, 0.5)";

  return (
    <Group
      id={node.id}
      x={screenPos.x}
      y={screenPos.y}
      rotation={rotationAngle}
      draggable={draggable}
      listening={listening}
      onClick={(e) => {
        if (listening === false) return;
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        if (listening === false) return;
        e.cancelBubble = true;
        onSelect();
      }}
      onDragEnd={(e) => {
        const xNorm = e.target.x() / stageWidth;
        const yNorm = e.target.y() / stageHeight;
        onDragEnd(xNorm, yNorm);
      }}
    >
      {/* Drop shadow under the pin */}
      <Circle
        x={0}
        y={2}
        radius={circleRadius * 0.35}
        fill="rgba(0,0,0,0.25)"
        scaleX={2.2}
        scaleY={0.5}
      />

      {/* Pin triangular pointer (points down to the tip at 0,0) */}
      <KonvaLine
        points={[
          -circleRadius * 0.55, circleCenterY + circleRadius * 0.7,
          0, 0,
          circleRadius * 0.55, circleCenterY + circleRadius * 0.7,
        ]}
        closed={true}
        fill={pinColor}
        stroke={pinBorderColor}
        strokeWidth={1.5}
      />

      {/* Pin circular body background container */}
      <Circle
        x={0}
        y={circleCenterY}
        radius={circleRadius + 2}
        fill="#ffffff"
        stroke={pinBorderColor}
        strokeWidth={2}
        shadowColor={shadowColor}
        shadowBlur={6}
        shadowOffset={{ x: 0, y: 3 }}
        shadowOpacity={0.4}
      />

      {/* Logo image clipped inside the circle */}
      <Group
        clipFunc={(ctx) => {
          ctx.arc(0, circleCenterY, circleRadius, 0, Math.PI * 2, false);
        }}
      >
        {logoImg ? (
          <KonvaImage
            image={logoImg}
            x={-imageSize / 2}
            y={circleCenterY - imageSize / 2}
            width={imageSize}
            height={imageSize}
          />
        ) : (
          <Circle
            x={0}
            y={circleCenterY}
            radius={circleRadius}
            fill="#f8fafc"
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        )}
      </Group>

      {/* Selection highlight ring */}
      {isSelected && (
        <Circle
          x={0}
          y={circleCenterY}
          radius={circleRadius + 5}
          stroke="hsl(210, 100%, 60%)"
          strokeWidth={2}
          dash={[4, 4]}
        />
      )}

      {/* Label under the pin */}
      {node.text && (
        <Text
          text={node.text}
          fontSize={10}
          fontStyle="bold"
          fontFamily="Inter, system-ui, sans-serif"
          fill="#ffffff"
          align="center"
          x={-50}
          y={6}
          width={100}
          shadowColor="black"
          shadowBlur={4}
          shadowOpacity={0.9}
          shadowOffset={{ x: 1, y: 1 }}
        />
      )}
    </Group>
  );
}
