# [b6e14] Code analyzer #for

Donat un codi font en llenguatge Java, compta la quantitat de classes que hi ha definides.

## Input Format

L'entrada és un codi font en vàries línies.

La paraula  sempre va separada per espais en blanc de la resta del codi.

El codi acaba amb la paraula

## Constraints

-

## Output Format

S'imprimirà la quantitat de classes definides.

## Sample Input 0

```text
class A {
   int x;
}

END
```

## Sample Output 0

```text
1
```

## Sample Input 1

```text
class Mktr {}

class Pkjy {}

END
```

## Sample Output 1

```text
2
```

## Sample Input 2

```text
class Mktr {
   class Trws {}
}

class Pkjy {}

END
```

## Sample Output 2

```text
3
```

## Sample Input 3

```text
class Mktr {}

abstract class Pkjy extends Mktr{
   int i;

   void xcvb();
}

END
```

## Sample Output 3

```text
2
```

## Sample Input 4

```text
class Mktr {}

abstract class Pkjy extends Mktr{
   int i;

   void xcvb();

   class Swqz { class Ynvc {} }
}

END
```

## Sample Output 4

```text
4
```

## Sample Input 5

```text
int i = 0;
END
```

## Sample Output 5

```text
0
```
