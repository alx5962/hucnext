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
    .replace(/(\.gb|\.gbc|\.pocket|\.pce|\.sgx|\.iso|\.cue)$/i, "")
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
  targetSystem: string = "pce",
): string => {
  let fileExt = "pce";
  if (targetSystem === "sgx") {
    fileExt = "sgx";
  } else if (targetSystem === "iso" || targetSystem === "cd") {
    fileExt = "iso";
  }
  const fileStem = getROMFileStem(overrideName, projectName);
  return `${fileStem}.${fileExt}`;
};

export const kebabCase = (string: string): string =>
  string.toLocaleLowerCase().replace(/[ ]+/g, "-");
