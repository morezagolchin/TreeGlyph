import type { TreeNode } from "./parser";

// Spacing, in multiples of the label font size.
const ROW = 2.4; // distance between neighbouring leaves
const GAP = 0.6; // space between a label and the lines around it
const RISE = 0.2; // space between a line and the label sitting on it
const LEAF_EDGE = 1.8; // length of the line leading to a leaf's dot
const STUB = 1.2; // line on either side of a vertical label
const TREE_GAP = 1.2; // extra space between separate trees
const MARGIN = 0.8;
const JUNCTION_RADIUS = 0.32;
const DOT_RADIUS = 0.22;

// Number of lineage colours defined in styles.css.
const PALETTE_SIZE = 8;

// One placement of a node. A node listed under several parents gets a branch under each.
export type Branch = {
  node: TreeNode;
  parent: Branch | null;
  children: Branch[];
  // Colour index shared by a whole lineage; null for the trunk above a tree's first split.
  lineage: number | null;
  // Label box size, measured before layout.
  labelWidth: number;
  labelHeight: number;
  // Set by layout: the junction (or a leaf's dot) and the top-left corner of the label.
  x: number;
  y: number;
  labelX: number;
  labelY: number;
};

export type Line = {
  lineage: number | null;
  points: Array<[number, number]>;
};

export type Mark = {
  lineage: number | null;
  leaf: boolean;
  x: number;
  y: number;
  radius: number;
};

export type Layout = {
  width: number;
  height: number;
  lines: Line[];
  marks: Mark[];
};

function isLeaf(branch: Branch): boolean {
  return branch.children.length === 0;
}

// Vertical labels on inner nodes interrupt the incoming line instead of sitting on it.
function interrupts(branch: Branch): boolean {
  return branch.node.vertical && !isLeaf(branch);
}

export function walk(branches: Branch[], visit: (branch: Branch) => void): void {
  branches.forEach((branch) => {
    visit(branch);
    walk(branch.children, visit);
  });
}

export function buildBranches(root: TreeNode): Branch[] {
  const ancestors = new Set<TreeNode>();
  let nextLineage = 0;

  function build(node: TreeNode, parent: Branch | null, lineage: number | null): Branch {
    if (ancestors.has(node)) {
      throw new Error(`${node.name} is listed under itself`);
    }

    const branch: Branch = {
      node,
      parent,
      children: [],
      lineage,
      labelWidth: 0,
      labelHeight: 0,
      x: 0,
      y: 0,
      labelX: 0,
      labelY: 0,
    };

    // The trunk stays neutral until the tree first splits; from there each lineage keeps its own colour.
    const children = [...node.children.values()];
    const splits = lineage === null && children.length > 1;

    ancestors.add(node);
    branch.children = children.map((child) =>
      build(child, branch, splits ? nextLineage++ % PALETTE_SIZE : lineage),
    );
    ancestors.delete(node);

    return branch;
  }

  return [...root.children.values()].map((node) => build(node, null, null));
}

function placeX(branch: Branch, from: number, em: number): void {
  if (isLeaf(branch)) {
    branch.x = from + LEAF_EDGE * em;
    branch.labelX = branch.x + (DOT_RADIUS + GAP) * em;
  } else if (interrupts(branch)) {
    branch.labelX = branch.parent ? from + (STUB + GAP) * em : from;
    branch.x = branch.labelX + branch.labelWidth + (GAP + STUB) * em;
  } else {
    branch.labelX = from + GAP * em;
    branch.x = branch.labelX + branch.labelWidth + (GAP + JUNCTION_RADIUS) * em;
  }

  branch.children.forEach((child) => placeX(child, branch.x, em));
}

function shiftY(branches: Branch[], distance: number): void {
  walk(branches, (branch) => {
    branch.y += distance;
  });
}

// Stacks the subtree downwards from `top`, centring every inner node on its outer children,
// and returns where the subtree ends.
function placeY(branch: Branch, top: number, em: number): number {
  const labelReach = branch.node.vertical ? branch.labelHeight / 2 + GAP * em : 0;

  if (isLeaf(branch)) {
    const height = Math.max(ROW * em, 2 * labelReach);
    branch.y = top + height / 2;
    return top + height;
  }

  let bottom = top;
  branch.children.forEach((child) => {
    bottom = placeY(child, bottom, em);
  });

  const first = branch.children[0];
  const last = branch.children[branch.children.length - 1];
  branch.y = (first.y + last.y) / 2;

  // Push the children down when a vertical label needs more room above the node than they leave.
  const lift = labelReach - (branch.y - top);
  if (lift > 0) {
    shiftY(branch.children, lift);
    branch.y += lift;
    bottom += lift;
  }

  return Math.max(bottom, branch.y + labelReach);
}

function placeLabelY(branch: Branch, em: number): void {
  branch.labelY =
    isLeaf(branch) || branch.node.vertical
      ? branch.y - branch.labelHeight / 2
      : branch.y - RISE * em - branch.labelHeight;
}

export function layoutTrees(trees: Branch[], em: number): Layout {
  let bottom = 0;
  trees.forEach((tree, index) => {
    placeX(tree, 0, em);
    bottom = placeY(tree, index ? bottom + TREE_GAP * em : 0, em);
  });

  let top = Infinity;
  let right = 0;
  let lowest = -Infinity;
  walk(trees, (branch) => {
    placeLabelY(branch, em);
    top = Math.min(top, branch.labelY, branch.y - JUNCTION_RADIUS * em);
    lowest = Math.max(lowest, branch.labelY + branch.labelHeight, branch.y + JUNCTION_RADIUS * em);
    right = Math.max(right, branch.labelX + branch.labelWidth, branch.x + JUNCTION_RADIUS * em);
  });

  // Move everything inside the margin, snapping the lines to whole pixels so they stay crisp.
  const margin = MARGIN * em;
  const dy = margin - top;
  walk(trees, (branch) => {
    branch.x = Math.round(branch.x + margin);
    branch.y = Math.round(branch.y + dy);
    branch.labelX = Math.round(branch.labelX + margin);
    branch.labelY = Math.round(branch.labelY + dy);
  });

  const lines: Array<Line & { reach: number }> = [];
  const marks: Mark[] = [];
  walk(trees, (branch) => {
    const { parent, lineage, x, y } = branch;
    const fromX = parent ? parent.x : Math.round(margin);
    const fromY = parent ? parent.y : y;

    if (parent || !interrupts(branch)) {
      const end = interrupts(branch) ? branch.labelX - Math.round(GAP * em) : x;
      lines.push({
        lineage,
        reach: Math.abs(y - fromY),
        points: [
          [fromX, fromY],
          [fromX, y],
          [end, y],
        ],
      });
    }
    if (interrupts(branch)) {
      lines.push({
        lineage,
        reach: 0,
        points: [
          [Math.round(branch.labelX + branch.labelWidth + GAP * em), y],
          [x, y],
        ],
      });
    }

    marks.push({
      lineage,
      leaf: isLeaf(branch),
      x,
      y,
      radius: (isLeaf(branch) ? DOT_RADIUS : JUNCTION_RADIUS) * em,
    });
  });

  // Sibling lines share the parent's vertical stretch; drawing the far ones first leaves
  // each stretch in the colour of the nearest sibling.
  lines.sort((a, b) => b.reach - a.reach);

  return {
    width: Math.ceil(right + 2 * margin),
    height: Math.ceil(lowest - top + 2 * margin),
    lines,
    marks,
  };
}
