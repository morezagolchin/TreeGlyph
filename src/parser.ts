export class TreeNode {
  name: string;
  vertical = false;
  // Taxonomic level written as `Name.kl`, shown as a prefix: "kl. Name". Empty when not given.
  rank = "";
  // Second name written as `Name((other name))`, shown after the name. Empty when not given.
  altName = "";
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
};

// A rank is whatever follows the last `.`, as long as it has no spaces: `Name.kl`.
const RANK_SUFFIX = /^(.+)\.([^.\s]+)$/;
const ALT_NAME = /\(\((.*?)\)\)/;

// Splits on `separator`, except inside ((alternative names)), which may contain anything.
function splitOutsideAltNames(text: string, separator: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let inside = false;

  for (let index = 0; index < text.length; index += 1) {
    if (!inside && text.startsWith("((", index)) {
      inside = true;
      index += 1;
    } else if (inside && text.startsWith("))", index)) {
      inside = false;
      index += 1;
    } else if (!inside && text[index] === separator) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(text.slice(start));
  return parts;
}

function cleanName(rawName: string): CleanName {
  let text = rawName.trim();
  let vertical = false;
  let rank = "";
  let altName = "";

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
  return { name: text, vertical, rank, altName };
}

// Details given on any mention of a name apply to it, including later ones.
function applyDetails(node: TreeNode, { vertical, rank, altName }: CleanName): void {
  if (vertical) {
    node.vertical = true;
  }
  if (rank) {
    node.rank = rank;
  }
  if (altName) {
    node.altName = altName;
  }
}

function splitLevel(level: string): string[] {
  return splitOutsideAltNames(level, ",")
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

// Returns a nameless root whose children are the top-level trees.
export function parseTree(text: string): TreeNode {
  const root = new TreeNode("");
  const nodes = new Map<string, TreeNode>();

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }

    const levels = splitOutsideAltNames(line, "/").map(splitLevel);
    if (levels.some((level) => level.length === 0)) {
      throw new Error(`line ${index + 1}: empty level in ${line}`);
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

  return root;
}
