# [C3-L2-7] Descompressió RLE #for

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

## Input Format

Una cadena de L caracters comprimida en RLE

## Constraints

No hi ha cap recompte superior a 9

## Output Format

La cadena descomprimida

## Sample Input 0

```text
3B4N
```

## Sample Output 0

```text
BBBNNNN
```

## Sample Input 1

```text
5B3N1B
```

## Sample Output 1

```text
BBBBBNNNB
```

## Sample Input 2

```text
1B5N1B
```

## Sample Output 2

```text
BNNNNNB
```

## Sample Input 3

```text
1A3B4A3N2C1A5D
```

## Sample Output 3

```text
ABBBAAAANNNCCADDDDD
```

## Sample Input 4

```text
8W7H7A9T
```

## Sample Output 4

```text
WWWWWWWWHHHHHHHAAAAAAATTTTTTTTT
```

## Sample Input 5

```text
1J1A1V1A
```

## Sample Output 5

```text
JAVA
```
