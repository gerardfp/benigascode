# [C3-L1-7] Trobant mines #for

![image](1556787774-25eb5a4261-buscaminas_05.jpg)

Donat un tauler del buscamines, s'ha de dir en quines posicions (fila i columna) es troben les mines.

## Input Format

L'entrada consisteix en primer lloc de dos nombres  i , que indiquen el nombre de files i columnes que té el tauler.
A continuació venen les caselles del tauler (0, 1)

Les caselles sense mines es representen amb un  i les que tenen mina amb un .

## Constraints

-

## Output Format

S'escriurà la posició (fila i columna, separades per un espai) de cada mina trobada.

## Sample Input 0

```text
3 3
1 0 0
0 0 0
0 0 1
```

## Sample Output 0

```text
1 1
3 3
```

## Sample Input 1

```text
3 4
1 1 0 0
0 0 1 0
0 1 0 0
```

## Sample Output 1

```text
1 1
1 2
2 3
3 2
```

## Sample Input 2

```text
1 1
1
```

## Sample Output 2

```text
1 1
```

## Sample Input 3

```text
5 5
0 0 0 0 0
0 0 0 0 0
0 0 1 0 0
0 0 0 0 0
0 0 0 0 0
```

## Sample Output 3

```text
3 3
```

## Sample Input 4

```text
1 4
0 1 0 1
```

## Sample Output 4

```text
1 2
1 4
```

## Sample Input 5

```text
4 1
0
1
0
1
```

## Sample Output 5

```text
2 1
4 1
```

## Sample Input 6

```text
7 6
0 1 0 1 1 0
1 1 1 0 0 0
0 0 1 1 1 0
1 0 0 0 1 1
1 1 0 1 0 0
0 0 0 1 1 1
1 0 0 0 1 1
```

## Sample Output 6

```text
1 2
1 4
1 5
2 1
2 2
2 3
3 3
3 4
3 5
4 1
4 5
4 6
5 1
5 2
5 4
6 4
6 5
6 6
7 1
7 5
7 6
```
