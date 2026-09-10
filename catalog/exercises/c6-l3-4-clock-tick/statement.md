# [c10c4] Clock tick #class

Implementa els següents mètodes:
- Clock.tick() : augmenta en un segon el temps del rellotge
- Clock.reset() : posa a 0 el temps del rellotge
- Clock.getTime() : ha de retornar el temps del rellotge en format hh:mm:ss

## Input Format

La entrada consisteix en un seqüencia de números. Un número positiu indica la quantitat de ticks que s'han de fer al rellotge. Un zero significa 'reset'.

## Constraints

-

## Output Format

S'ha d'imprimir el temps del rellotge en format "hh:mm:ss" després de cada número llegit de l'entrada.

## Sample Input 0

```text
1 60 3600 0   -1
```

## Sample Output 0

```text
00:00:01
00:01:01
01:01:01
00:00:00
```

## Sample Input 1

```text
1 0 60 0 3600    -1
```

## Sample Output 1

```text
00:00:01
00:00:00
00:01:00
00:00:00
01:00:00
```

## Sample Input 2

```text
1 1 1 1 60 60 60 3600 3600   -1
```

## Sample Output 2

```text
00:00:01
00:00:02
00:00:03
00:00:04
00:01:04
00:02:04
00:03:04
01:03:04
02:03:04
```

## Sample Input 3

```text
34 456 23 32435 0 34235    -1
```

## Sample Output 3

```text
00:00:34
00:08:10
00:08:33
09:09:08
00:00:00
09:30:35
```
