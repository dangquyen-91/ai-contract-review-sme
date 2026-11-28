/** Up to two letters for an avatar: "Nguyễn Văn An" → "VA". Empty when there is no name. */
export function nameInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0))
    .join("")
    .toLocaleUpperCase("vi-VN");
}
