"use client";

import { use } from "react";
import { CommunicationBoard } from "@/components/communication/CommunicationBoard";

interface PageProps {
  params: Promise<{ mapId: string }>;
}

export default function CommunicationBoardPage({ params }: PageProps) {
  const { mapId } = use(params);
  return <CommunicationBoard mapId={mapId} />;
}
