# Compressió RLE

La codificació Run-length encoding (RLE) és una forma molt simple de compressió de dades en què seqüències de dades amb el mateix valor consecutiu són emmagatzemades com un únic valor més el seu recompte.

Per exemple, la cadena següent cadena de text:

```text
BBBBNNNBBBBBNN
```

Es pot comprimir d'aquesta manera:

```text
4B3N5B2N
```

S'interpreta com 4 bes, 3 enes, 5 bes, 2 enes.

## Input

Una cadena de L caràcters

## Output

La cadena comprimida
