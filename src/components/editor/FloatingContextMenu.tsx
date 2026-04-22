import { useEditorStore, useSelectedObject, useSelectedPage } from "@/stores/editor-store";
import { Trash2, BringToFront, SendToBack, Settings2, Replace } from "lucide-react";

export function FloatingContextMenu() {
  const selectedObject = useSelectedObject();
  const selectedPage = useSelectedPage();
  const { deleteObject, moveObjectLayer } = useEditorStore();

  if (!selectedObject || !selectedPage) return null;

  const handleDelete = () => deleteObject(selectedPage.id, selectedObject.id);
  const handleBringForward = () => moveObjectLayer(selectedPage.id, selectedObject.id, "forward");
  const handleSendBackward = () => moveObjectLayer(selectedPage.id, selectedObject.id, "backward");

  return (
    <div
      className="absolute right-4 top-4 z-50 flex items-center gap-0.5 rounded-xl px-2 py-1.5 transition-all duration-200"
      style={{
        background: "rgba(30, 25, 20, 0.92)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(196, 168, 130, 0.18)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(196, 168, 130, 0.05)",
      }}
    >
      <div
        className="flex items-center px-2 text-[10px] font-bold uppercase tracking-widest"
        style={{
          color: "#c4a882",
          borderRight: "1px solid rgba(196, 168, 130, 0.15)",
          marginRight: 4,
          paddingRight: 8,
        }}
      >
        {selectedObject.type}
      </div>

      <button onClick={handleBringForward} className="rounded-md p-1.5 transition-colors" style={{ color: "#d4bc9a" }} title="Đưa lên trước">
        <BringToFront size={15} />
      </button>
      <button onClick={handleSendBackward} className="rounded-md p-1.5 transition-colors" style={{ color: "#d4bc9a" }} title="Đưa ra sau">
        <SendToBack size={15} />
      </button>

      {selectedObject.type === "text" ? (
        <button className="rounded-md p-1.5 transition-colors" style={{ color: "#d4bc9a" }} title="Chỉnh trong inspector">
          <Settings2 size={15} />
        </button>
      ) : null}

      {selectedObject.type === "image" || selectedObject.type === "video" || selectedObject.type === "audio" ? (
        <button className="rounded-md p-1.5 transition-colors" style={{ color: "#d4bc9a" }} title="Thay media trong inspector">
          <Replace size={15} />
        </button>
      ) : null}

      <div className="mx-1 h-4 w-px" style={{ background: "rgba(196, 168, 130, 0.15)" }} />

      <button
        onClick={handleDelete}
        className="rounded-md p-1.5 transition-colors hover:bg-red-500/15"
        style={{ color: "#cc7b7b" }}
        title="Xóa"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
