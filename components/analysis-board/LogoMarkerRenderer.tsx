"use client";

import { Group, Circle, Rect, Image as KonvaImage, Text } from "react-konva";
import useImage from "use-image";
import { normalizedToScreen } from "@/lib/whiteboard/konva-utils";
import type { CanvasNode } from "@/lib/types/app.types";

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
  
  // Use team logo URL from node or fallback
  const logoUrl = node.markerType || ""; // We store logoUrl inside markerType or custom prop
  const [logoImg] = useImage(logoUrl, "anonymous");

  const isCircular = node.isCircular !== false;

  return (
    <Group
      id={node.id}
      x={screenPos.x}
      y={screenPos.y}
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
      {/* Selection highlight */}
      {isSelected && (
        isCircular ? (
          <Circle
            radius={radius + 4}
            stroke="hsl(210, 100%, 60%)"
            strokeWidth={2}
            dash={[4, 4]}
          />
        ) : (
          <Rect
            x={-radius * 1.5 - 4}
            y={-radius - 4}
            width={radius * 3 + 8}
            height={radius * 2 + 8}
            stroke="hsl(210, 100%, 60%)"
            strokeWidth={2}
            dash={[4, 4]}
          />
        )
      )}

      {/* Image container */}
      {isCircular ? (
        <Group
          clipFunc={(ctx) => {
            ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
          }}
        >
          {logoImg ? (
            <KonvaImage
              image={logoImg}
              x={-radius}
              y={-radius}
              width={radius * 2}
              height={radius * 2}
            />
          ) : (
            <Circle
              radius={radius}
              fill="#334155"
              stroke="#475569"
              strokeWidth={1}
            />
          )}
        </Group>
      ) : (
        <Group>
          {logoImg ? (
            <KonvaImage
              image={logoImg}
              x={-radius * 1.5}
              y={-radius}
              width={radius * 3}
              height={radius * 2}
            />
          ) : (
            <Rect
              x={-radius * 1.5}
              y={-radius}
              width={radius * 3}
              height={radius * 2}
              fill="#334155"
              stroke="#475569"
              strokeWidth={1}
            />
          )}
        </Group>
      )}

      {/* Label under the logo/asset */}
      {node.text && (
        <Text
          text={node.text}
          fontSize={10}
          fontStyle="bold"
          fill="#ffffff"
          align="center"
          x={-50}
          y={radius + 4}
          width={100}
          shadowColor="black"
          shadowBlur={3}
          shadowOpacity={0.8}
          shadowOffset={{ x: 1, y: 1 }}
        />
      )}
    </Group>
  );
}
