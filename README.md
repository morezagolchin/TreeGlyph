# 3VU

3VU creates a compact tree view from a hierarchical name list.

You can use it in two ways:

- Run the Python program with an input text file and an output text file.
- Open the HTML editor in a browser and see the output update live while you type.

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

To convert a text file from the command line:

```bash
python3 tree_generator.py input.txt output.txt
```

To use the live editor, open `index.html` in your browser. The editor includes line numbers, live output, and autocomplete suggestions for names that already exist in the input.

## Example

FROM:
```
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