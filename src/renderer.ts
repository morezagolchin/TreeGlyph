import { setTooltip } from "obsidian";
import { buildBranches, layoutTrees, walk } from "./layout";
import type { Branch, Layout } from "./layout";
import { parseTree } from "./parser";

function lineageClass(lineage: number | null): string {
  return lineage === null ? "treeglyph-trunk" : `treeglyph-lineage-${lineage}`;
}

function lineagePath(branch: Branch): string {
  const names: string[] = [];
  for (let current: Branch | null = branch; current; current = current.parent) {
    names.unshift(current.node.name);
  }
  return names.join(" › ");
}

function drawLines(map: HTMLElement, layout: Layout): void {
  const { width, height } = layout;
  const svg = map.createSvg("svg", {
    cls: "treeglyph-lines",
    attr: { width, height, viewBox: `0 0 ${width} ${height}` },
    prepend: true,
  });

  layout.lines.forEach((line) => {
    const d = line.points.map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`).join(" ");
    svg.createSvg("path", { cls: ["treeglyph-line", lineageClass(line.lineage)], attr: { d } });
  });

  layout.marks.forEach((mark) => {
    svg.createSvg("circle", {
      cls: [mark.leaf ? "treeglyph-dot" : "treeglyph-junction", lineageClass(mark.lineage)],
      attr: { cx: mark.x, cy: mark.y, r: mark.radius },
    });
  });
}

export function renderTreeGlyph(source: string, container: HTMLElement): void {
  const trees = buildBranches(parseTree(source));

  // Labels must be in a document to be measured, and the container usually isn't attached yet.
  const map = container.doc.body.createDiv({ cls: ["treeglyph-map", "treeglyph-measuring"] });
  try {
    const labels: Array<[Branch, HTMLElement]> = [];
    walk(trees, (branch) => {
      const label = map.createSpan({
        cls: branch.node.vertical ? ["treeglyph-label", "treeglyph-label-vertical"] : "treeglyph-label",
        text: branch.node.name,
      });
      setTooltip(label, lineagePath(branch));
      labels.push([branch, label]);
    });

    labels.forEach(([branch, label]) => {
      const box = label.getBoundingClientRect();
      branch.labelWidth = box.width;
      branch.labelHeight = box.height;
    });

    const em = parseFloat(map.win.getComputedStyle(map).fontSize);
    const layout = layoutTrees(trees, em);

    labels.forEach(([branch, label]) => {
      label.setCssStyles({ left: `${branch.labelX}px`, top: `${branch.labelY}px` });
    });
    map.setCssStyles({ width: `${layout.width}px`, height: `${layout.height}px` });
    drawLines(map, layout);
  } catch (error) {
    map.detach();
    throw error;
  }

  map.removeClass("treeglyph-measuring");
  container.appendChild(map);
}
