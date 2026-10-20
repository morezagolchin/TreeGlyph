export class TreeNode {
  name: string;
  vertical: boolean;
  // Taxonomic level written as `Name.kl`, shown as a prefix: "kl. Name". Empty when not given.
  rank: string;
  children: Map<string, TreeNode>;

  constructor(name: string, vertical = false, rank = "") {
    this.name = name;
    this.vertical = vertical;
    this.rank = rank;
    this.children = new Map();
  }
}

type CleanName = {
  name: string;
  vertical: boolean;
  rank: string;
};

// A rank is whatever follows the last `.`, as long as it has no spaces: `Name.kl`.
const RANK_SUFFIX = /^(.+)\.([^.\s]+)$/;

function cleanName(rawName: string): CleanName {
  let text = rawName.trim();
  let vertical = false;
  let rank = "";

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
  return { name: text, vertical, rank };
}

// Flags given on a later mention of a name still apply to it.
function applyFlags(node: TreeNode, { vertical, rank }: CleanName): void {
  if (vertical) {
    node.vertical = true;
  }
  if (rank) {
    node.rank = rank;
  }
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
  const clean = cleanName(rawName);
  const { name } = clean;
  let node = nodes.get(name);

  if (!node) {
    node = new TreeNode(name, clean.vertical, clean.rank);
    nodes.set(name, node);
  } else {
    applyFlags(node, clean);
  }

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

    const levels = line.split("/").map(splitLevel);
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
        applyFlags(node, clean);
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
