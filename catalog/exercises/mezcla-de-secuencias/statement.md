# [f1762] Mescla de seqüències #array

Donades dues seqüències de nombres, s'ha d'obtenir una mescla d'elles.

Per a obtenir la mescla s'ha d'agafar un element de cada seqüència alternativament. És a dir, primer un nombre de la primera seqüència, després un altre de la segona, i així successivament. Quan en una seqüència ja no queden més nombres, s'agafaran els nombres que quedin de l'altra.

## Input Format

La entrada consta de des seqüències.

Per a cada seqüència, el primer nombre  indica el tamany. A continuació ve la seqüència.

## Constraints

-

## Output Format

La seqüència resultant.

## Sample Input 0

```text
3    100 200 300
3    400 500 600
```

## Sample Output 0

```text
100 400 200 500 300 600
```

## Sample Input 1

```text
5    10 11 12 13 14
5    20 21 22 23 24
```

## Sample Output 1

```text
10 20 11 21 12 22 13 23 14 24
```

## Sample Input 2

```text
1    1000
1    2000
```

## Sample Output 2

```text
1000 2000
```

## Sample Input 3

```text
4    1 2 3 4
3    1 2 3
```

## Sample Output 3

```text
1 1 2 2 3 3 4
```

## Sample Input 4

```text
6    1 2 3 4 5 6
3    1 2 3
```

## Sample Output 4

```text
1 1 2 2 3 3 4 5 6
```

## Sample Input 5

```text
3    10 20 30
6    10 20 30 40 50 60
```

## Sample Output 5

```text
10 10 20 20 30 30 40 50 60
```

## Sample Input 6

```text
6     76 65 98 45 32 21
3     99 88 77
```

## Sample Output 6

```text
76 99 65 88 98 77 45 32 21
```
