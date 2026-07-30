"use client";

import { useState, useCallback } from "react";

interface UseColumnReorderReturn {
  dragIdx: number | null;
  dragOverIdx: number | null;
  handleDragStart: (idx: number) => void;
  handleDragOver: (e: React.DragEvent, idx: number) => void;
  handleDrop: (targetIdx: number) => void;
  handleDragEnd: () => void;
  thClassName: (idx: number, baseClassName?: string) => string;
}

export function useColumnReorder(): UseColumnReorderReturn {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  }, []);

  const handleDrop = useCallback((_targetIdx: number) => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  const thClassName = useCallback(
    (idx: number, baseClassName?: string) => {
      const base = baseClassName ?? "";
      if (dragIdx === idx) return `${base} bg-primary/20 text-primary`;
      if (dragOverIdx === idx) return `${base} bg-primary/10 border-l-2 border-l-primary`;
      return `${base} hover:bg-slate-200 dark:hover:bg-slate-700`;
    },
    [dragIdx, dragOverIdx],
  );

  return {
    dragIdx,
    dragOverIdx,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    thClassName,
  };
}
