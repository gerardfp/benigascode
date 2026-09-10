# Outline #arrays

Dadas unas figuras, dibuja su contorno.

Los ángulos se marcarán con un `+`

Las líneas verticales con un `|`

Las líneas horizontales con un `-`

## Input Format

Los números  y  indican el ancho y alto del lienzo.

A continuación vienen los x píxeles:

Un símbolo `#` representa el relleno de la figura

Un símbolo `.` representa el fondo del lienzo.

## Constraints

-

## Output Format

Se imprimirá el lienzo resultante conforme los casos de prueba.

## Sample Input 0

```text
5 5
. . . . .
. # # # .
. # # # .
. # # # .
. . . . .
```

## Sample Output 0

```text
. . . . .
. + - + .
. |   | .
. + - + .
. . . . .
```

## Sample Input 1

```text
8 7
. . . . . . . .
. # # # # . . .
. # # # # . . .
. # # # # # # .
. # # # # # # .
. # # # # # # .
. . . . . . . .
```

## Sample Output 1

```text
. . . . . . . .
. + - - + . . .
. |     | . . .
. |     + - + .
. |         | .
. + - - - - + .
. . . . . . . .
```

## Sample Input 2

```text
6 7
. . . . . .
# # # # # .
# # # # # .
# # # # # .
. . # # # .
. . # # # .
. . . . . .
```

## Sample Output 2

```text
. . . . . .
+ - - - + .
|       | .
+ - +   | .
. . |   | .
. . + - + .
. . . . . .
```

## Sample Input 3

```text
7 5
# # # # # . .
# # # # # . .
# # # # # # #
. . # # # # #
. . # # # # #
```

## Sample Output 3

```text
+ - - - + . .
|       | . .
+ - +   + - +
. . |       |
. . + - - - +
```

## Sample Input 4

```text
13 15
. . . . . . . . . . . . .
. . . # # # . # # # . . .
. . . # # # . # # # . . .
. # # # # # # # # # # # .
. # # # # # # # # # # # .
. # # # # # # # # # # # .
. . . # # # . # # # . . .
. . . # # # . # # # . . .
. . . # # # . # # # . . .
. # # # # # # # # # # # .
. # # # # # # # # # # # .
. # # # # # # # # # # # .
. . . # # # . # # # . . .
. . . # # # . # # # . . .
. . . . . . . . . . . . .
```

## Sample Output 4

```text
. . . . . . . . . . . . .
. . . + - + . + - + . . .
. . . |   | . |   | . . .
. + - +   + - +   + - + .
. |                   | .
. + - +   + - +   + - + .
. . . |   | . |   | . . .
. . . |   | . |   | . . .
. . . |   | . |   | . . .
. + - +   + - +   + - + .
. |                   | .
. + - +   + - +   + - + .
. . . |   | . |   | . . .
. . . + - + . + - + . . .
. . . . . . . . . . . . .
```

## Sample Input 5

```text
11 13
. . # # # . # # # . .
. . # # # . # # # . .
# # # # # # # # # # #
# # # # # # # # # # #
# # # # # # # # # # #
. . # # # . # # # . .
. . # # # . # # # . .
. . # # # . # # # . .
# # # # # # # # # # #
# # # # # # # # # # #
# # # # # # # # # # #
. . # # # . # # # . .
. . # # # . # # # . .
```

## Sample Output 5

```text
. . + - + . + - + . .
. . |   | . |   | . .
+ - +   + - +   + - +
|                   |
+ - +   + - +   + - +
. . |   | . |   | . .
. . |   | . |   | . .
. . |   | . |   | . .
+ - +   + - +   + - +
|                   |
+ - +   + - +   + - +
. . |   | . |   | . .
. . + - + . + - + . .
```
