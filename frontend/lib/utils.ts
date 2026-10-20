import { createCn } from "cn/config";

// These Tailwind theme tokens are font sizes, not text colors.
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["ui", "ui-caption", "ui-meta", "ui-document", "ui-section", "ui-card", "ui-dialog", "ui-title"] }],
    },
  },
});
