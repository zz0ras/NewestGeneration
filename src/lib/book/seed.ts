import { nanoid } from "nanoid";
import { BookDocument } from "./types";
import { createTextObject, createShapeObject } from "./factories";

export const sampleBookDocument: BookDocument = {
  id: nanoid(),
  title: "Nhật Ký Hành Trình",
  description: "A warm pastel brown flipbook experience",
  pageSize: {
    width: 500,
    height: 700,
  },
  updatedAt: new Date().toISOString(),
  pages: [
    {
      id: nanoid(),
      name: "Trang 1",
      side: "left",
      objects: [
        // Warm background fill
        createShapeObject({ id: nanoid(), x: 0, y: 0, width: 500, height: 700, fill: "#fbf8f3" }),
        // Decorative top accent bar
        createShapeObject({ id: nanoid(), x: 40, y: 40, width: 420, height: 4, fill: "#c4a882" }),
        // Title
        createTextObject({
          id: nanoid(),
          text: "Chương Một",
          x: 40,
          y: 70,
          width: 420,
          fontSize: 36,
          fontFamily: "Inter",
          fill: "#5c4a36",
          fontStyle: "bold",
        }),
        // Subtitle
        createTextObject({
          id: nanoid(),
          text: "Khởi Đầu Mới",
          x: 40,
          y: 120,
          width: 420,
          fontSize: 18,
          fontFamily: "Inter",
          fill: "#a0845e",
          fontStyle: "italic",
        }),
        // Body text
        createTextObject({
          id: nanoid(),
          text: "Mỗi trang sách là một hành trình mới. Hãy để những dòng chữ dẫn lối bạn qua từng khoảng trời kỷ niệm...",
          x: 40,
          y: 180,
          width: 420,
          height: 200,
          fontSize: 15,
          fontFamily: "Inter",
          fill: "#6b5b4a",
          lineHeight: 1.7,
        }),
        // Bottom decorative element
        createShapeObject({ id: nanoid(), x: 200, y: 620, width: 100, height: 3, fill: "#d4bc9a" }),
      ],
    },
    {
      id: nanoid(),
      name: "Trang 2",
      side: "right",
      objects: [
        // Warm background fill
        createShapeObject({ id: nanoid(), x: 0, y: 0, width: 500, height: 700, fill: "#fbf8f3" }),
        // Quote decoration
        createShapeObject({ id: nanoid(), x: 60, y: 200, width: 4, height: 120, fill: "#c4a882" }),
        // Quote text
        createTextObject({
          id: nanoid(),
          text: "\"Cuộc sống không phải là chờ đợi bão qua, mà là học cách nhảy múa dưới cơn mưa.\"",
          x: 80,
          y: 210,
          width: 350,
          height: 130,
          fontSize: 20,
          fontFamily: "Inter",
          fill: "#5c4a36",
          fontStyle: "italic",
          lineHeight: 1.6,
        }),
        // Author
        createTextObject({
          id: nanoid(),
          text: "— Vivian Greene",
          x: 80,
          y: 340,
          width: 350,
          fontSize: 13,
          fontFamily: "Inter",
          fill: "#a0845e",
        }),
        // Bottom page ornament
        createShapeObject({ id: nanoid(), x: 200, y: 620, width: 100, height: 3, fill: "#d4bc9a" }),
      ],
    },
  ],
};
