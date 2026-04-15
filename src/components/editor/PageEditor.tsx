"use client";

import dynamic from "next/dynamic";
import { ObjectToolbar } from "./ObjectToolbar";
import { Filmstrip } from "./Filmstrip";
import { FloatingContextMenu } from "./FloatingContextMenu";

const BookCanvas = dynamic(
  () => import("./BookCanvas").then((module) => module.BookCanvas),
  { ssr: false, loading: () => (
    <div className="flex-1 flex items-center justify-center" style={{ color: '#a0845e' }}>
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#c4a882', borderTopColor: 'transparent' }} />
        <span className="text-sm font-medium">Đang tải canvas...</span>
      </div>
    </div>
  )}
);

export function PageEditor() {
  return (
    <div className="flex flex-col h-[calc(100vh-65px)] w-full relative overflow-hidden" style={{
      background: '#1a1410',
    }}>
      <div className="flex flex-1 overflow-hidden relative">
        <ObjectToolbar />
        <div className="flex-1 relative overflow-hidden">
          <BookCanvas />
          <FloatingContextMenu />
        </div>
      </div>
      <Filmstrip />
    </div>
  );
}
