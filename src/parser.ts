export class TreeNode {
  name: string;
  vertical = false;
  // Taxonomic level written as `Name.kl`, shown as a prefix: "kl. Name". Empty when not given.
  rank = "";
  // Second name written as `Name((other name))`, shown after the name. Empty when not given.
  altName = "";
  // Text written as `Name:""text""`, shown when hovering the name. Empty when not given.
  tooltip = "";
  children = new Map<string, TreeNode>();

  constructor(name: string) {
    this.name = name;
  }
}

type CleanName = {
  name: string;
  vertical: boolean;
  rank: string;
  altName: string;
  tooltip: string;
};

// A rank is whatever follows the last `.`, as long as it has no spaces: `Name.kl`.
const RANK_SUFFIX = /^(.+)\.([^.\s]+)$/;
const ALT_NAME = /\(\((.*?)\)\)/;
const TOOLTIP = /:\s*""(.*?)""/;

// ((Alternative names)) and :""tooltips"" may contain anything, separators included.
const PROTECTED = /\(\(.*?\)\)|:\s*"".*?""/g;
const MASK = "\u0000";

// Splits on `separator`, except inside protected text.
function splitOutsideProtected(text: string, separator: string): string[] {
  const masked = text.replace(PROTECTED, (region) => region.split(separator).join(MASK));
  return masked.split(separator).map((part) => part.split(MASK).join(separator));
}

function cleanName(rawName: string): CleanName {
  let text = rawName.trim();
  let vertical = false;
  let rank = "";
  let altName = "";
  let tooltip = "";

  // Taken out first, so the tooltip text itself may contain dots, parentheses or `*`.
  const tip = TOOLTIP.exec(text);
  if (tip) {
    tooltip = tip[1].trim();
    text = text.replace(TOOLTIP, "").trim();
  }

  const alt = ALT_NAME.exec(text);
  if (alt) {
    altName = alt[1].trim();
    text = text.replace(ALT_NAME, "").trim();
  }

  // `*` may come before or after the rank: `Name*.kl` or `Name.kl*`.
  const stripStar = (): void => {
    if (text.endsWith("*")) {
      vertical = true;
      text = text.slice(0, -1).trim();
    }
  };

  stripStar();
  const match = RANK_SUFFIX.exec(text);
  if (match) {
    text = match[1].trim();
    rank = match[2];
  }
  stripStar();

  if (!text) {
    throw new Error("empty hierarchy name");
  }
  return { name: text, vertical, rank, altName, tooltip };
}

// Details given on any mention of a name apply to it, including later ones.
function applyDetails(node: TreeNode, { vertical, rank, altName, tooltip }: CleanName): void {
  if (vertical) {
    node.vertical = true;
  }
  if (rank) {
    node.rank = rank;
  }
  if (altName) {
    node.altName = altName;
  }
  if (tooltip) {
    node.tooltip = tooltip;
  }
}

function splitLevel(level: string): string[] {
  return splitOutsideProtected(level, ",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function shouldFlattenTail(levels: string[][]): boolean {
  return levels.length > 2 && levels.every((level) => level.length === 1);
}

function addChild(parent: TreeNode, rawName: string, nodes: Map<string, TreeNode>): TreeNode {
  const clean = cleanName(rawName);
  const { name } = clean;
  let node = nodes.get(name);

  if (!node) {
    node = new TreeNode(name);
    nodes.set(name, node);
  }
  applyDetails(node, clean);

  if (!parent.children.has(name)) {
    parent.children.set(name, node);
  }

  return node;
}

// Every distinct name in a block. Unlike parseTree, it never fails on half-typed lines.
export function collectNames(text: string): string[] {
  const names = new Set<string>();

  text.split(/\r?\n/).forEach((line) => {
    splitOutsideProtected(line, "/").forEach((level) => {
      splitLevel(level).forEach((rawName) => {
        try {
          names.add(cleanName(rawName).name);
        } catch {
          // A name with nothing but details, such as a lone ((alternative name)).
        }
      });
    });
  });

  return [...names];
}

// The name being typed at the end of `textBeforeCursor`, and where it starts. Null while the
// cursor is inside an unfinished ((alternative name)) or :""tooltip"".
export function nameBeingTyped(textBeforeCursor: string): { start: number; name: string } | null {
  const masked = textBeforeCursor.replace(PROTECTED, (region) => MASK.repeat(region.length));
  if (/\(\(|:\s*""/.test(masked)) {
    return null;
  }

  let start = Math.max(masked.lastIndexOf("/"), masked.lastIndexOf(",")) + 1;
  // At the start of a line, also skip the `>` of a code block inside a callout or quote.
  const skip = start === 0 ? /^[\s>]*/ : /^\s*/;
  start += (skip.exec(masked.slice(start)) as RegExpExecArray)[0].length;

  return { start, name: textBeforeCursor.slice(start) };
}

// Returns a nameless root whose children are the top-level trees.
export function parseTree(text: string): TreeNode {
  const root = new TreeNode("");
  const nodes = new Map<string, TreeNode>();
  const tooltipLines: Array<{ line: number; names: string[] }> = [];

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }

    const levels = splitOutsideProtected(line, "/").map(splitLevel);
    if (levels.some((level) => level.length === 0)) {
      throw new Error(`line ${index + 1}: empty level in ${line}`);
    }

    // A line of names that all have tooltips only describes them, so it can go anywhere.
    if (levels.length === 1 && levels[0].every((name) => cleanName(name).tooltip)) {
      tooltipLines.push({ line: index + 1, names: levels[0] });
      return;
    }

    const startsFromExisting = levels[0].every((name) => nodes.has(cleanName(name).name));
    let parents = [root];
    let start = 0;

    if (startsFromExisting) {
      parents = levels[0].map((rawName) => {
        const clean = cleanName(rawName);
        const node = nodes.get(clean.name) as TreeNode;
        applyDetails(node, clean);
        return node;
      });
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

  tooltipLines.forEach(({ line, names }) => {
    names.forEach((rawName) => {
      const clean = cleanName(rawName);
      const node = nodes.get(clean.name);
      if (!node) {
        throw new Error(`line ${line}: ${clean.name} is not in the tree`);
      }
      applyDetails(node, clean);
    });
  });

  return root;
}
