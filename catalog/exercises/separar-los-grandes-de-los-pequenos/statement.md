# Separar los grandes de los pequeños

Dada un secuencia de números y un valor límite, separar la secuencia en dos secuencias: en la primera los valores inferiores o iguales al límite, y en la segunda los superiores al límite.

## Input Format

El primer número N indica el tamaño de la secuencia. A continuación viene la secuencia.

Después viene el valor límite.

## Constraints

1 <= N <= 100

## Output Format

Las dos secuencias separadas por un salto de línea.

## Sample Input 0

```text
5    100 300 400 200 500
300
```

## Sample Output 0

```text
100 300 200
400 500
```

## Sample Input 1

```text
5    34 56 78 45 12
50
```

## Sample Output 1

```text
34 45 12
56 78
```

## Sample Input 2

```text
3    67 78 89
10
```

## Sample Output 2

```text
67 78 89
```

## Sample Input 3

```text
3    67 78 89
100
```

## Sample Output 3

```text
67 78 89
```

## Sample Input 4

```text
5    3 1 4 2 5
1
```

## Sample Output 4

```text
1
3 4 2 5
```

## Sample Input 5

```text
10    12 12 13 18 19 15 16 20 17 18
17
```

## Sample Output 5

```text
12 12 13 15 16 17
18 19 20 18
```
