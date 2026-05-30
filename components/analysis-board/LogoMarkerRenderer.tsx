"use client";

import { Group, Circle, Image as KonvaImage, Text } from "react-konva";
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
}

export function LogoMarkerRenderer({
  node,
  stageWidth,
  stageHeight,
  isSelected,
  onSelect,
  draggable,
  onDragEnd,
}: LogoMarkerRendererProps) {
  const screenPos = normalizedToScreen(node.x, node.y, stageWidth, stageHeight);
  const radius = (node.radius ?? 0.035) * stageWidth; // Default radius about 35px
  
  // Use team logo URL from node or fallback
  const logoUrl = node.markerType || ""; // We store logoUrl inside markerType or custom prop
  const [logoImg] = useImage(logoUrl, "anonymous");

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
      {/* Circle highlight when selected */}
      {isSelected && (
        <Circle
          radius={radius + 4}
          stroke="hsl(210, 100%, 60%)"
          strokeWidth={2}
          dash={[4, 4]}
        />
      )}

      {/* Circle-clipped image Group */}
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

      {/* Label under the logo */}
      <Text
        text={node.text || "Team"}
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
    </Group>
  );
}
