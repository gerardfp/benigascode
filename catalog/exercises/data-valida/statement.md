# [fd2f8] Data vàlida  #operadors

Una data és vàlida si el número de dia està dintre dels dies del mes.

Cal tenir en compte que un any pot ser bixest. Un any és bixest si és divisible entre quatre i, o bé no és divisible entre 100 o és divisible entre 400.

## Input Format

Tres nombres corresponents a una data en format `dd/mm/yyyy`

## Constraints

-

## Output Format

`true` si la data és vàlida

`false` si no ho és

## Sample Input 0

```text
1 10 2000
```

## Sample Output 0

```text
true
```

## Explanation 0

1 d'Octubre del 2000 és una data vàlida

## Sample Input 1

```text
32 10 2000
```

## Sample Output 1

```text
false
```

## Explanation 1

32 d'Ocutbre del 2000 no és una data vàlida

## Sample Input 2

```text
31 10 2000
```

## Sample Output 2

```text
true
```

## Explanation 2

31 d'Octubre del 2000 és una data vàlida

## Sample Input 3

```text
31 11 2000
```

## Sample Output 3

```text
false
```

## Sample Input 4

```text
29 2 2000
```

## Sample Output 4

```text
true
```

## Explanation 4

El 2000 és bixest

## Sample Input 5

```text
29 2 1900
```

## Sample Output 5

```text
false
```

## Explanation 5

El 1900 no és bixest

## Sample Input 6

```text
29 2 1904
```

## Sample Output 6

```text
true
```

## Explanation 6

El 1904 és bixest

## Sample Input 7

```text
28 2 1994
```

## Sample Output 7

```text
true
```

## Sample Input 8

```text
29 2 2020
```

## Sample Output 8

```text
true
```

## Sample Input 9

```text
29 2 2100
```

## Sample Output 9

```text
false
```

## Sample Input 10

```text
31 8 2024
```

## Sample Output 10

```text
true
```

## Sample Input 11

```text
31 9 2024
```

## Sample Output 11

```text
false
```

## Sample Input 12

```text
30 6 2024
```

## Sample Output 12

```text
true
```

## Sample Input 13

```text
31 4 2024
```

## Sample Output 13

```text
false
```

## Sample Input 14

```text
0 1 2020
```

## Sample Output 14

```text
false
```
