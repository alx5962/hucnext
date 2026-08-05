import stripInvalidFilenameCharacters from "./stripInvalidFilenameCharacters";

export const getROMFileStem = (
  overrideName: string,
  projectName: string,
): string => {
  const source =
    stripInvalidFilenameCharacters(overrideName).trim().length > 0
      ? overrideName
      : kebabCase(projectName.trim());

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
