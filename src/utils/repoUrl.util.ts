export const normalizeRepoUrl = (url: string): string => {
  return url
    .trim()
    .toLowerCase()
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
};
