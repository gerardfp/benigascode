# [bf6f0] FunctionGame2 #class #L0

Crea els mètodes de la classe FunctionGame2

## Input Format

-

## Constraints

-

## Output Format

-

## Sample Input 0

```text
function1 1 2 3 5 10
```

## Sample Output 0

```text
1 -> false
2 -> true
3 -> false
5 -> false
10 -> true
```

## Sample Input 1

```text
function2 1.34 2.99 -3.2 0.00 10.1 -10.1
```

## Sample Output 1

```text
1.34 -> true
2.99 -> true
-3.2 -> false
0.0 -> true
10.1 -> true
-10.1 -> false
```

## Sample Input 2

```text
function3 2 hola 4 pa 5 ja 10 mi
```

## Sample Output 2

```text
2,hola -> holahola
4,pa -> papapapa
5,ja -> jajajajaja
10,mi -> mimimimimimimimimimi
```

## Sample Input 3

```text
function4 3 1 2 3   4 3 4 5 6  2 9 10  5 10 10 10 10 10
```

## Sample Output 3

```text
[1, 2, 3] -> 6
[3, 4, 5, 6] -> 18
[9, 10] -> 19
[10, 10, 10, 10, 10] -> 50
```

## Sample Input 4

```text
function5 3 1 2 3   4 4 5 6 7  3 10 20 30  5 -1 -2 4 9 7
```

## Sample Output 4

```text
[1, 2, 3] -> [2, 4, 6]
[4, 5, 6, 7] -> [8, 10, 12, 14]
[10, 20, 30] -> [20, 40, 60]
[-1, -2, 4, 9, 7] -> [-2, -4, 8, 18, 14]
```

## Sample Input 5

```text
function6  2 false   3 true   5 false   6 true
```

## Sample Output 5

```text
2,false -> [falso, falso]
3,true -> [cierto, cierto, cierto]
5,false -> [falso, falso, falso, falso, falso]
6,true -> [cierto, cierto, cierto, cierto, cierto, cierto]
```

## Sample Input 6

```text
function7   2 java javascript   3 java javascript java   5 swift dart python c# TypeScript   6 java php java java java C    10 c++ java python java haskell go rust kotlin perl bash
```

## Sample Output 6

```text
[java, javascript] -> 1
[java, javascript, java] -> 2
[swift, dart, python, c#, TypeScript] -> 0
[java, php, java, java, java, C] -> 4
[c++, java, python, java, haskell, go, rust, kotlin, perl, bash] -> 2
```

## Sample Input 7

```text
function8  1 2 3  4 6 5  8 7 9  21 31 11  61 41 51  91 81 71  10 10 11  11 10 10  12 12 12
```

## Sample Output 7

```text
1,2,3 -> [1, 2, 3]
4,6,5 -> [4, 5, 6]
8,7,9 -> [7, 8, 9]
21,31,11 -> [11, 21, 31]
61,41,51 -> [41, 51, 61]
91,81,71 -> [71, 81, 91]
10,10,11 -> [10, 10, 11]
11,10,10 -> [10, 10, 11]
12,12,12 -> [12, 12, 12]
```
