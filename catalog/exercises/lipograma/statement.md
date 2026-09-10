# [C5-L1-1] Lipograma #strings

Donat un text i una lletra, dir si el text **omet** aquesta lletra.

## Input Format

En primer lloc va el text, en vàries línies, i acabat amb .

A continuació ve el caràcter.

## Constraints

-

## Output Format

true | false

## Sample Input 0

```text
Hello world!
END
e
```

## Sample Output 0

```text
false
```

## Sample Input 1

```text
Hello World!
END
a
```

## Sample Output 1

```text
true
```

## Sample Input 2

```text
Hello World!
END
u
```

## Sample Output 2

```text
true
```

## Sample Input 3

```text
Lorem ipsum
dolor sit amet,
consectetur adipiscing elit
END
x
```

## Sample Output 3

```text
true
```

## Sample Input 4

```text
Lorem ipsum
dolor sit amet,
consectetur adipiscing
END
g
```

## Sample Output 4

```text
false
```
