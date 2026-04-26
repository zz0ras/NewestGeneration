import { nanoid } from "nanoid";
import type { BookDocument } from "./types";
import { createShapeObject, createTextObject } from "./factories";

export const DEFAULT_PAGE_SIZE = {
  width: 1024,
  height: 1536,
} as const;

export const sampleBookDocument: BookDocument = {
  id: nanoid(),
  title: "Nhật Ký Hành Trình",
  description: "A warm pastel brown flipbook experience",
  pageSize: {
    width: DEFAULT_PAGE_SIZE.width,
    height: DEFAULT_PAGE_SIZE.height,
  },
  updatedAt: new Date().toISOString(),
  mediaFolders: [],
  activeMediaFolderId: null,
  fontAssets: [],
  pages: [
    {
      id: nanoid(),
      name: "Trang 1",
      side: "left",
      objects: [
        createShapeObject({ id: nanoid(), x: 0, y: 0, width: DEFAULT_PAGE_SIZE.width, height: DEFAULT_PAGE_SIZE.height, fill: "#fbf8f3" }),
        createShapeObject({ id: nanoid(), x: 82, y: 88, width: 860, height: 9, fill: "#c4a882" }),
        createTextObject({
          id: nanoid(),
          text: "Chương Một",
          x: 82,
          y: 154,
          width: 860,
          fontSize: 79,
          fill: "#5c4a36",
          fontWeight: "bold",
        }),
        createTextObject({
          id: nanoid(),
          text: "Khởi Đầu Mới",
          x: 82,
          y: 263,
          width: 860,
          fontSize: 40,
          fill: "#a0845e",
          fontStyle: "italic",
        }),
        createTextObject({
          id: nanoid(),
          text: "Mỗi trang sách là một hành trình mới. Hãy để những dòng chữ dẫn lối bạn qua từng khoảng trời kỷ niệm và những chất liệu hình ảnh giàu cảm xúc.",
          x: 82,
          y: 395,
          width: 860,
          height: 439,
          fontSize: 33,
          fill: "#6b5b4a",
          lineHeight: 1.7,
        }),
        createShapeObject({ id: nanoid(), x: 410, y: 1360, width: 205, height: 7, fill: "#d4bc9a" }),
      ],
    },
    {
      id: nanoid(),
      name: "Trang 2",
      side: "right",
      objects: [
        createShapeObject({ id: nanoid(), x: 0, y: 0, width: DEFAULT_PAGE_SIZE.width, height: DEFAULT_PAGE_SIZE.height, fill: "#fbf8f3" }),
        createShapeObject({ id: nanoid(), x: 123, y: 439, width: 8, height: 263, fill: "#c4a882" }),
        createTextObject({
          id: nanoid(),
          text: "\"Cuộc sống không phải là chờ đợi bão qua, mà là học cách nhảy múa dưới cơn mưa.\"",
          x: 164,
          y: 461,
          width: 717,
          height: 285,
          fontSize: 44,
          fill: "#5c4a36",
          fontStyle: "italic",
          lineHeight: 1.6,
        }),
        createTextObject({
          id: nanoid(),
          text: "Vivian Greene",
          x: 164,
          y: 746,
          width: 717,
          fontSize: 29,
          fill: "#a0845e",
        }),
        createShapeObject({ id: nanoid(), x: 410, y: 1360, width: 205, height: 7, fill: "#d4bc9a" }),
      ],
    },
  ],
};
