export class TreeNode {
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
