"use client";

import React from "react";

interface DraggableThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  idx: number;
  dragIdx: number | null;
  dragOverIdx: number | null;
  onDragStart: (idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDrop: (idx: number) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
}

export function DraggableTh({
  idx,
  dragIdx,
  dragOverIdx,
  onDragStart: onStart,
  onDragOver: onOver,
  onDrop: onDrop,
  onDragEnd: onEnd,
  children,
  className,
  ...props
}: DraggableThProps) {
  const isDragging = dragIdx === idx;
  const isOver = dragOverIdx === idx;

  const cls = [
    className,
    "cursor-grab active:cursor-grabbing select-none transition-colors",
    isDragging ? "bg-primary/20 text-primary" : "",
    isOver ? "bg-primary/10 border-l-2 border-l-primary" : "",
    !isDragging && !isOver ? "hover:bg-slate-200 dark:hover:bg-slate-700" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <th
      draggable
      onDragStart={() => onStart(idx)}
      onDragOver={(e) => onOver(e, idx)}
      onDrop={() => onDrop(idx)}
      onDragEnd={onEnd}
      className={cls}
      title={`Drag to reorder "${typeof children === "string" ? children : ""}" column`}
      {...props}
    >
      <span className="flex items-center gap-1">
        {children}
        <svg className="h-3 w-3 opacity-40 shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
          <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
        </svg>
      </span>
    </th>
  );
}
