# [C2-L1-3] Operadors perduts #if

Donats dos operands i un resultat, troba l'operador que satisfà la operació.

Els operadors possibles són: suma, resta, multiplicació, divisió i mòdul.

```text
+ - * / %
```

Si la operació pot ser resolta per més d'un operador, s'ha d'escollir el que estigui primer en la llista.

Si no es pot satisfer amb ninguna operació s'escriurà "IMPOSSIBLE".

## Input Format

Dos operands O1 i O2. I un resultat R

## Constraints

0 <= O1 <= 10^9

0 <= O2 <= 10^9

0 <= R <= 10^9

## Output Format

Es mostrarà el símbol de l'operador que satisfà la operació.

```text
+ - * / %
```

En cas de que no es puig satisfer amb cap, es mostrarà:

```text
IMPOSSIBLE
```

## Sample Input 0

```text
1 1 1
```

## Sample Output 0

```text
*
```

## Explanation 0

1 ***** 1 = 1

## Sample Input 1

```text
1 2 3
```

## Sample Output 1

```text
+
```

## Explanation 1

1 **+** 2 = 3

## Sample Input 2

```text
0 0 0
```

## Sample Output 2

```text
+
```

## Explanation 2

0 **+** 0 = 0

## Sample Input 3

```text
10 0 7
```

## Sample Output 3

```text
IMPOSSIBLE
```

## Sample Input 4

```text
1 3 1
```

## Sample Output 4

```text
%
```

## Explanation 4

1 **%** 3 = 1

## Sample Input 5

```text
30 12 6
```

## Sample Output 5

```text
%
```

## Sample Input 6

```text
13 7 91
```

## Sample Output 6

```text
*
```

## Sample Input 7

```text
14 7 2
```

## Sample Output 7

```text
/
```

## Sample Input 8

```text
10 3 1
```

## Sample Output 8

```text
%
```

## Sample Input 9

```text
55 15 10
```

## Sample Output 9

```text
%
```

## Sample Input 10

```text
84 0 0
```

## Sample Output 10

```text
*
```

## Sample Input 11

```text
62 0 21
```

## Sample Output 11

```text
IMPOSSIBLE
```

## Sample Input 12

```text
99 15 29
```

## Sample Output 12

```text
IMPOSSIBLE
```
