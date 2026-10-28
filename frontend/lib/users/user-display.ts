export function getUserInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "LS";

  return words
    .slice(-2)
    .map((word) => Array.from(word)[0])
    .join("")
    .toLocaleUpperCase("vi-VN");
}
