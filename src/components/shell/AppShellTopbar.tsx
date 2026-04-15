import { useEditorStore } from "@/stores/editor-store";
import { Undo, Redo, LayoutTemplate, MonitorPlay, Save, BookOpen } from "lucide-react";

export function AppShellTopbar() {
  const { mode, setMode, history, undo, redo, document, updateDocumentMeta } = useEditorStore();

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return (
    <header className="flex items-center justify-between px-6 py-3 glass-panel z-50" style={{
      borderBottom: '1px solid rgba(196, 168, 130, 0.1)',
    }}>
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <BookOpen size={22} style={{ color: '#c4a882' }} />
          <h1 className="text-lg font-bold tracking-wide" style={{
            background: 'linear-gradient(135deg, #c4a882, #d4bc9a, #e8ddd0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            NextGeneration
          </h1>
        </div>
        <div className="h-5 w-px" style={{ background: 'rgba(196, 168, 130, 0.2)' }} />
        <input 
          type="text" 
          value={document.title} 
          onChange={(e) => updateDocumentMeta({ title: e.target.value })}
          className="bg-transparent border-none text-sm outline-none w-64 px-2 py-1 rounded transition-colors"
          style={{ 
            color: '#e8ddd0',
          }}
        />
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        {/* Undo/Redo */}
        {mode === "design" && (
          <div className="flex gap-1 mr-3">
            <button 
              onClick={undo} 
              disabled={!canUndo}
              className="p-2 rounded-lg glass-button disabled:opacity-30 interactive-bounce"
              title="Hoàn tác"
            >
              <Undo size={17} />
            </button>
            <button 
              onClick={redo} 
              disabled={!canRedo}
              className="p-2 rounded-lg glass-button disabled:opacity-30 interactive-bounce"
              title="Làm lại"
            >
              <Redo size={17} />
            </button>
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex rounded-xl overflow-hidden glass-card p-1">
          <button 
            onClick={() => setMode("design")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={mode === "design" ? {
              background: 'linear-gradient(135deg, #c4a882, #a0845e)',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(196, 168, 130, 0.3)',
            } : {
              color: 'rgba(232, 221, 208, 0.5)',
            }}
          >
            <LayoutTemplate size={15} /> Thiết kế
          </button>
          <button 
            onClick={() => setMode("preview")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={mode === "preview" ? {
              background: 'linear-gradient(135deg, #c4a882, #a0845e)',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(196, 168, 130, 0.3)',
            } : {
              color: 'rgba(232, 221, 208, 0.5)',
            }}
          >
            <MonitorPlay size={15} /> Xem trước
          </button>
        </div>
        
        {/* Export */}
        <button className="flex items-center gap-2 px-4 py-2 ml-3 font-medium rounded-xl transition-all interactive-bounce"
          style={{
            background: 'rgba(196, 168, 130, 0.15)',
            border: '1px solid rgba(196, 168, 130, 0.25)',
            color: '#c4a882',
          }}
        >
          <Save size={15} /> Xuất file
        </button>
      </div>
    </header>
  );
}
