# Superbowling

En el juego de bolos, los bolos se colocan en filas de manera que en la primera fila hay un bolo, y en cada fila hay un bolo más que en la anterior.

![image](1548249910-2030623bda-Untitleddrawing.png)

Dado un número de bolos, determina si es posible organizarlos para que se forme un triangulo completo, es decir que ninguna fila quede incompleta.

## Input Format

Un numero N de bolos

## Constraints

1 <= N <= 100000

## Output Format

true | false

## Sample Input 0

```text
6
```

## Sample Output 0

```text
true
```

## Explanation 0

6 bolos se pueden colocar perfectamente:

```text
o o o
 o o
  o
```

## Sample Input 1

```text
8
```

## Sample Output 1

```text
false
```

## Explanation 1

8 bolos no se pueden colocar de forma perfecta. Quedaría incompleto.

```text
o o
 o o o
  o o
   o
```

## Sample Input 2

```text
21
```

## Sample Output 2

```text
true
```

## Explanation 2

21 bolos se pueden colocar perfectamente:

```text
o o o o o o
 o o o o o
  o o o o
   o o o
    o o
     o
```

## Sample Input 3

```text
4
```

## Sample Output 3

```text
false
```

## Explanation 3

Con 4 bolos el triángulo queda incompleto:

```text
o
 o o
  o
```

## Sample Input 4

```text
91
```

## Sample Output 4

```text
true
```

## Sample Input 5

```text
78
```

## Sample Output 5

```text
true
```

## Sample Input 6

```text
1
```

## Sample Output 6

```text
true
```

## Sample Input 7

```text
990
```

## Sample Output 7

```text
true
```

## Sample Input 8

```text
9870
```

## Sample Output 8

```text
true
```

## Sample Input 9

```text
998991
```

## Sample Output 9

```text
true
```

## Sample Input 10

```text
997570
```

## Sample Output 10

```text
false
```

## Sample Input 11

```text
27
```

## Sample Output 11

```text
false
```
