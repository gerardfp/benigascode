# [C2-L2-1] Tres en ratlla #if

Donat un tauler de tres en ratlla, determina el guanyador, o si hi ha empat.

## Input Format

El tauler consta de nou nombres corresponents a les nou caselles.

Les caselles buides es marquen amb un 0.

Les caselles amb una fitxa es marquen amb un 1 o un 2.

## Constraints

El tauler és vàlid.

## Output Format

Jugador1 | Jugador2 | Empat

## Sample Input 0

```text
1 2 2
1 2 2
1 0 0
```

## Sample Output 0

```text
Jugador1
```

## Sample Input 1

```text
1 2 2
2 1 0
2 0 1
```

## Sample Output 1

```text
Jugador1
```

## Sample Input 2

```text
0 0 0
1 1 1
2 2 0
```

## Sample Output 2

```text
Jugador1
```

## Sample Input 3

```text
0 0 0
1 1 2
2 1 1
```

## Sample Output 3

```text
Empat
```

## Sample Input 4

```text
0 1 0
2 1 2
0 1 2
```

## Sample Output 4

```text
Jugador1
```

## Sample Input 5

```text
1 0 2
1 2 0
2 1 0
```

## Sample Output 5

```text
Jugador2
```

## Sample Input 6

```text
1 1 0
1 1 0
2 2 2
```

## Sample Output 6

```text
Jugador2
```

## Sample Input 7

```text
0 2 1
2 1 1
2 2 1
```

## Sample Output 7

```text
Jugador1
```

## Sample Input 8

```text
0 0 0
0 0 0
0 0 0
```

## Sample Output 8

```text
Empat
```
