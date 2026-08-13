import stripInvalidFilenameCharacters from "./stripInvalidFilenameCharacters";

export const getROMFileStem = (
  overrideName: string = "",
  projectName: string = "",
): string => {
  const safeOverride = typeof overrideName === "string" ? overrideName : "";
  const safeProject = typeof projectName === "string" ? projectName : "";

  const source =
    stripInvalidFilenameCharacters(safeOverride).trim().length > 0
      ? safeOverride
      : kebabCase(safeProject.trim());

  const stem = stripInvalidFilenameCharacters(source)
    .replace(/(\.gb|\.gbc|\.pocket|\.pce)$/i, "")
    .trim();

  if (stem.replace(/-/g, "").length === 0) {
    return "game";
  }

  return stem;
};

export const getROMFilename = (
  overrideName: string,
  projectName: string,
  isColorOnly?: boolean,
  buildType?: string,
): string => {
  const fileExt = "pce";
  const fileStem = getROMFileStem(overrideName, projectName);
  return `${fileStem}.${fileExt}`;
};

export const kebabCase = (string: string): string =>
  string.toLocaleLowerCase().replace(/[ ]+/g, "-");
