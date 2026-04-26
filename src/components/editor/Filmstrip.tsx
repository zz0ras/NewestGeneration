"use client";

import { useId } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, Plus, Trash, Volume2 } from "lucide-react";
import type { BookPage } from "@/lib/book/types";
import { useEditorStore } from "@/stores/editor-store";

function SortablePageItem({ page, index, total }: { page: BookPage; index: number; total?: number }) {
  const { selectedPageId, selectPage, duplicatePage, deletePage } = useEditorStore();
  const isSelected = selectedPageId === page.id;
  const isLeft = index % 2 === 0;
  const hasAudio = page.objects.some((object) => object.type === "audio");

  let label = `${index + 1}`;
  if (total) {
    if (index === 0) label = "Bìa trước";
    else if (index === total - 1 && total % 2 === 0) label = "Bìa sau";
  }

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: page.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group flex-shrink-0">
      <div
        className={`h-[100px] w-[72px] cursor-pointer overflow-hidden rounded-lg transition-all duration-200 ${isSelected ? "ring-2 ring-offset-2" : "hover:ring-1 hover:ring-offset-1"}`}
        style={{
          background: "#fbf8f3",
          boxShadow: isSelected
            ? "0 0 0 2px #1a1410, 0 0 0 4px #c4a882, 0 8px 20px rgba(196, 168, 130, 0.3)"
            : "0 2px 8px rgba(0,0,0,0.2)",
          borderLeft: isLeft ? "2px solid rgba(196, 168, 130, 0.15)" : "none",
          borderRight: !isLeft ? "2px solid rgba(196, 168, 130, 0.15)" : "none",
        }}
        onClick={() => selectPage(page.id)}
        {...attributes}
        {...listeners}
      >
        {hasAudio ? (
          <div
            className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full"
            style={{
              background: "rgba(30, 25, 20, 0.88)",
              border: "1px solid rgba(196, 168, 130, 0.35)",
              color: "#c4a882",
              boxShadow: "0 3px 8px rgba(0,0,0,0.24)",
            }}
            title="Trang nay co audio"
          >
            <Volume2 size={11} />
          </div>
        ) : null}
        <div className="flex h-full flex-col justify-between p-2">
          <div className="truncate text-[6px] font-medium" style={{ color: "#5c4a36" }}>
            {page.name}
          </div>
          <div className="flex flex-col gap-1">
            {page.objects.slice(0, 3).map((object) => (
              <div key={object.id} className="rounded-full" style={{ width: "60%", height: 2, background: "rgba(196, 168, 130, 0.25)" }} />
            ))}
          </div>
        </div>
      </div>

      <div
        className="absolute -top-2 -right-2 hidden gap-0.5 rounded-md p-0.5 group-hover:flex z-10"
        style={{
          background: "rgba(30, 25, 20, 0.95)",
          border: "1px solid rgba(196, 168, 130, 0.2)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}
      >
        <button
          className="rounded p-1 transition-colors"
          style={{ color: "#c4a882" }}
          onClick={(event) => {
            event.stopPropagation();
            duplicatePage(page.id);
          }}
          title="Nhân bản"
        >
          <Copy size={11} />
        </button>
        <button
          className="rounded p-1 transition-colors hover:text-red-400"
          style={{ color: "#a0845e" }}
          onClick={(event) => {
            event.stopPropagation();
            deletePage(page.id);
          }}
          title="Xóa"
        >
          <Trash size={11} />
        </button>
      </div>

      <div className="mt-1.5 text-center text-[10px] font-medium" style={{ color: "#a0845e" }}>
        {label}
      </div>
    </div>
  );
}

export function Filmstrip() {
  const { document, movePage, addPage } = useEditorStore();
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = document.pages.findIndex((page) => page.id === active.id);
    const newIndex = document.pages.findIndex((page) => page.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    movePage(oldIndex, newIndex);
  };

  return (
    <div
      className="relative z-40 flex h-40 w-full shrink-0 items-center gap-3 overflow-x-auto overflow-y-visible px-6"
      style={{
        borderTop: "1px solid rgba(196, 168, 130, 0.08)",
        background: "linear-gradient(to top, rgba(26, 20, 16, 0.8), rgba(30, 25, 20, 0.4))",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="mr-2 flex flex-shrink-0 flex-col items-center gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#a0845e" }}>
          Trang
        </span>
      </div>

      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={document.pages.map((page) => page.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex items-end gap-2 pb-3 pt-2">
            {document.pages.map((page, index) => (
              <SortablePageItem key={page.id} page={page} index={index} total={document.pages.length} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="ml-2 flex-shrink-0 pb-3 pt-2">
        <button
          onClick={() => addPage()}
          className="group flex h-[100px] w-[72px] flex-col items-center justify-center gap-2 rounded-lg transition-all"
          style={{
            border: "2px dashed rgba(196, 168, 130, 0.2)",
            color: "#a0845e",
          }}
        >
          <div className="rounded-full p-1.5 transition-colors group-hover:bg-accent/15">
            <Plus size={20} />
          </div>
          <span className="text-[9px] font-medium">Thêm trang</span>
        </button>
      </div>
    </div>
  );
}
