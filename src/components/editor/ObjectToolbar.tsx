import { useEditorStore } from "@/stores/editor-store";
import { Type, Square, Image as ImageIcon, Video, Palette } from "lucide-react";

export function ObjectToolbar() {
  const addObject = useEditorStore((state) => state.addObject);
  const selectedPageId = useEditorStore((state) => state.selectedPageId);
  const disabled = !selectedPageId;

  const tools = [
    { type: "text" as const, icon: Type, label: "Văn bản" },
    { type: "shape" as const, icon: Square, label: "Hình khối" },
    { type: "image" as const, icon: ImageIcon, label: "Hình ảnh" },
    { type: "video" as const, icon: Video, label: "Video" },
  ];

  return (
    <aside className="w-[68px] flex flex-col items-center py-5 gap-1 glass-panel z-40 shrink-0" style={{
      borderRight: '1px solid rgba(196, 168, 130, 0.1)',
      background: 'rgba(26, 20, 16, 0.6)',
    }}>
      {tools.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          disabled={disabled}
          onClick={() => addObject(type)}
          className="group relative p-3 rounded-xl glass-button disabled:opacity-20 disabled:pointer-events-none"
          title={label}
        >
          <Icon size={19} className="transition-transform group-hover:scale-110" />
          {/* Tooltip */}
          <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all -translate-x-1 group-hover:translate-x-0 z-50"
            style={{ 
              background: 'rgba(40, 32, 24, 0.95)', 
              border: '1px solid rgba(196, 168, 130, 0.2)', 
              color: '#e8ddd0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}>
            {label}
          </div>
        </button>
      ))}
      
      <div className="w-8 h-px my-2" style={{ background: 'rgba(196, 168, 130, 0.12)' }} />

      {/* Theme button */}
      <button 
        disabled={disabled}
        className="group relative p-3 rounded-xl glass-button disabled:opacity-20 disabled:pointer-events-none"
        title="Chủ đề"
        style={{ color: '#c4a882' }}
      >
        <Palette size={19} className="transition-transform group-hover:scale-110" />
        <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all -translate-x-1 group-hover:translate-x-0 z-50"
          style={{ 
            background: 'rgba(40, 32, 24, 0.95)', 
            border: '1px solid rgba(196, 168, 130, 0.2)', 
            color: '#e8ddd0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
          Chủ đề
        </div>
      </button>
    </aside>
  );
}
