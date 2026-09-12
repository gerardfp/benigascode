# Picos máximos y mínimos

Dada una secuencia de picos máximos y mínimos, escribir la sucesión de números consecutivos que completan dichos picos. **La secuencia comienza por un pico mínimo**.

Un pico máximo es un número cuyos antorior y siguiente son menores que él, y un pico mínimo es un número cuyos anterior y siguiente son mayores que él.

Ej:

Picos: 10 14 12 15

Sucesión: 10 11 12 13 14 13 12 13 14 15

## Input

La entrada consta de una serie de casos de prueba.
El primer número T indica la cantidad de casos de prueba que vienen a continuación.
Por cada caso de prueba se indica en el primer número N la cantidad de picos que hay en la secuencia, y a continuación vienen los picos de dicha secuencia. **El primer pico de cada secuencia es un pico mínimo**.

1 <= T <= 100
1 <= N <= 10^7

## Output

Por cada caso de prueba se escribirá en una sola linea la sucesión de números consecutivos, separados por un espacio en blanco.
