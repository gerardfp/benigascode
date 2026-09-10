# [C5-L1-4] Distància Hamming

Donats dos Strings, calcula la seva distància Hamming.

La distància Hamming entre dos Strings de la mateixa longitud és la quantitat de posicions en les quals els caracters són diferents.

Exemple:

```text
Hola mon
Hala man
```

La distància Hamming entre "Hola mon" i "Hala man" és 2, ja que en les posicions 1 i 6 els caracters són diferents.

## Input Format

Dos Strings, cadascun en una línia.

## Constraints

-

## Output Format

La distància Hamming entre els dos Strings, **si són d'igual longitud**.

Si són de distinta longitud s'imprimirá -1.

## Sample Input 0

```text
Hola mon
Hala man
```

## Sample Output 0

```text
2
```

## Sample Input 1

```text
i hate java
i love java
```

## Sample Output 1

```text
3
```

## Sample Input 2

```text
CAGGTACAGT
AAGGTACTTA
```

## Sample Output 2

```text
4
```

## Sample Input 3

```text
1011010
1000010
```

## Sample Output 3

```text
2
```

## Sample Input 4

```text
hola
hol
```

## Sample Output 4

```text
-1
```

## Sample Input 5

```text
CGATTGACGATCAT
CGATGCTGACTAT
```

## Sample Output 5

```text
-1
```

## Sample Input 6

```text
hola
hola
```

## Sample Output 6

```text
0
```

## Sample Input 7

```text
h
k
```

## Sample Output 7

```text
1
```

## Sample Input 8

```text
is this a string?
is this a  string?
```

## Sample Output 8

```text
-1
```
