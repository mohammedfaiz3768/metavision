import React from "react";
import { FreedrawRenderer } from "./FreedrawRenderer";
import { RotationRenderer } from "./RotationRenderer";
import { ArrowRenderer } from "./ArrowRenderer";
import { ShapeRenderer } from "./ShapeRenderer";
import { TextRenderer } from "./TextRenderer";
import { MarkerRenderer } from "./MarkerRenderer";
import { LogoMarkerRenderer } from "@/components/analysis-board/LogoMarkerRenderer";
import type { CanvasNode } from "@/lib/types/app.types";

interface NodeRendererProps {
  node: CanvasNode;
  stageWidth: number;
  stageHeight: number;
  isSelected: boolean;
  onSelect: () => void;
  draggable: boolean;
  onDragEnd: (x: number, y: number) => void;
  onTextDblClick?: (node: CanvasNode, event: any) => void;
  editingTextNodeId?: string | null;
}

function NodeRendererComponent({
  node,
  stageWidth,
  stageHeight,
  isSelected,
  onSelect,
  draggable,
  onDragEnd,
  onTextDblClick,
  editingTextNodeId,
}: NodeRendererProps) {
  const commonProps = {
    node,
    stageWidth,
    stageHeight,
    isSelected,
    onSelect,
    draggable,
    onDragEnd,
  };

  switch (node.type as string) {
    case "freedraw":
      return <FreedrawRenderer {...commonProps} />;

    case "rotation":
      return <RotationRenderer {...commonProps} />;

    case "arrow":
      return <ArrowRenderer {...commonProps} />;

    case "circle":
    case "rect":
      return <ShapeRenderer {...commonProps} />;

    case "text":
      return (
        <TextRenderer
          {...commonProps}
          isEditing={editingTextNodeId === node.id}
          onDblClick={(e) => onTextDblClick?.(node, e)}
        />
      );

    case "marker":
      return <MarkerRenderer {...commonProps} />;

    case "logo-marker":
      return <LogoMarkerRenderer {...commonProps} />;

    default:
      return null;
  }
}

// Perform custom shallow comparison to optimize rerenders
export const NodeRenderer = React.memo(NodeRendererComponent, (prevProps, nextProps) => {
  return (
    prevProps.node === nextProps.node &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.draggable === nextProps.draggable &&
    prevProps.editingTextNodeId === nextProps.editingTextNodeId
  );
});

