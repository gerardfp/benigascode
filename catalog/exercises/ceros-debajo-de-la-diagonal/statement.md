# [C3-L1-4] Zeros sota la diagonal #for

![image](1572515447-3bfc4d932d-zerosdiagonal.png)

Donada una matriu quadrada de nombres, digues si tots els nombres per sota de la diagonal són 0.

## Input Format

El primer nombre  indica el tamany de la matriu (x).

A continuació venen els nombres de la matriu.

## Constraints

-

## Output Format

{ SI | NO }

## Sample Input 0

```text
2
1 2
0 4
```

## Sample Output 0

```text
SI
```

## Sample Input 1

```text
3
0 0 0
0 0 0
0 0 0
```

## Sample Output 1

```text
SI
```

## Sample Input 2

```text
4
1 2 3 4
0 2 3 4
0 0 3 4
0 0 0 4
```

## Sample Output 2

```text
SI
```

## Sample Input 3

```text
3
0 0 0
1 0 0
0 0 0
```

## Sample Output 3

```text
NO
```

## Sample Input 4

```text
3
0 0 0
0 1 0
0 0 0
```

## Sample Output 4

```text
SI
```

## Sample Input 5

```text
3
0 0 0
0 0 0
1 0 0
```

## Sample Output 5

```text
NO
```

## Sample Input 6

```text
3
0 0 0
0 0 0
0 1 0
```

## Sample Output 6

```text
NO
```

## Sample Input 7

```text
5
11 12 13 14 15
21 22 23 24 25
31 32 33 34 35
41 42 43 44 45
51 52 53 54 55
```

## Sample Output 7

```text
NO
```

## Sample Input 8

```text
5
11 12 13 14 15
 0 22 23 24 25
 0  0 33 34 35
 0  0  0 44 45
 0  0  0  0 55
```

## Sample Output 8

```text
SI
```

## Sample Input 9

```text
2
1 2 0 3
```

## Sample Output 9

```text
SI
```

## Explanation 9

```text
1 2 0 3   =>    1 2
                0 3
```

## Sample Input 10

```text
3
1 2 3 0 4 5 0 0 6
```

## Sample Output 10

```text
SI
```

## Explanation 10

```text
1 2 3
1 2 3 0 4 5 0 0 6   =>   0 4 5
                         0 0 6
```

## Sample Input 11

```text
9
 1  5  7  3  6  4  0  0  9
 0  7  8  5  0  9  3  6  3
 0  0  6  8  9  6  8  1  5
 0  0  0  3  4  8  8  5  9
 0  0  0  0  0  1  8  8  8
 0  0  0  0  0  8  7  3  1
 0  0  0  0  0  0  1  3  4
 0  0  0  0  0  0  0  0  6
 0  0  0  0  0  0  0  0  2
```

## Sample Output 11

```text
SI
```

## Sample Input 12

```text
13
 8  4  7  6  8  2  6  9  4  1  7  9  4
 6  5  5  0  1  8  8  1  3  3  4  2  0
 7  1  2  4  6  4  0  2  4  9  3  6  6
 2  7  3  5  7  6  0  0  2  7  3  2  3
 3  7  8  7  1  6  0  3  0  9  6  7  9
 4  5  0  3  1  7  1  1  9  3  4  0  4
 1  2  4  7  1  4  2  3  3  2  0  0  0
 7  6  9  1  9  4  6  2  3  7  1  1  5
 7  7  1  7  5  6  7  1  2  1  1  5  0
 4  8  8  3  7  1  3  9  6  1  7  5  4
 4  5  9  0  1  0  0  3  8  6  3  1  0
 2  8  1  2  6  1  5  0  1  0  3  0  9
 7  5  5  0  3  3  9  1  6  0  0  3  2
```

## Sample Output 12

```text
NO
```
