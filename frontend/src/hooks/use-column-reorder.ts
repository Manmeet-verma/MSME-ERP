"use client";

import { useState, useCallback } from "react";

interface UseColumnReorderReturn {
  dragIdx: number | null;
  dragOverIdx: number | null;
  onDragStartColumn: (idx: number) => void;
  onDragOverColumn: (e: React.DragEvent, idx: number) => void;
  onDropColumn: (idx: number) => void;
  onDragEndColumn: () => void;
}

export function useColumnReorder(): UseColumnReorderReturn {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const onDragStartColumn = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const onDragOverColumn = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  }, []);

  const onDropColumn = useCallback((_targetIdx: number) => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  const onDragEndColumn = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  return {
    dragIdx,
    dragOverIdx,
    onDragStartColumn,
    onDragOverColumn,
    onDropColumn,
    onDragEndColumn,
  };
}
