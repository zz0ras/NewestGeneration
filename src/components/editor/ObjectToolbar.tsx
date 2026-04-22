import { useEditorStore } from "@/stores/editor-store";
import { Type, Square, Image as ImageIcon, Video, Palette, FolderOpen, Volume2 } from "lucide-react";
import type { ObjectTemplateType } from "@/lib/book/types";

interface ObjectToolbarProps {
  onStartMediaInsert: (type: "image" | "video" | "audio") => void;
  onToggleMediaPanel: () => void;
  isMediaPanelOpen: boolean;
}

interface ToolDefinition {
  type: ObjectTemplateType;
  icon: typeof Type;
  label: string;
}

export function ObjectToolbar({ onStartMediaInsert, onToggleMediaPanel, isMediaPanelOpen }: ObjectToolbarProps) {
  const addObject = useEditorStore((state) => state.addObject);
  const selectedPageId = useEditorStore((state) => state.selectedPageId);
  const disabled = !selectedPageId;

  const tools: ToolDefinition[] = [
    { type: "text", icon: Type, label: "Van ban" },
    { type: "shape", icon: Square, label: "Hinh khoi" },
    { type: "image", icon: ImageIcon, label: "Hinh anh" },
    { type: "video", icon: Video, label: "Video" },
    { type: "audio", icon: Volume2, label: "Audio" },
  ];

  return (
    <aside
      className="glass-panel z-40 flex w-[68px] shrink-0 flex-col items-center gap-1 py-5"
      style={{
        borderRight: "1px solid rgba(196, 168, 130, 0.1)",
        background: "rgba(26, 20, 16, 0.6)",
      }}
    >
      {tools.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          disabled={disabled}
          onClick={() => {
            if (type === "image" || type === "video" || type === "audio") {
              onStartMediaInsert(type);
              return;
            }
            addObject(type);
          }}
          className="glass-button group relative rounded-xl p-3 disabled:pointer-events-none disabled:opacity-20"
          title={label}
        >
          <Icon size={19} className="transition-transform group-hover:scale-110" />
          <div
            className="pointer-events-none absolute left-full z-50 ml-3 -translate-x-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
            style={{
              background: "rgba(40, 32, 24, 0.95)",
              border: "1px solid rgba(196, 168, 130, 0.2)",
              color: "#e8ddd0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            {type === "image" || type === "video" || type === "audio" ? `${label} tu media` : label}
          </div>
        </button>
      ))}

      <div className="my-2 h-px w-8" style={{ background: "rgba(196, 168, 130, 0.12)" }} />

      <button
        disabled={disabled}
        onClick={onToggleMediaPanel}
        className={`glass-button group relative rounded-xl p-3 disabled:pointer-events-none disabled:opacity-20 ${isMediaPanelOpen ? "border-[rgba(196,168,130,0.36)] bg-[rgba(196,168,130,0.2)]" : ""}`}
        title="Thu vien media"
      >
        <FolderOpen size={19} className="transition-transform group-hover:scale-110" />
        <div
          className="pointer-events-none absolute left-full z-50 ml-3 -translate-x-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
          style={{
            background: "rgba(40, 32, 24, 0.95)",
            border: "1px solid rgba(196, 168, 130, 0.2)",
            color: "#e8ddd0",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          Thu vien media
        </div>
      </button>

      <button
        disabled={disabled}
        className="glass-button group relative rounded-xl p-3 disabled:pointer-events-none disabled:opacity-20"
        title="Chu de"
        style={{ color: "#c4a882" }}
      >
        <Palette size={19} className="transition-transform group-hover:scale-110" />
        <div
          className="pointer-events-none absolute left-full z-50 ml-3 -translate-x-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
          style={{
            background: "rgba(40, 32, 24, 0.95)",
            border: "1px solid rgba(196, 168, 130, 0.2)",
            color: "#e8ddd0",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          Chu de
        </div>
      </button>
    </aside>
  );
}
