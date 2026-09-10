# Picos máximos

Dada una secuencia de valores, el problema consiste en detectar los picos de valores.
Un pico es un número cuyo anterior es menor que él, y el siguiente también es menor que él.

Ej:

1 2 3 4 3 2 3 2 1
      *
    *   *   *
  *       *   *
*               *

En esta secuencia los picos serían 4 y 3.

## Input Format

La entrada consta de una serie de casos de prueba.
El primer número T indica la cantidad de casos de prueba que vienen a continuación.
Por cada caso de prueba se indica en el primer número N la cantidad de números que hay en la secuencia, y a continuación vienen los números de dicha secuencia.

## Constraints

1 <= T <= 100
1 <= N <= 10^7

## Output Format

Por cada caso de prueba se imprimirá en una linea la secuencia de picos encontrados, separados por un espacio.

## Sample Input 0

```text
2
6 100 101 102 101 102 103
8 60 61 62 63 64 63 62 61
```

## Sample Output 0

```text
102 103
64
```

## Sample Input 1

```text
3
7 100 99 98 97 98 99 100
4 9 8 7 6
7 8 9 8 9 8 9 8
```

## Sample Output 1

```text
100 100
9
9 9 9
```
