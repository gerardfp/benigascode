# [de5a8] Càlcul de notes #if

Donada una entrada de teclat corresponent a la marca numèrica d'un examen, el programa imprimirà la qualificació textual corresponent:

- Menys de 5: INSUFICIENT

- 5 a 6 (no inclòs): SUFICIENT

- 6 a 7 (no inclòs): BE

- 7 a 8.5 (no inclòs): NOTABLE

- 8.5 a 10 (no inclòs): EXCEL.LENT

- 10: MATRICULA

## Input Format

Un número flotant corresponent a la nota

## Constraints

-

## Output Format

{ INSUFICIENT | SUFICIENT | BE | NOTABLE | EXCEL.LENT | MATRICULA }

## Sample Input 0

```text
4.5
```

## Sample Output 0

```text
INSUFICIENT
```

## Sample Input 1

```text
4.999
```

## Sample Output 1

```text
INSUFICIENT
```

## Sample Input 2

```text
5
```

## Sample Output 2

```text
SUFICIENT
```

## Sample Input 3

```text
5.999
```

## Sample Output 3

```text
SUFICIENT
```

## Sample Input 4

```text
6
```

## Sample Output 4

```text
BE
```

## Sample Input 5

```text
6.999
```

## Sample Output 5

```text
BE
```

## Sample Input 6

```text
7
```

## Sample Output 6

```text
NOTABLE
```

## Sample Input 7

```text
8.499
```

## Sample Output 7

```text
NOTABLE
```

## Sample Input 8

```text
8.5
```

## Sample Output 8

```text
EXCEL.LENT
```

## Sample Input 9

```text
9.255
```

## Sample Output 9

```text
EXCEL.LENT
```

## Sample Input 10

```text
9.999
```

## Sample Output 10

```text
EXCEL.LENT
```

## Sample Input 11

```text
10
```

## Sample Output 11

```text
MATRICULA
```
