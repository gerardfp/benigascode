# Primeros iguales a últimos

Para cada caso de prueba, se deben ir leyendo números hasta que se lea un 0. El programa debe mostrar "SI" en caso de que el primer número leído sea igual al último número leído antes que el 0. En caso contrario debe mostrar "NO".

## Input Format

El primer número (T) indica el número de casos de prueba.
A continuación viene una secuencia de N números por cada caso de prueba.
Cada secuencia finaliza con un 0.

## Constraints

1 <= T <= 100
1 <= N <= 10^7

## Output Format

Un "SI" o un "NO" por cada caso de prueba, separados por un salto de linea "\n"

## Sample Input 0

```text
1
1 2 3 1 0
```

## Sample Output 0

```text
SI
```

## Sample Input 1

```text
1
1 2 3 4 0
```

## Sample Output 1

```text
NO
```

## Sample Input 2

```text
2
1 2 3 1 0
1 2 2 1 0
```

## Sample Output 2

```text
SI
SI
```

## Sample Input 3

```text
2
1 2 3 1 0
1 2 3 4 0
```

## Sample Output 3

```text
SI
NO
```

## Sample Input 4

```text
4
1 2 1 2 0
1 1 1 2 0
1 2 2 1 1 0
-1 0
```

## Sample Output 4

```text
NO
NO
SI
SI
```

## Sample Input 5

```text
3
5 4 2 0
6 4 3 6 0
4 0
```

## Sample Output 5

```text
NO
SI
SI
```

## Sample Input 6

```text
2
6 7 4 9 0
9 9 9 8 0
```

## Sample Output 6

```text
NO
NO
```
