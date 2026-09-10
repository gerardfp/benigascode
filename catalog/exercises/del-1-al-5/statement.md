# Del 1 al 5

Dada una secuencia de números, que termina con un 0, decir si contiene los números del 1 al 5.

Ej1:
1 2 3 4 5 6 0  => SI
1 2 3 4 0 => NO
9 1 8 2 7 3 6 4 5 0 => SI

## Input Format

La entrada consta de varios casos de prueba.
El primer número T indica el número de casos de prueba.
Cada caso de prueba consta de una secuencia de N números que termina con un 0.

## Constraints

1 <= T <= 100
1 <= N <= 100

## Output Format

Un "SI" o un "NO" por cada caso de prueba, separados por un salto de linea

## Sample Input 0

```text
2
1 2 3 4 5 0
1 0
```

## Sample Output 0

```text
SI
NO
```

## Sample Input 1

```text
3
1 2 3 4 0
2 1 4 3 5 0
7 6 5 4 3 2 1 0
```

## Sample Output 1

```text
NO
SI
SI
```

## Sample Input 2

```text
4
7 6 5 4 3 2 0
5 8 4 7 3 6 2 5 1 0
1 1 2 2 3 3 4 4 5 5 0
1 1 1 1 1 1 1 1 1 1 0
```

## Sample Output 2

```text
NO
SI
SI
NO
```
