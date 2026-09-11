import type { ProjectResources } from "shared/lib/resources/types";

export interface SceneStats {
  index: number;
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  totalActors: number;
  actorsWithInteract: number;
  actorsWithUpdate: number;
  totalTriggers: number;
  triggersWithScript: number;
  inputScriptsCount: number;
  hasStartupScript: boolean;
  startupEventCount: number;
  solidTilesCount: number;
  totalTiles: number;
  parallaxLayers: number;
  backgroundName: string;
  musicName: string;
  estimatedSymbols: number;
  symbolBreakdown: {
    baseScene: number;
    actorFunctions: number;
    triggerFunctions: number;
    inputFunctions: number;
  };
}

export interface ProjectStatsResult {
  projectName: string;
  generatedAt: string;
  totalScenes: number;
  totalActors: number;
  totalActorsWithScripts: number;
  totalTriggers: number;
  totalTriggersWithScripts: number;
  totalCustomEvents: number;
  totalVariables: number;
  totalBackgrounds: number;
  totalSprites: number;
  totalMusicTracks: number;
  engineBaselineSymbols: number;
  assetSymbols: number;
  sceneSymbolsTotal: number;
  totalEstimatedSymbols: number;
  hucSymbolLimit: number;
  symbolUsagePercent: number;
  status: "HEALTHY" | "WARNING" | "CRITICAL";
  scenes: SceneStats[];
  top10Scenes: SceneStats[];
  markdown: string;
}

const findInputScriptEvents = (events?: any[]): any[] => {
  if (!events || !Array.isArray(events)) return [];
  const results: any[] = [];
  const search = (list: any[]) => {
    for (const evt of list) {
      if (!evt) continue;
      if (
        evt.command === "EVENT_SET_INPUT_SCRIPT" ||
        evt.command === "EVENT_INPUT_SCRIPT_SET"
      ) {
        results.push(evt);
      }
      if (evt.children && typeof evt.children === "object") {
        Object.values(evt.children).forEach((cList: any) => {
          if (Array.isArray(cList)) search(cList);
        });
      }
      if (Array.isArray(evt.true)) search(evt.true);
      if (Array.isArray(evt.false)) search(evt.false);
    }
  };
  search(events);
  return results;
};

const countEvents = (events?: any[]): number => {
  if (!events || !Array.isArray(events)) return 0;
  let count = 0;
  const search = (list: any[]) => {
    for (const evt of list) {
      if (!evt) continue;
      count++;
      if (evt.children && typeof evt.children === "object") {
        Object.values(evt.children).forEach((cList: any) => {
          if (Array.isArray(cList)) search(cList);
        });
      }
      if (Array.isArray(evt.true)) search(evt.true);
      if (Array.isArray(evt.false)) search(evt.false);
    }
  };
  search(events);
  return count;
};

