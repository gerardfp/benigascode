# Vendes acumulades #for

![image](1612518208-85a36e5f0d-1611072820-bb34bae5ac-accventas.png)

La venda acumulada d'un mes és sumar a les vendes d'un mes les vendes dels mesos anteriors.

A partir de les dades de vendes mensuals, calcula les vendes acumulades de cada mes.

## Input Format

El primer número  indica la quantitat de mesos.

A continuació ve la quantitat de vendes de cada mes.

## Constraints

-

## Output Format

S'imprimiran les vendes en format Array: `[0, 0, 0, 0]`

## Sample Input 0

```text
5
1 2 3 4 5
```

## Sample Output 0

```text
[1, 3, 6, 10, 15]
```

## Explanation 0

[1, 1+2, 1+2+3, 1+2+3+4, 1+2+3+4+5]

## Sample Input 1

```text
3
15 10 5
```

## Sample Output 1

```text
[15, 25, 30]
```

## Explanation 1

[15, 15+10, 15+10+5]

## Sample Input 2

```text
4
0 0 1 1
```

## Sample Output 2

```text
[0, 0, 1, 2]
```

## Sample Input 3

```text
3
1 0 0
```

## Sample Output 3

```text
[1, 1, 1]
```

## Sample Input 4

```text
6
0 0 0 0 0 0
```

## Sample Output 4

```text
[0, 0, 0, 0, 0, 0]
```
