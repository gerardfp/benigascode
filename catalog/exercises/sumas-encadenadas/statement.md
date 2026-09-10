# Sumas encadenadas

Dada una secuencia de números, cuenta la cantidad de sumas encadenadas que hay.

Una suma encadenada cuando hay tres números consecutivos, de forma que la suma de los dos primeros es igual al tercero.

## Input Format

Una secuencia de N números terminados en un 0.

## Constraints

3 <= N <= 1000

## Output Format

Un número indicando la cantidad de sumas encadenadas.

## Sample Input 0

```text
1 2 3 10 11 21 22 0
```

## Sample Output 0

```text
2
```

## Explanation 0

En esta secuencia hay dos sumas encadenadas:

1 2 3   =>  1 + 2 = 3

10 11 21   => 10 + 11 = 21

## Sample Input 1

```text
10 10 20 30    0
```

## Sample Output 1

```text
2
```

## Explanation 1

Hay dos sumas encadenadas:

10 10 20

10 20 30

## Sample Input 2

```text
4 0 4 4 2 6 8    0
```

## Sample Output 2

```text
4
```

## Sample Input 3

```text
3 6 9 1 1 2 3 5 8 4    0
```

## Sample Output 3

```text
5
```

## Sample Input 4

```text
1 1 1   0
```

## Sample Output 4

```text
0
```

## Sample Input 5

```text
8 8 2 0 0 9 0 1 5 7    0
```

## Sample Output 5

```text
0
```

## Sample Input 6

```text
1 1 2   0
```

## Sample Output 6

```text
1
```

## Sample Input 7

```text
5 6 1 7 2 0 7 2 4 1 9 8 4 5 9 9 0 2 1 3 4 7 9 8 1 3 4 7 2 4 6 2 2 4 4 8 9 9 0 6 1 6 1 6 6 3 8 5 9 7 2 4 4 0 0 3 0 9 9 5 1 7 1 1 6 8 4 6 0 8 4 8 6 3 2 7 3 9 4 7 0 1 1 5 4 2 0 2 5 7 3 3 0 5 5 7 7 0 3    0
```

## Sample Output 7

```text
15
```
