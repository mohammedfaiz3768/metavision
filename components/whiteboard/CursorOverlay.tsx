"use client";

import { Layer, Group, Path, Text, Circle } from "react-konva";
import { normalizedToScreen } from "@/lib/whiteboard/konva-utils";
import type { CursorPosition } from "@/lib/types/app.types";

interface CursorOverlayProps {
  cursors: CursorPosition[];
  stageWidth: number;
  stageHeight: number;
}

export function CursorOverlay({
  cursors,
  stageWidth,
  stageHeight,
}: CursorOverlayProps) {
  return (
    <Layer id="cursors-layer">
      {cursors.map((cursor) => {
        const screenPos = normalizedToScreen(cursor.x, cursor.y, stageWidth, stageHeight);

        return (
          <Group key={cursor.user_id} x={screenPos.x} y={screenPos.y}>
            {/* Pointer SVG Path (Triangle/Cursor) */}
            <Path
              data="M0,0 L0,15 L4,11 L9,11 Z"
              fill={cursor.color}
              stroke="#000"
              strokeWidth={1}
              shadowColor="black"
              shadowBlur={3}
              shadowOffset={{ x: 1, y: 1 }}
              shadowOpacity={0.3}
            />

            {/* Username Badge text background circle/pill */}
            <Group x={10} y={10}>
              {/* Colored bullet indicator */}
              <Circle radius={3} fill={cursor.color} x={5} y={8} />

              {/* Username label */}
              <Text
                text={cursor.username}
                fontSize={10}
                fontFamily="sans-serif"
                fontStyle="bold"
                fill="#ffffff"
                padding={4}
                x={10}
                y={0}
                shadowColor="black"
                shadowBlur={2}
                shadowOpacity={0.5}
              />
            </Group>
          </Group>
        );
      })}
    </Layer>
  );
}
