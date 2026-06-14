const MAX_LINE_LENGTH = 70;

class TreeNode {
  name: string;
  vertical: boolean;
  children: Map<string, TreeNode>;

  constructor(name: string, vertical = false) {
    this.name = name;
    this.vertical = vertical;
    this.children = new Map();
  }
}

type CleanName = {
  name: string;
  vertical: boolean;
};

function cleanName(rawName: string): CleanName {
  let text = rawName.trim();
  const vertical = text.endsWith("*");
  if (vertical) {
    text = text.slice(0, -1).trim();
  }
  if (!text) {
    throw new Error("empty hierarchy name");
  }
  return { name: text, vertical };
}

function splitLevel(level: string): string[] {
  return level
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function shouldFlattenTail(levels: string[][]): boolean {
  return levels.length > 2 && levels.every((level) => level.length === 1);
}

function addChild(parent: TreeNode, rawName: string, nodes: Map<string, TreeNode>): TreeNode {
  const { name, vertical } = cleanName(rawName);
  let node = nodes.get(name);

  if (!node) {
    node = new TreeNode(name, vertical);
    nodes.set(name, node);
  } else if (vertical) {
    node.vertical = true;
  }

  if (!parent.children.has(name)) {
    parent.children.set(name, node);
  }

  return node;
}

function parseTree(text: string): TreeNode {
  const root = new TreeNode("");
  const nodes = new Map<string, TreeNode>();

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }

    const levels = line.split("/").map(splitLevel);
    if (levels.some((level) => level.length === 0)) {
      throw new Error(`line ${index + 1}: empty level in ${line}`);
    }

    const startsFromExisting = levels[0].every((name) => nodes.has(cleanName(name).name));
    let parents = [root];
    let start = 0;

    if (startsFromExisting) {
      parents = levels[0].map((name) => nodes.get(cleanName(name).name) as TreeNode);
      start = 1;
    }

    const tail = levels.slice(start);
    if (startsFromExisting && shouldFlattenTail(tail)) {
      parents.forEach((parent) => {
        tail.forEach((level) => addChild(parent, level[0], nodes));
      });
      return;
    }

    for (let levelIndex = start; levelIndex < levels.length; levelIndex += 1) {
      const nextParents: TreeNode[] = [];
      parents.forEach((parent) => {
        levels[levelIndex].forEach((name) => {
          nextParents.push(addChild(parent, name, nodes));
        });
      });
      parents = nextParents;
    }
  });

  return root;
}

function labelLines(name: string, vertical = false): string[] {
  if (vertical) {
    return [...name].filter((char) => char !== " ").map((char) => char.toUpperCase());
  }

  if (!name.includes("-")) {
    return [name];
  }

  const parts = name.split("-");
  const lines: string[] = [];
  parts.forEach((part, index) => {
    if (!part && index === parts.length - 1) {
      return;
    }
    lines.push(part + (index < parts.length - 1 ? "-" : ""));
  });

  return lines.length ? lines : [name];
}

function padRows(rows: string[], width: number): string[] {
  return rows.map((row) => row.padEnd(width, " "));
}

function overlay(left: string[], right: string[]): string[] {
  const height = Math.max(left.length, right.length);
  const leftWidth = Math.max(0, ...left.map((row) => row.length));
  const rows: string[] = [];

  for (let index = 0; index < height; index += 1) {
    rows.push((left[index] || "").padEnd(leftWidth, " ") + (right[index] || ""));
  }

  return rows;
}

function stackChildBlocks(blocks: string[][]): string[] {
  const rows: string[] = [];

  blocks.forEach((block) => {
    block.forEach((row, index) => {
      rows.push((index === 0 ? "-> " : "   ") + row);
    });
  });

  return rows;
}

function renderNode(
  node: TreeNode,
  detached = new Set<TreeNode>(),
  forceVertical = false,
): string[] {
  const children = detached.has(node) ? [] : [...node.children.values()];
  let label = labelLines(node.name, node.vertical || forceVertical);
  const labelWidth = Math.max(...label.map((row) => row.length));
  label = padRows(label, labelWidth);

  if (!children.length) {
    return label;
  }

  const childRows = stackChildBlocks(children.map((child) => renderNode(child, detached)));
  const height = Math.max(label.length, childRows.length);
  const connectorRow = Math.max(0, Math.floor(label.length / 2));
  const leftRows: string[] = [];

  for (let index = 0; index < height; index += 1) {
    const labelRow = index < label.length ? label[index] : " ".repeat(labelWidth);
    leftRows.push(labelRow + (index === connectorRow ? "---|" : "   |"));
  }

  return overlay(leftRows, childRows);
}

function renderForest(root: TreeNode, detached = new Set<TreeNode>()): string[] {
  const rows: string[] = [];

  [...root.children.values()].forEach((node, index) => {
    if (index > 0) {
      rows.push("");
    }
    rows.push(...renderNode(node, detached));
  });

  return rows;
}

function widest(rows: string[]): number {
  return Math.max(0, ...rows.map((row) => row.trimEnd().length));
}

function nodesByDepth(root: TreeNode): Array<[number, TreeNode]> {
  const found: Array<[number, TreeNode]> = [];

  function visit(node: TreeNode, depth: number): void {
    if (node.children.size) {
      found.push([depth, node]);
    }
    node.children.forEach((child) => visit(child, depth + 1));
  }

  root.children.forEach((child) => visit(child, 0));
  return found;
}

function containsNode(parent: TreeNode, possibleChild: TreeNode): boolean {
  for (const child of parent.children.values()) {
    if (child === possibleChild || containsNode(child, possibleChild)) {
      return true;
    }
  }

  return false;
}

function renderWithSplits(root: TreeNode, maxWidth = MAX_LINE_LENGTH): string {
  const detached = new Set<TreeNode>();
  let splitNodes: TreeNode[] = [];
  const candidates = nodesByDepth(root).sort((a, b) => b[0] - a[0]);
  let rows = renderForest(root, detached);

  for (const [, node] of candidates) {
    if (widest(rows) <= maxWidth) {
      break;
    }
    if (detached.has(node)) {
      continue;
    }

    detached.add(node);
    splitNodes = splitNodes.filter((existing) => !containsNode(node, existing));
    if (!splitNodes.some((existing) => containsNode(existing, node))) {
      splitNodes.push(node);
    }
    rows = renderForest(root, detached);
  }

  const renderedTrees = [rows.map((row) => row.trimEnd()).join("\n").trimEnd()];
  splitNodes.forEach((node) => {
    renderedTrees.push(renderNode(node, new Set<TreeNode>(), true).map((row) => row.trimEnd()).join("\n").trimEnd());
  });

  return renderedTrees.filter(Boolean).join("\n\n---\n\n");
}

export function renderTreeGlyph(source: string): string {
  return renderWithSplits(parseTree(source));
}
