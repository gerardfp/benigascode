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

## Input

La entrada consta de una serie de casos de prueba.
El primer número T indica la cantidad de casos de prueba que vienen a continuación.
Por cada caso de prueba se indica en el primer número N la cantidad de números que hay en la secuencia, y a continuación vienen los números de dicha secuencia.

1 <= T <= 100
1 <= N <= 10^7

## Output

Por cada caso de prueba se imprimirá en una linea la secuencia de picos encontrados, separados por un espacio.
