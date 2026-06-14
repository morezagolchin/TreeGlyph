/* TreeGlyph Obsidian plugin */
"use strict";

const { Plugin } = require("obsidian");

const MAX_LINE_LENGTH = 70;

class TreeNode {
  constructor(name, vertical = false) {
    this.name = name;
    this.vertical = vertical;
    this.children = new Map();
  }
}

function cleanName(rawName) {
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

function splitLevel(level) {
  return level
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function shouldFlattenTail(levels) {
  return levels.length > 2 && levels.every((level) => level.length === 1);
}

function addChild(parent, rawName, nodes) {
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

function parseTree(text) {
  const root = new TreeNode("");
  const nodes = new Map();

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
      parents = levels[0].map((name) => nodes.get(cleanName(name).name));
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
      const nextParents = [];
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

function labelLines(name, vertical = false) {
  if (vertical) {
    return [...name].filter((char) => char !== " ").map((char) => char.toUpperCase());
  }

  if (!name.includes("-")) {
    return [name];
  }

  const parts = name.split("-");
  const lines = [];
  parts.forEach((part, index) => {
    if (!part && index === parts.length - 1) {
      return;
    }
    lines.push(part + (index < parts.length - 1 ? "-" : ""));
  });

  return lines.length ? lines : [name];
}

function padRows(rows, width) {
  return rows.map((row) => row.padEnd(width, " "));
}

function overlay(left, right) {
  const height = Math.max(left.length, right.length);
  const leftWidth = Math.max(0, ...left.map((row) => row.length));
  const rows = [];

  for (let index = 0; index < height; index += 1) {
    rows.push((left[index] || "").padEnd(leftWidth, " ") + (right[index] || ""));
  }

  return rows;
}

function stackChildBlocks(blocks) {
  const rows = [];

  blocks.forEach((block) => {
    block.forEach((row, index) => {
      rows.push((index === 0 ? "-> " : "   ") + row);
    });
  });

  return rows;
}

function renderNode(node, detached = new Set(), forceVertical = false) {
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
  const leftRows = [];

  for (let index = 0; index < height; index += 1) {
    const labelRow = index < label.length ? label[index] : " ".repeat(labelWidth);
    leftRows.push(labelRow + (index === connectorRow ? "---|" : "   |"));
  }

  return overlay(leftRows, childRows);
}

function renderForest(root, detached = new Set()) {
  const rows = [];

  [...root.children.values()].forEach((node, index) => {
    if (index > 0) {
      rows.push("");
    }
    rows.push(...renderNode(node, detached));
  });

  return rows;
}

function widest(rows) {
  return Math.max(0, ...rows.map((row) => row.trimEnd().length));
}

function nodesByDepth(root) {
  const found = [];

  function visit(node, depth) {
    if (node.children.size) {
      found.push([depth, node]);
    }
    node.children.forEach((child) => visit(child, depth + 1));
  }

  root.children.forEach((child) => visit(child, 0));
  return found;
}

function containsNode(parent, possibleChild) {
  for (const child of parent.children.values()) {
    if (child === possibleChild || containsNode(child, possibleChild)) {
      return true;
    }
  }

  return false;
}

function renderWithSplits(root, maxWidth = MAX_LINE_LENGTH) {
  const detached = new Set();
  let splitNodes = [];
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
    renderedTrees.push(renderNode(node, new Set(), true).map((row) => row.trimEnd()).join("\n").trimEnd());
  });

  return renderedTrees.filter(Boolean).join("\n\n---\n\n");
}

function renderTreeGlyph(source) {
  return renderWithSplits(parseTree(source));
}

class TreeGlyphPlugin extends Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor("treeglyph", (source, el) => {
      this.renderBlock(source, el);
    });

    this.registerMarkdownCodeBlockProcessor("tg", (source, el) => {
      this.renderBlock(source, el);
    });
  }

  renderBlock(source, el) {
    el.empty();
    const wrapper = el.createDiv({ cls: "treeglyph-rendered" });
    const pre = wrapper.createEl("pre");

    try {
      pre.setText(renderTreeGlyph(source));
    } catch (error) {
      wrapper.addClass("treeglyph-error");
      pre.setText(error instanceof Error ? error.message : String(error));
    }
  }
}

module.exports = TreeGlyphPlugin;
