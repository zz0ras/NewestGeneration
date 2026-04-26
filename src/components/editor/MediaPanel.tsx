"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, FolderOpen, FolderPlus, Image as ImageIcon, RefreshCw, Trash2, Video, Volume2, X } from "lucide-react";
import type { MediaAsset, PageObject } from "@/lib/book/types";
import { hasSpreadAudioConflict } from "@/lib/book/spread-audio";
import { fetchGoogleDriveFolderAssets, parseGoogleDriveFolderId } from "@/lib/media/google-drive";
import { useActiveMediaFolder, useEditorStore, useSelectedObject, useSelectedPage } from "@/stores/editor-store";

interface MediaPanelProps {
  isOpen: boolean;
  mediaIntent: "image" | "video" | "audio" | null;
  onClearMediaIntent: () => void;
  onClose: () => void;
}

function isMediaObject(object: PageObject | null): object is Extract<PageObject, { type: "image" | "video" | "audio" }> {
  return object?.type === "image" || object?.type === "video" || object?.type === "audio";
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-medium uppercase tracking-[0.16em] text-latte/70">{children}</label>;
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-[rgba(196,168,130,0.16)] bg-[rgba(250,245,239,0.06)] px-3 py-2 text-sm text-cream outline-none transition focus:border-[rgba(196,168,130,0.45)]"
    />
  );
}

