# [da218] Preu del ferrocarril #if

Escriu un programa que determini el preu d'un bolet d'anada i tornada en ferrocarril, donada la distància a recòrrer i la quantitat en dies en el destí, sabent que:

- Si l'estada és de més de 7 dies i la distància és més de 800km, el bolet té un descompte del 30%.

- El preu per quilòmetre és de 0.35 euros.

## Input Format

La distància  a del viatge (float).

La quantitat  de dies en el destí (int).

## Constraints

-

## Output Format

El preu del bolet.

## Sample Input 0

```text
200.0 1
```

## Sample Output 0

```text
70.0
```

## Sample Input 1

```text
900.0 1
```

## Sample Output 1

```text
315.0
```

## Sample Input 2

```text
100.0 10
```

## Sample Output 2

```text
35.0
```

## Sample Input 3

```text
900.0 10
```

## Sample Output 3

```text
220.5
```

## Sample Input 4

```text
800.0 7
```

## Sample Output 4

```text
280.0
```

## Sample Input 5

```text
801.0 7
```

## Sample Output 5

```text
280.35
```

## Sample Input 6

```text
800.0 8
```

## Sample Output 6

```text
280.0
```

## Sample Input 7

```text
801.0 8
```

## Sample Output 7

```text
196.245
```

## Sample Input 8

```text
234.5 1
```

## Sample Output 8

```text
82.075
```
