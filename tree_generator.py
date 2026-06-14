#!/usr/bin/env python3
"""Render slash-separated hierarchy names as a compact ASCII tree."""

from __future__ import annotations

import argparse
from collections import OrderedDict
from dataclasses import dataclass, field
from pathlib import Path


MAX_LINE_LENGTH = 70


@dataclass
class Node:
    name: str
    vertical: bool = False
    children: "OrderedDict[str, Node]" = field(default_factory=OrderedDict)


def clean_name(raw_name: str) -> tuple[str, bool]:
    text = raw_name.strip()
    vertical = text.endswith("*")
    if vertical:
        text = text[:-1].strip()
    if not text:
        raise ValueError("empty hierarchy name")
    return text, vertical


def split_level(level: str) -> list[str]:
    names = [name.strip() for name in level.split(",")]
    return [name for name in names if name]


def parse_tree(text: str) -> Node:
    root = Node(name="")
    nodes: dict[str, Node] = {}

    for line_number, line in enumerate(text.splitlines(), start=1):
        line = line.strip()
        if not line:
            continue

        levels = [split_level(level) for level in line.split("/")]
        if any(not level for level in levels):
            raise ValueError(f"line {line_number}: empty level in {line!r}")

        start = 0
        starts_from_existing = all(clean_name(name)[0] in nodes for name in levels[0])
        if starts_from_existing:
            parents = [nodes[clean_name(name)[0]] for name in levels[0]]
            start = 1
        else:
            parents = [root]

        if starts_from_existing and should_flatten_tail(levels[start:]):
            for parent in parents:
                for level in levels[start:]:
                    add_child(parent, level[0], nodes)
            continue

        for level in levels[start:]:
            next_parents: list[Node] = []
            for parent in parents:
                for name in level:
                    next_parents.append(add_child(parent, name, nodes))
            parents = next_parents

    return root


def should_flatten_tail(levels: list[list[str]]) -> bool:
    return len(levels) > 2 and all(len(level) == 1 for level in levels)


def add_child(parent: Node, raw_name: str, nodes: dict[str, Node]) -> Node:
    name, vertical = clean_name(raw_name)
    node = nodes.get(name)
    if node is None:
        node = Node(name=name, vertical=vertical)
        nodes[name] = node
    elif vertical:
        node.vertical = True

    if name not in parent.children:
        parent.children[name] = node
    return node


def label_lines(name: str, vertical: bool = False) -> list[str]:
    if vertical:
        return [char.upper() for char in name if char != " "]

    if "-" not in name:
        return [name]

    parts = name.split("-")
    lines: list[str] = []
    for index, part in enumerate(parts):
        if not part and index == len(parts) - 1:
            continue
        suffix = "-" if index < len(parts) - 1 else ""
        lines.append(part + suffix)
    return lines or [name]


def pad_rows(rows: list[str], width: int) -> list[str]:
    return [row.ljust(width) for row in rows]


def overlay(left: list[str], right: list[str]) -> list[str]:
    height = max(len(left), len(right))
    left_width = max((len(row) for row in left), default=0)
    rows: list[str] = []
    for index in range(height):
        left_row = left[index] if index < len(left) else ""
        right_row = right[index] if index < len(right) else ""
        rows.append(left_row.ljust(left_width) + right_row)
    return rows


def stack_child_blocks(blocks: list[list[str]]) -> list[str]:
    rows: list[str] = []
    for block in blocks:
        for index, row in enumerate(block):
            prefix = "-> " if index == 0 else "   "
            rows.append(prefix + row)
    return rows


def render_node(
    node: Node,
    *,
    detached: set[int] | None = None,
    force_vertical: bool = False,
) -> list[str]:
    detached = detached or set()
    children = [] if id(node) in detached else list(node.children.values())

    label = label_lines(node.name, node.vertical or force_vertical)
    label_width = max(len(row) for row in label)
    label = pad_rows(label, label_width)

    if not children:
        return label

    child_blocks = [
        render_node(child, detached=detached, force_vertical=False) for child in children
    ]
    child_rows = stack_child_blocks(child_blocks)

    height = max(len(label), len(child_rows))
    connector_row = max(0, len(label) // 2)
    left_rows: list[str] = []

    for index in range(height):
        label_row = label[index] if index < len(label) else " " * label_width
        if index == connector_row:
            left_rows.append(f"{label_row}---|")
        else:
            left_rows.append(f"{label_row}   |")

    return overlay(left_rows, child_rows)


def render_forest(root: Node, detached: set[int] | None = None) -> list[str]:
    rows: list[str] = []
    for node in root.children.values():
        if rows:
            rows.append("")
        rows.extend(render_node(node, detached=detached))
    return rows


def widest(rows: list[str]) -> int:
    return max((len(row.rstrip()) for row in rows), default=0)


def nodes_by_depth(root: Node) -> list[tuple[int, Node]]:
    found: list[tuple[int, Node]] = []

    def visit(node: Node, depth: int) -> None:
        if node.children:
            found.append((depth, node))
        for child in node.children.values():
            visit(child, depth + 1)

    for child in root.children.values():
        visit(child, 0)
    return found


def contains_node(parent: Node, possible_child: Node) -> bool:
    for child in parent.children.values():
        if child is possible_child or contains_node(child, possible_child):
            return True
    return False


def render_with_splits(root: Node, max_width: int = MAX_LINE_LENGTH) -> str:
    detached: set[int] = set()
    split_nodes: list[Node] = []

    candidates = sorted(nodes_by_depth(root), key=lambda item: item[0], reverse=True)
    rows = render_forest(root, detached)

    for _, node in candidates:
        if widest(rows) <= max_width:
            break
        if id(node) in detached:
            continue
        detached.add(id(node))
        split_nodes = [
            existing for existing in split_nodes if not contains_node(node, existing)
        ]
        if not any(contains_node(existing, node) for existing in split_nodes):
            split_nodes.append(node)
        rows = render_forest(root, detached)

    rendered_trees = ["\n".join(row.rstrip() for row in rows).rstrip()]
    for node in split_nodes:
        split_rows = render_node(node, force_vertical=True)
        rendered_trees.append("\n".join(row.rstrip() for row in split_rows).rstrip())

    return "\n\n---\n\n".join(tree for tree in rendered_trees if tree)


def convert_file(input_path: Path, output_path: Path, max_width: int) -> None:
    tree = parse_tree(input_path.read_text(encoding="utf-8"))
    output_path.write_text(render_with_splits(tree, max_width) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create a compact ASCII tree view from a hierarchy text file."
    )
    parser.add_argument("input", type=Path, help="input .txt file")
    parser.add_argument("output", type=Path, help="output .txt file")
    parser.add_argument(
        "--max-width",
        type=int,
        default=MAX_LINE_LENGTH,
        help=f"maximum output line width (default: {MAX_LINE_LENGTH})",
    )
    args = parser.parse_args()

    convert_file(args.input, args.output, args.max_width)


if __name__ == "__main__":
    main()