export function MediaPanel({ isOpen, mediaIntent, onClearMediaIntent, onClose }: MediaPanelProps) {
  const selectedPage = useSelectedPage();
  const selectedObject = useSelectedObject();
  const activeMediaFolder = useActiveMediaFolder();
  const { document, addMediaFolder, removeMediaFolder, setActiveMediaFolder, replaceSelectedMediaSource, replacePageAudioSource, addObject } =
    useEditorStore();

  const [folderName, setFolderName] = useState("");
  const [folderUrl, setFolderUrl] = useState("");
  const [folderError, setFolderError] = useState<string | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [loadedFolderId, setLoadedFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !activeMediaFolder) return;

    let cancelled = false;

    void Promise.resolve().then(async () => {
      if (cancelled) return;

      setIsLoadingAssets(true);
      setMediaError(null);
      setSelectionError(null);

      try {
        const assets = await fetchGoogleDriveFolderAssets(activeMediaFolder.folderId);
        if (!cancelled) {
          setMediaAssets(assets);
          setLoadedFolderId(activeMediaFolder.folderId);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setMediaAssets([]);
          setLoadedFolderId(activeMediaFolder.folderId);
          setMediaError(error instanceof Error ? error.message : "Khong the tai media tu API.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAssets(false);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeMediaFolder, isOpen, refreshSeed]);

  const filteredMediaAssets = useMemo(() => {
    if (!activeMediaFolder) return [];
    const preferredType = mediaIntent ?? (isMediaObject(selectedObject) ? selectedObject.type : null);
    if (!preferredType) return mediaAssets;
    return mediaAssets.filter((asset) => asset.type === preferredType);
  }, [activeMediaFolder, mediaAssets, mediaIntent, selectedObject]);

  const panelTitle = mediaIntent
    ? mediaIntent === "image"
      ? "Them anh"
      : mediaIntent === "video"
        ? "Them video"
        : "Them audio"
    : isMediaObject(selectedObject)
      ? selectedObject.type === "image"
        ? "Thu vien anh"
        : selectedObject.type === "video"
          ? "Thu vien video"
          : "Thu vien audio"
      : "Media Library";

  const visibleMediaAssets =
    activeMediaFolder && loadedFolderId === activeMediaFolder.folderId ? filteredMediaAssets : [];
  const visibleMediaError = activeMediaFolder ? mediaError : null;
  const visibleLoading = activeMediaFolder ? isLoadingAssets : false;

  const handleFolderSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const folderId = parseGoogleDriveFolderId(folderUrl);
    if (!folderId) {
      setFolderError("Link Google Drive chua dung dinh dang folder share.");
      return;
    }

    addMediaFolder({
      name: folderName.trim() || `Folder ${document.mediaFolders.length + 1}`,
      shareUrl: folderUrl.trim(),
      folderId,
    });
    setFolderName("");
    setFolderUrl("");
    setFolderError(null);
  };

  const handleMediaAssetSelect = (asset: MediaAsset) => {
    setSelectionError(null);

    const pageAudioObject = selectedPage?.objects.find((object) => object.type === "audio") ?? null;
    const isReplacingSelectedAudio = isMediaObject(selectedObject) && selectedObject.type === "audio" && asset.type === "audio";
    const isAddingAudio = asset.type === "audio" && !isReplacingSelectedAudio;

    if (mediaIntent === "audio" && asset.type === "audio" && selectedPage && pageAudioObject) {
      replacePageAudioSource(selectedPage.id, pageAudioObject.id, asset);
      onClearMediaIntent();
      return;
    }

    if (isAddingAudio && selectedPage && hasSpreadAudioConflict(document, selectedPage.id)) {
      setSelectionError("Spread hien tai da co audio. Moi spread chi duoc phep co toi da 1 audio.");
      return;
    }

    if (mediaIntent) {
      addObject(asset.type, {
        src: asset.src,
        name: asset.name,
        thumbnailSrc: asset.thumbnailSrc,
        ...(asset.type === "image" || asset.type === "video" ? { fit: "contain" as const } : {}),
      });
      onClearMediaIntent();
      return;
    }

    if (isMediaObject(selectedObject) && selectedObject.type === asset.type) {
      replaceSelectedMediaSource(asset);
      return;
    }

    addObject(asset.type, {
      src: asset.src,
      name: asset.name,
      thumbnailSrc: asset.thumbnailSrc,
      ...(asset.type === "image" || asset.type === "video" ? { fit: "contain" as const } : {}),
    });
  };

  if (!isOpen) return null;

  return (
    <aside className="glass-panel z-30 flex h-full w-[320px] shrink-0 flex-col border-l-0 border-r border-[rgba(196,168,130,0.1)] bg-[rgba(24,19,15,0.9)]">
      <div className="flex items-center justify-between border-b border-[rgba(196,168,130,0.08)] px-5 py-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent/80">Media</div>
          <h2 className="mt-1 text-sm font-semibold text-cream">{panelTitle}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-[rgba(196,168,130,0.16)] p-2 text-latte/80 transition hover:border-[rgba(196,168,130,0.35)] hover:text-cream"
          title="Dong media panel"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <section className="glass-card rounded-2xl p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Folder Links</div>
          <form onSubmit={handleFolderSubmit} className="space-y-3">
            <div>
              <FieldLabel>Ten folder</FieldLabel>
              <Input value={folderName} onChange={setFolderName} placeholder="Vi du: Cover Assets" />
            </div>
            <div>
              <FieldLabel>Google Drive share URL</FieldLabel>
              <Input value={folderUrl} onChange={setFolderUrl} placeholder="https://drive.google.com/drive/folders/..." />
            </div>
            {folderError ? <div className="text-xs text-red-300">{folderError}</div> : null}
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(196,168,130,0.24)] bg-[rgba(196,168,130,0.14)] px-4 py-2.5 text-sm font-medium text-cream transition hover:border-[rgba(196,168,130,0.4)] hover:bg-[rgba(196,168,130,0.2)]"
            >
              <FolderPlus size={16} />
              Luu folder media
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {document.mediaFolders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[rgba(196,168,130,0.16)] px-4 py-4 text-sm text-latte/65">
                Chua co folder nao duoc luu vao document.
              </div>
            ) : (
              document.mediaFolders.map((folder) => {
                const isActive = folder.id === document.activeMediaFolderId;
                return (
                  <div
                    key={folder.id}
                    className={`rounded-2xl border px-3 py-3 transition ${isActive ? "border-[rgba(196,168,130,0.35)] bg-[rgba(196,168,130,0.14)]" : "border-[rgba(196,168,130,0.12)] bg-[rgba(250,245,239,0.04)]"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button type="button" onClick={() => setActiveMediaFolder(folder.id)} className="min-w-0 text-left">
                        <div className="truncate text-sm font-medium text-cream">{folder.name}</div>
                        <div className="mt-1 truncate text-xs text-latte/60">{folder.folderId}</div>
                      </button>
                      <div className="flex items-center gap-1">
                        {isActive ? <Check size={14} className="text-accent" /> : null}
                        <button
                          type="button"
                          onClick={() => removeMediaFolder(folder.id)}
                          className="rounded-lg p-1.5 text-latte/60 transition hover:bg-red-500/10 hover:text-red-300"
                          title="Xoa folder"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="glass-card rounded-2xl p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Asset Browser</div>
              <div className="mt-2 text-xs text-latte/70">
                {mediaIntent
                  ? `Chon mot ${mediaIntent === "image" ? "anh" : mediaIntent === "video" ? "video" : "audio"} tu thu vien de them vao trang hien tai.`
                  : isMediaObject(selectedObject)
                    ? "Chon asset de thay media hien tai hoac them moi."
                    : "Chon folder active de duyet media va them object vao editor."}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRefreshSeed((value) => value + 1)}
              className="rounded-lg border border-[rgba(196,168,130,0.14)] p-2 text-latte/70 transition hover:border-[rgba(196,168,130,0.3)] hover:text-cream"
              title="Refresh assets"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {mediaIntent ? (
              <button
                type="button"
                onClick={onClearMediaIntent}
                className="rounded-xl border border-[rgba(196,168,130,0.16)] px-3 py-2 text-sm text-latte/80 transition hover:border-[rgba(196,168,130,0.3)] hover:text-cream"
              >
                Huy thao tac them media
              </button>
            ) : null}

            <div className="inline-flex items-center gap-2 rounded-xl border border-[rgba(196,168,130,0.12)] bg-[rgba(250,245,239,0.04)] px-3 py-2 text-xs text-latte/70">
              <FolderOpen size={14} className="text-accent" />
              {activeMediaFolder ? activeMediaFolder.name : "Chua chon folder"}
            </div>
          </div>

          {visibleLoading ? <div className="text-sm text-latte/70">Dang tai assets...</div> : null}
          {visibleMediaError ? <div className="text-sm text-red-300">{visibleMediaError}</div> : null}
          {selectionError ? <div className="text-sm text-red-300">{selectionError}</div> : null}

          {!visibleLoading && !visibleMediaError && visibleMediaAssets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[rgba(196,168,130,0.16)] px-4 py-4 text-sm text-latte/65">
              {activeMediaFolder ? "Folder hien tai chua co asset phu hop." : "Chon folder active de xem media."}
            </div>
          ) : null}

          <div className="mt-3 space-y-2">
            {visibleMediaAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => handleMediaAssetSelect(asset)}
                className="flex w-full items-center gap-3 rounded-2xl border border-[rgba(196,168,130,0.12)] bg-[rgba(250,245,239,0.04)] px-3 py-3 text-left transition hover:border-[rgba(196,168,130,0.3)] hover:bg-[rgba(250,245,239,0.08)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(196,168,130,0.12)] text-accent">
                  {asset.type === "image" ? <ImageIcon size={18} /> : asset.type === "video" ? <Video size={18} /> : <Volume2 size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-cream">{asset.name}</div>
                  <div className="mt-1 truncate text-xs text-latte/60">{asset.src}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
