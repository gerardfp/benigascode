# [C3-L1-10] Encistellaments #for

Al basquetbol es poden anotar cistelles d'1, 2 i 3 punts.

Donada l'evolució de la puntuació d'un equip en un partit, determina el nombre de cistelles anotades d'1, 2 i 3 punts.

Exemple:

Evolució de la puntuació:

```text
2 4 7 8 11 13 14
```

- La primera cistella va estar de 2 punts

- La segona cistella va estar de 2 punts

- La tercera cistella va estar de 3 punts

- La quarta cistella va estar d'1 punt

- La cinquena cistella va estar de 3 punts

- La sisena cistella va estar de 2 punts

- L'última cistella va estar de 1 punt

En total:

- Cistelles d' 1 punt -> 2

- Cistelles de 2 punts -> 3

- Cistelles de 3 punts -> 2

## Input Format

L'entrada consta d'una seqüència d'  nombres que indiquen l'evolució de la puntuació.

L'entrada acaba amb un -1.

## Constraints

-

## Output Format

El nombre de cistelles d'1, 2 i 3 punts, en diferents línies.

## Sample Input 0

```text
1 4 6 7 9   -1
```

## Sample Output 0

```text
2
2
1
```

## Explanation 0

La primera cistella va estar d' 1 punt.

La segona cistella va estar de 3 punts

La tercera cistella va estar de 2 punts

La quarta cistella va estar de 1 punt

La cinquena cistella va estar de 2 punts

Total cistelles d' 1 punt -> **2**

Total cistelles de 2 punts -> **2**

Total cistelles de 3 punts -> **1**

## Sample Input 1

```text
3 5 6 9   -1
```

## Sample Output 1

```text
1
1
2
```

## Explanation 1

La primera cistella va estar de 3 punts.

La segona cistella va estar de 2 punts.

La tercera cistella va estar de 1 punt.

La quarta cistella va estar de 3 punts.

Total cistelles de 1 punt -> **1**

Total cistelles de 2 punts -> **1**

Total cistelles de 3 punts -> **2**

## Sample Input 2

```text
3    -1
```

## Sample Output 2

```text
0
0
1
```

## Explanation 2

Només va haver-hi **1 ** cistella i va estar de 3 punts

## Sample Input 3

```text
1 3 6   -1
```

## Sample Output 3

```text
1
1
1
```

## Explanation 3

Una cistella de cada

## Sample Input 4

```text
3 4 7 9 12 15 16 17 20 21 23 25 28    -1
```

## Sample Output 4

```text
4
3
6
```

## Sample Input 5

```text
2 3 6 7 8 11 14 16 19 20 21 22 25 28 29 31 32 33 34 36 39 41 43 45 48 51 52 55 56 57 58 60 62 63 66 68 70 71 73 75 76 77 78      -1
```

## Sample Output 5

```text
19
13
11
```

## Sample Input 6

```text
1 4 5 8 10 11 13 14 17 18 20 23 25 27 28 29 31 34 36 38 40 42 44 45 48 49 50 53 54 55 57 60 62 63 65 67 69 70 73 74 75 78 79 81    -1
```

## Sample Output 6

```text
17
17
10
```

## Sample Input 7

```text
1  -1
```

## Sample Output 7

```text
1
0
0
```

## Sample Input 8

```text
-1
```

## Sample Output 8

```text
0
0
0
```

## Sample Input 9

```text
2   -1
```

## Sample Output 9

```text
0
1
0
```
