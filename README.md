# TreeGlyph

TreeGlyph is an Obsidian plugin that renders hierarchy code blocks as compact ASCII tree views.

Write a `treeglyph` code block in a note, and TreeGlyph replaces it with the rendered tree in Obsidian's reading view.

````markdown
```treeglyph
Root/Branch/Leaf
Branch/Leaf A,Leaf B
```
````

## Instructions

Write one hierarchy per line. Use `/` to separate levels:

```txt
Root/Branch/Leaf
```

Use `,` when one level has multiple names:

```txt
Root/Branch A,Branch B,Branch C
```

Reuse an existing name at the start of a later line to continue that part of the same tree:

```txt
Root/Branch
Branch/Leaf A,Leaf B
```

Add `*` after a name to render that name vertically:

```txt
Metazoa*/Eumetazoa*/Bilateria*
```

Use `-` inside a name when you want that name to split across multiple output lines:

```txt
Protostomia/Clylon-euralia
```

Use either `treeglyph` or the shorter `tg` as the code block language:

````markdown
```tg
Root/Branch/Leaf
```
````

## Development

Install dependencies:

```bash
npm install
```

Build `main.js` (type-checks first):

```bash
npm run build
```

For a watch build while developing:

```bash
npm run dev
```

`main.js` is build output and is not committed. To try the plugin, create the folder below in a vault and copy or symlink `main.js`, `manifest.json`, and `styles.css` into it, then enable **TreeGlyph** in Obsidian's Community plugins settings:

```txt
YourVault/.obsidian/plugins/treeglyph
```

## Releasing

1. Run `npm version patch` (or `minor` / `major`). This updates `package.json`, `manifest.json`, and `versions.json` together and creates a git tag.
2. Push the commit and tag.
3. Create a GitHub release whose tag is the bare version (for example `0.1.1`, no `v`) and attach `main.js`, `manifest.json`, and `styles.css`.

## Example

FROM:
```treeglyph
Metazoa*/Eumetazoa*/Bilateria*/Protostomia,Deuterostomia,Incertae sedis (of uncertain placement)

Protostomia/Ecdysozoa,Clylon-euralia,Spiralia

Ecdysozoa/Panarthropoda/Arthropoda,Tradigara,Onychophora

Deuterostomia/Chordata/Echinodermata/Hemichordata

Chordata/Craniota,Acrania,Tunicata

Arthropoda/Chelicerata,Myrapoda,Crustacea,Hexapoda
```



TO:
```
M   | E   | B   |-> Protos- |-> Ecdysozoa |-> Panarth- -|-> Arthropoda
E   | U   | I   |   tomia   |-> Clylon-        ropoda   |-> Tradigara 
T   | M   | L   |           |   euralia                 |-> Onychophora
A --| E --| A --|           |-> Spiralia           
Z   | T   | T   |           
O   | A   | E   |-> Deuterostomia --|-> Chordata -------|-> Craniota
A   | Z   | R   |                   |-> Echinodermata   |-> Acrania
    | O   | I   |                   |-> Hemichordata    |-> Tunicata
    | A   | A   |-> Incertae sedis (of uncertain placement)

---

A    |-> Chelicerata 
R    |               
T    |               
H    |-> Myrapoda
R ---|            
O    |                            
P    |-> Crustacea
O    |             
D    |           
A    |-> Hexapoda
```