export const calculateProjectStats = (
  project: ProjectResources,
): ProjectStatsResult => {
  const bgMap = new Map<string, string>();
  (project.backgrounds || []).forEach((bg) => {
    bgMap.set(bg.id, bg.name || bg.filename || "Background");
  });

  const musicMap = new Map<string, string>();
  (project.music || []).forEach((m) => {
    musicMap.set(m.id, m.name || m.filename || "Track");
  });

  const allScenes = (project.scenes || []) as any[];
  let totalActorsCount = 0;
  let totalActorsWithScriptsCount = 0;
  let totalTriggersCount = 0;
  let totalTriggersWithScriptsCount = 0;
  let sceneSymbolsSum = 0;

  const scenesStats: SceneStats[] = allScenes.map((scene, idx) => {
    const scNum = idx + 1;
    const actors = (scene.actors || []) as any[];
    const triggers = (scene.triggers || []) as any[];

    let actorsWithInteract = 0;
    let actorsWithUpdate = 0;
    actors.forEach((act: any) => {
      const hasInteract =
        (act.script && Array.isArray(act.script) && act.script.length > 0) ||
        (act.startScript &&
          Array.isArray(act.startScript) &&
          act.startScript.length > 0) ||
        !!act.text;
      const hasUpdate =
        act.updateScript &&
        Array.isArray(act.updateScript) &&
        act.updateScript.length > 0;

      if (hasInteract) actorsWithInteract++;
      if (hasUpdate) actorsWithUpdate++;
    });

    let triggersWithScript = 0;
    triggers.forEach((trig: any) => {
      const hasScript =
        (trig.script && Array.isArray(trig.script) && trig.script.length > 0) ||
        (trig.leaveScript &&
          Array.isArray(trig.leaveScript) &&
          trig.leaveScript.length > 0);
      if (hasScript) triggersWithScript++;
    });

    const sceneInputEvents = [
      ...findInputScriptEvents(scene.script),
      ...findInputScriptEvents(scene.startScript),
      ...actors.flatMap((act: any) => [
        ...findInputScriptEvents(act.script),
        ...findInputScriptEvents(act.startScript),
      ]),
      ...triggers.flatMap((trig: any) => [
        ...findInputScriptEvents(trig.script),
        ...findInputScriptEvents(trig.leaveScript),
      ]),
    ];
    const inputScriptsCount = sceneInputEvents.length;

    const startupEvents = (scene.script && scene.script.length > 0)
      ? scene.script
      : scene.startScript || [];
    const startupEventCount = countEvents(startupEvents);
    const hasStartupScript = startupEventCount > 0;

    let solidTiles = 0;
    if (scene.collisions && Array.isArray(scene.collisions)) {
      solidTiles = scene.collisions.filter((v: number) => v > 0).length;
    } else if (scene.collisions && (scene.collisions as any).length) {
      const colArr = scene.collisions as any;
      for (let i = 0; i < colArr.length; i++) {
        if (colArr[i] > 0) solidTiles++;
      }
    }

    // Symbol calculation per scene
    // Base symbols: run_scene_X_startup_step, run_scene_X_step, load_scene_X_actors,
    // scene_X_collisions, scene_X_palette_slots, SCENE_X_TYPE, SCENE_X_WIDTH, SCENE_X_HEIGHT, SCENE_X_SCR_SIZE
    const baseSceneSymbols = 9;

    let actorFunctions = 0;
    if (actorsWithInteract > 0) {
      actorFunctions += actorsWithInteract + 1; // individual helpers + interact_scene_X_actor
    }
    if (actorsWithUpdate > 0) {
      actorFunctions += actorsWithUpdate + 1; // individual helpers + update_scene_X_actors
    }

    let triggerFunctions = 0;
    if (triggersWithScript > 0) {
      triggerFunctions += triggersWithScript + 1; // individual helpers + interact_scene_X_trigger
    }

    let inputFunctions = 0;
    if (inputScriptsCount > 0) {
      inputFunctions += inputScriptsCount + 1; // individual helpers + check_scene_X_input
    }

    const estimatedSymbols =
      baseSceneSymbols +
      actorFunctions +
      triggerFunctions +
      inputFunctions;

    totalActorsCount += actors.length;
    totalActorsWithScriptsCount += actorsWithInteract + actorsWithUpdate;
    totalTriggersCount += triggers.length;
    totalTriggersWithScriptsCount += triggersWithScript;
    sceneSymbolsSum += estimatedSymbols;

    const w = scene.width || 32;
    const h = scene.height || 28;

    return {
      index: scNum,
      id: scene.id,
      name: scene.name || `Scene ${scNum}`,
      type: scene.type || "TOPDOWN",
      width: w,
      height: h,
      pixelWidth: w * 8,
      pixelHeight: h * 8,
      totalActors: actors.length,
      actorsWithInteract,
      actorsWithUpdate,
      totalTriggers: triggers.length,
      triggersWithScript,
      inputScriptsCount,
      hasStartupScript,
      startupEventCount,
      solidTilesCount: solidTiles,
      totalTiles: w * h,
      parallaxLayers: scene.parallax ? scene.parallax.length : 0,
      backgroundName: bgMap.get(scene.backgroundId) || "Default / None",
      musicName: musicMap.get(scene.musicId) || "None",
      estimatedSymbols,
      symbolBreakdown: {
        baseScene: baseSceneSymbols,
        actorFunctions,
        triggerFunctions,
        inputFunctions,
      },
    };
  });

  const engineBaselineSymbols = 380;
  const totalVars = project.variables?.variables?.length || 0;
  const totalScripts = project.scripts?.length || 0;
  const assetSymbols =
    (project.backgrounds?.length || 0) * 3 +
    (project.music?.length || 0) * 2 +
    (project.sprites?.length || 0) * 2 +
    (project.palettes?.length || 0) +
    totalVars +
    totalScripts;

  const totalEstimatedSymbols =
    engineBaselineSymbols + assetSymbols + sceneSymbolsSum;
  const hucSymbolLimit = 2048;
  const symbolUsagePercent = Math.round(
    (totalEstimatedSymbols / hucSymbolLimit) * 100,
  );

  let status: "HEALTHY" | "WARNING" | "CRITICAL" = "HEALTHY";
  if (symbolUsagePercent >= 90) {
    status = "CRITICAL";
  } else if (symbolUsagePercent >= 70) {
    status = "WARNING";
  }

  // Sort scenes by symbol count descending for top 10
  const top10Scenes = [...scenesStats]
    .sort((a, b) => b.estimatedSymbols - a.estimatedSymbols)
    .slice(0, 10);

  const projectName =
    (project as any).name || project.metadata?.name || "PC Engine Project";
  const generatedAt = new Date().toLocaleString();

  // Construct Markdown
  let md = "";
  md += `# Project Statistics & Global Symbol Report\n\n`;
  md += `**Project:** ${projectName}  \n`;
  md += `**Generated:** ${generatedAt}  \n`;
  md += `**Engine Target:** PC Engine (HuC / ALXPCE Engine)  \n\n`;

  md += `## 📊 Compiler Global Symbol Budget\n\n`;
  md += `HuC has a hardcoded limit of **${hucSymbolLimit} global symbols** (\`NUMGLBS\` in \`src/huc/defs.h\`). Exceeding this budget causes the fatal \`****** global symbol table overflow ******\` build error.\n\n`;

  const statusBadge =
    status === "HEALTHY"
      ? "🟢 HEALTHY"
      : status === "WARNING"
        ? "🟡 WARNING (Approaching Limit)"
        : "🔴 CRITICAL (Overflow Risk)";

  md += `| Metric | Value |\n`;
  md += `| :--- | :--- |\n`;
  md += `| **Status** | **${statusBadge}** |\n`;
  md += `| **Estimated Total Global Symbols** | **${totalEstimatedSymbols}** / ${hucSymbolLimit} (${symbolUsagePercent}%) |\n`;
  md += `| **Remaining Symbol Headroom** | **${Math.max(0, hucSymbolLimit - totalEstimatedSymbols)}** symbols |\n`;
  md += `| **Scene Generated Symbols** | ${sceneSymbolsSum} symbols |\n`;
  md += `| **Assets & Variables Symbols** | ${assetSymbols} symbols |\n`;
  md += `| **Core Engine Runtime Baseline** | ${engineBaselineSymbols} symbols |\n\n`;

  md += `## 🗺️ Scene-by-Scene Detailed Breakdown\n\n`;
  md += `| # | Scene Name | Type | Symbols | Actors (Interact / Update / Total) | Triggers (Scripted / Total) | Inputs | Startup Events | Dimensions | Collisions | Background | Music |\n`;
  md += `| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- |\n`;

  scenesStats.forEach((s) => {
    md += `| ${s.index} | **${s.name}** | ${s.type} | **${s.estimatedSymbols}** | ${s.actorsWithInteract}/${s.actorsWithUpdate}/${s.totalActors} | ${s.triggersWithScript}/${s.totalTriggers} | ${s.inputScriptsCount} | ${s.startupEventCount} | ${s.width}x${s.height} | ${s.solidTilesCount} tiles | ${s.backgroundName} | ${s.musicName} |\n`;
  });

  md += `\n---\n\n`;

  md += `## 📈 Global Project Summary\n\n`;
  md += `| Resource Category | Count |\n`;
  md += `| :--- | :--- |\n`;
  md += `| **Total Scenes** | ${allScenes.length} |\n`;
  md += `| **Total Actors** | ${totalActorsCount} (${totalActorsWithScriptsCount} with scripts/updates) |\n`;
  md += `| **Total Triggers** | ${totalTriggersCount} (${totalTriggersWithScriptsCount} with scripts) |\n`;
  md += `| **Total Custom Scripts** | ${totalScripts} |\n`;
  md += `| **Total Project Variables** | ${totalVars} |\n`;
  md += `| **Total Backgrounds** | ${project.backgrounds?.length || 0} |\n`;
  md += `| **Total Sprite Sheets** | ${project.sprites?.length || 0} |\n`;
  md += `| **Total Music Tracks** | ${project.music?.length || 0} |\n`;
  md += `| **Total Palettes** | ${project.palettes?.length || 0} |\n\n`;

  md += `## 🏆 Top 10 Scenes with the Most Symbols\n\n`;
  md += `These scenes contribute the most to the global symbol table budget. If you encounter \`global symbol table overflow\`, prioritize optimizing or splitting these scenes first:\n\n`;

  md += `| Rank | # | Scene Name | Est. Symbols | Actors with Scripts | Triggers with Scripts | Button Inputs | Main Symbol Drivers |\n`;
  md += `| :---: | :---: | :--- | :---: | :---: | :---: | :---: | :--- |\n`;

  top10Scenes.forEach((s, rIdx) => {
    const drivers: string[] = [];
    if (s.actorsWithInteract > 3)
      drivers.push(`${s.actorsWithInteract} interact actors`);
    if (s.actorsWithUpdate > 1)
      drivers.push(`${s.actorsWithUpdate} update actor loops`);
    if (s.triggersWithScript > 3)
      drivers.push(`${s.triggersWithScript} scripted triggers`);
    if (s.inputScriptsCount > 0)
      drivers.push(`${s.inputScriptsCount} button inputs`);
    if (drivers.length === 0) drivers.push("Base scene overhead");

    md += `| **#${rIdx + 1}** | ${s.index} | **${s.name}** | **${s.estimatedSymbols}** | ${s.actorsWithInteract + s.actorsWithUpdate} | ${s.triggersWithScript} | ${s.inputScriptsCount} | ${drivers.join(", ")} |\n`;
  });

  md += `\n### 💡 Optimization Guidelines to Free Global Symbols:\n`;
  md += `1. **Delete Obsolete Scenes**: Each scene incurs a baseline of ~9 symbols plus all child scripts.\n`;
  md += `2. **Remove Empty/Unused Trigger Scripts**: Triggers without scripts produce 0 symbol overhead.\n`;
  md += `3. **Remove Dialogue/Scripts from Static NPCs**: Use decorative sprites or combine dialogue sequences.\n`;
  md += `4. **Reduce Actor Update Scripts**: Replace multiple independent update loops with centralized timers where possible.\n`;

  return {
    projectName,
    generatedAt,
    totalScenes: allScenes.length,
    totalActors: totalActorsCount,
    totalActorsWithScripts: totalActorsWithScriptsCount,
    totalTriggers: totalTriggersCount,
    totalTriggersWithScripts: totalTriggersWithScriptsCount,
    totalCustomEvents: totalScripts,
    totalVariables: totalVars,
    totalBackgrounds: project.backgrounds?.length || 0,
    totalSprites: project.sprites?.length || 0,
    totalMusicTracks: project.music?.length || 0,
    engineBaselineSymbols,
    assetSymbols,
    sceneSymbolsTotal: sceneSymbolsSum,
    totalEstimatedSymbols,
    hucSymbolLimit,
    symbolUsagePercent,
    status,
    scenes: scenesStats,
    top10Scenes,
    markdown: md,
  };
};
