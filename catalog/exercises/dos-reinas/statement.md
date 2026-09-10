# Dos Reinas

Dadas las posiciones de las reinas blanca y negra en un tablero de ajedrez, el programa debe decir si se atacan mútuamente.

## Input Format

El tablero de ajedrez consiste en 8 lineas de ocho caracteres cada una.
Cada caracter representa una casilla del tablero.
El caracter '-' indica una casilla vacía.
La casilla en la que está la reina BLANCA se indica con una 'B'.
La casilla en la que está la reina NEGRA se indica con una 'N'.

## Constraints

C = 64

## Output Format

SI | NO

## Sample Input 0

```text
B----N--
--------
--------
--------
--------
--------
--------
--------
```

## Sample Output 0

```text
SI
```

## Sample Input 1

```text
--------
B-------
--------
--------
--------
--------
-----N--
--------
```

## Sample Output 1

```text
SI
```

## Sample Input 2

```text
--------
--------
B-------
--------
--------
--------
--------
N-------
```

## Sample Output 2

```text
SI
```

## Sample Input 3

```text
--------
------B-
--------
--------
--------
--N-----
--------
--------
```

## Sample Output 3

```text
SI
```

## Sample Input 4

```text
--------
-------N
--------
--------
--------
--------
--------
-B------
```

## Sample Output 4

```text
SI
```

## Sample Input 5

```text
--------
--------
--------
--------
--------
-------N
--------
-------B
```

## Sample Output 5

```text
SI
```

## Sample Input 6

```text
--------
--------
-N------
--------
--------
--------
--------
------B-
```

## Sample Output 6

```text
SI
```

## Sample Input 7

```text
--------
--------
--------
--------
--------
--------
--------
--N--B--
```

## Sample Output 7

```text
SI
```

## Sample Input 8

```text
-B------
------N-
--------
--------
--------
--------
--------
--------
```

## Sample Output 8

```text
NO
```

## Sample Input 9

```text
-----B--
--------
--------
--------
--------
--------
--------
---N----
```

## Sample Output 9

```text
NO
```

## Sample Input 10

```text
--------
--------
--------
--------
N-------
--------
--------
------B-
```

## Sample Output 10

```text
NO
```

## Sample Input 11

```text
--------
--------
--------
--------
-------N
--------
--------
B-------
```

## Sample Output 11

```text
NO
```
