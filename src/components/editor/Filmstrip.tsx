"use client";

import { useEditorStore } from "@/stores/editor-store";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, Plus, Trash } from "lucide-react";

function SortablePageItem({ page, index }: { page: any, index: number }) {
  const { selectedPageId, selectPage, duplicatePage, deletePage, document: doc } = useEditorStore();
  const isSelected = selectedPageId === page.id;
  const isLeft = index % 2 === 0;

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: page.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group flex-shrink-0"
    >
      <div
        className={`w-[72px] h-[100px] rounded-lg cursor-pointer transition-all duration-200 overflow-hidden ${isSelected ? "ring-2 ring-offset-2" : "hover:ring-1 hover:ring-offset-1"}`}
        style={{
          background: '#fbf8f3',
          boxShadow: isSelected
            ? '0 0 0 2px #1a1410, 0 0 0 4px #c4a882, 0 8px 20px rgba(196, 168, 130, 0.3)'
            : '0 2px 8px rgba(0,0,0,0.2)',
          borderLeft: isLeft ? '2px solid rgba(196, 168, 130, 0.15)' : 'none',
          borderRight: !isLeft ? '2px solid rgba(196, 168, 130, 0.15)' : 'none',
        }}
        onClick={() => selectPage(page.id)}
        {...attributes}
        {...listeners}
      >
        {/* Mini page representation */}
        <div className="p-2 h-full flex flex-col justify-between">
          <div className="text-[6px] font-medium truncate" style={{ color: '#5c4a36' }}>
            {page.name}
          </div>
          {/* Mini content preview dots */}
          <div className="flex flex-col gap-1">
            {page.objects.slice(0, 3).map((_: any, i: number) => (
              <div key={i} className="rounded-full" style={{ width: '60%', height: 2, background: 'rgba(196, 168, 130, 0.25)' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="absolute -top-2 -right-2 hidden group-hover:flex p-0.5 rounded-md gap-0.5 z-10"
        style={{
          background: 'rgba(30, 25, 20, 0.95)',
          border: '1px solid rgba(196, 168, 130, 0.2)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        <button
          className="p-1 rounded transition-colors"
          style={{ color: '#c4a882' }}
          onClick={(e) => { e.stopPropagation(); duplicatePage(page.id); }}
          title="Nhân bản"
        >
          <Copy size={11} />
        </button>
        <button
          className="p-1 rounded transition-colors hover:text-red-400"
          style={{ color: '#a0845e' }}
          onClick={(e) => { e.stopPropagation(); deletePage(page.id); }}
          title="Xoá"
        >
          <Trash size={11} />
        </button>
      </div>

      {/* Page number */}
      <div className="text-center mt-1.5 text-[10px] font-medium" style={{ color: '#a0845e' }}>
        {index + 1}
      </div>
    </div>
  );
}

export function Filmstrip() {
  const { document, movePage, addPage } = useEditorStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = document.pages.findIndex((p) => p.id === active.id);
      const newIndex = document.pages.findIndex((p) => p.id === over?.id);
      movePage(oldIndex, newIndex);
    }
  };

  return (
    <div className="h-40 flex items-center px-6 gap-3 overflow-x-auto overflow-y-visible w-full shrink-0 relative z-40"
      style={{
        borderTop: '1px solid rgba(196, 168, 130, 0.08)',
        background: 'linear-gradient(to top, rgba(26, 20, 16, 0.8), rgba(30, 25, 20, 0.4))',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Spread pairs label */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1 mr-2">
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: '#a0845e' }}>
          Trang
        </span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={document.pages.map(p => p.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-2 pb-3 pt-2 items-end">
            {document.pages.map((page, i) => (
              <SortablePageItem key={page.id} page={page} index={i} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add new page */}
      <div className="pb-3 pt-2 ml-2 flex-shrink-0">
        <button
          onClick={() => addPage()}
          className="w-[72px] h-[100px] flex flex-col items-center justify-center gap-2 rounded-lg transition-all group"
          style={{
            border: '2px dashed rgba(196, 168, 130, 0.2)',
            color: '#a0845e',
          }}
        >
          <div className="p-1.5 rounded-full transition-colors group-hover:bg-accent/15">
            <Plus size={20} />
          </div>
          <span className="text-[9px] font-medium">Thêm trang</span>
        </button>
      </div>
    </div>
  );
}
