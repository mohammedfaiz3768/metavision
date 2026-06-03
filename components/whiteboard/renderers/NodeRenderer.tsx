import React from "react";
import { Group } from "react-konva";
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
  readOnly?: boolean;
  listening?: boolean;
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
  readOnly = false,
  listening = true,
}: NodeRendererProps) {
  const commonProps = {
    node,
    stageWidth,
    stageHeight,
    isSelected,
    onSelect,
    draggable,
    onDragEnd,
    listening,
  };

  let renderedElement = null;

  switch (node.type as string) {
    case "freedraw":
      renderedElement = <FreedrawRenderer {...commonProps} />;
      break;

    case "rotation":
      renderedElement = <RotationRenderer {...commonProps} />;
      break;

    case "arrow":
      renderedElement = <ArrowRenderer {...commonProps} />;
      break;

    case "circle":
    case "rect":
      renderedElement = <ShapeRenderer {...commonProps} />;
      break;

    case "text":
      renderedElement = (
        <TextRenderer
          {...commonProps}
          readOnly={readOnly}
          isEditing={editingTextNodeId === node.id}
          onDblClick={(e) => onTextDblClick?.(node, e)}
        />
      );
      break;

    case "marker":
      renderedElement = <MarkerRenderer {...commonProps} />;
      break;

    case "logo-marker":
      renderedElement = <LogoMarkerRenderer {...commonProps} />;
      break;

    default:
      renderedElement = null;
  }

  if (!renderedElement) return null;

  return <Group listening={listening}>{renderedElement}</Group>;
}

// Perform custom shallow comparison to optimize rerenders
export const NodeRenderer = React.memo(NodeRendererComponent, (prevProps, nextProps) => {
  return (
    prevProps.node === nextProps.node &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.draggable === nextProps.draggable &&
    prevProps.editingTextNodeId === nextProps.editingTextNodeId &&
    prevProps.readOnly === nextProps.readOnly &&
    prevProps.listening === nextProps.listening
  );
});

