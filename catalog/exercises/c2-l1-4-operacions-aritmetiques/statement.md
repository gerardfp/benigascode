# [C2-L1-4] Expressions aritmètiques #if

Implementa un intèrpret d'expressions aritmètiques.

Els operadors que ha d'implementar són:

```text
+    Addició
-    Subtracció
*    Multiplicació
/    Divisió
%    Residu
```

## Input Format

La entrada consisteix en el primer operand , l'operador , i el segon operand , separats per espais en blanc.

## Constraints

-100 <=  <= 100

-100 <=  <= 100

 i  són nombres decimals.

## Output Format

El resultat de la operació (float), o els missatges `Error: division by zero` i `Error: operation not permitted` en el seu cas.

## Sample Input 0

```text
1 + 1
```

## Sample Output 0

```text
2.0
```

## Sample Input 1

```text
1 - 1
```

## Sample Output 1

```text
0.0
```

## Sample Input 2

```text
100 * 100
```

## Sample Output 2

```text
10000.0
```

## Sample Input 3

```text
5 / 10
```

## Sample Output 3

```text
0.5
```

## Sample Input 4

```text
10 % 0.5
```

## Sample Output 4

```text
0.0
```

## Sample Input 5

```text
10 / 0
```

## Sample Output 5

```text
Error: division by zero
```

## Sample Input 6

```text
7 & 3
```

## Sample Output 6

```text
Error: operation not permitted
```

## Sample Input 7

```text
27 % 0
```

## Sample Output 7

```text
Error: division by zero
```
