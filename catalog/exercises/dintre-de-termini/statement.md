# Dintre de termini #if

Donades tres dates, digues si la segona és posterior a la primera i anterior a la tercera.

## Input Format

L'entrada consisteix en tres dates en format `dd / mm / yyyy`.

Les tres dates són distintes.

## Constraints

-

## Output Format

S'imprimirà `true` si la segona data és posterior a la primera i anterior a la tercera, i `false` en cas contrari.

**Suggerència per a la solució**

Cal llegir el dia, mes i any de cada data amb `nextInt()`. S'hauràn de descartar les barres `/` amb `next()`.

Una possible idea per a la solució és presuposar que la segona data està enmig, i després veure si es compleix alguna condició que impliqui que realment no està enmig.

```text
// suposem que està enmig
boolean enmig = true;

// mirem si hi ha alguna condició
// que contradigui la presuposició incial
if (any1 > any2) {
    enmig = false;
} else if (any2 > any3) {
    enmig = false;
}
// resta de condicions

// imprimim el resultat
System.out.println(enmig);
```

## Sample Input 0

```text
7 / 1 / 1999      17 / 10 / 2050      7 / 1 / 2020
```

## Sample Output 0

```text
false
```

## Sample Input 1

```text
7 / 1 / 1999      7 / 1 / 2020      7 / 1 / 2050
```

## Sample Output 1

```text
true
```

## Sample Input 2

```text
7 / 1 / 1999      7 / 10 / 2020      17 / 1 / 2020
```

## Sample Output 2

```text
false
```

## Sample Input 3

```text
7 / 1 / 1999      7 / 12 / 1999      7 / 1 / 2020
```

## Sample Output 3

```text
true
```

## Sample Input 4

```text
7 / 1 / 1999      17 / 1 / 2050      27 / 1 / 2020
```

## Sample Output 4

```text
false
```

## Sample Input 5

```text
7 / 1 / 1999      17 / 12 / 2020      17 / 1 / 1999
```

## Sample Output 5

```text
false
```

## Sample Input 6

```text
7 / 1 / 1999      27 / 10 / 1999      17 / 10 / 2020
```

## Sample Output 6

```text
true
```

## Sample Input 7

```text
7 / 1 / 2020      7 / 1 / 1999      17 / 1 / 2020
```

## Sample Output 7

```text
false
```

## Sample Input 8

```text
7 / 1 / 2020      17 / 1 / 2020      7 / 1 / 2050
```

## Sample Output 8

```text
true
```

## Sample Input 9

```text
7 / 1 / 2020      27 / 1 / 2050      17 / 10 / 1999
```

## Sample Output 9

```text
false
```

## Sample Input 10

```text
7 / 1 / 2050      7 / 12 / 2050      27 / 12 / 2050
```

## Sample Output 10

```text
true
```

## Sample Input 11

```text
7 / 1 / 2050      27 / 10 / 2050      17 / 10 / 2020
```

## Sample Output 11

```text
false
```

## Sample Input 12

```text
7 / 10 / 2020      7 / 12 / 2020      7 / 1 / 2050
```

## Sample Output 12

```text
true
```

## Sample Input 13

```text
7 / 10 / 2050      17 / 10 / 2020      7 / 1 / 2050
```

## Sample Output 13

```text
false
```

## Sample Input 14

```text
7 / 12 / 2020      17 / 10 / 2050      7 / 12 / 2050
```

## Sample Output 14

```text
true
```

## Sample Input 15

```text
17 / 1 / 1999      27 / 10 / 2050      7 / 1 / 1999
```

## Sample Output 15

```text
false
```

## Sample Input 16

```text
17 / 10 / 1999      7 / 1 / 2020      7 / 1 / 2050
```

## Sample Output 16

```text
true
```

## Sample Input 17

```text
17 / 10 / 2020      27 / 1 / 1999      17 / 10 / 1999
```

## Sample Output 17

```text
false
```

## Sample Input 18

```text
17 / 10 / 2050      27 / 10 / 2050      17 / 12 / 2050
```

## Sample Output 18

```text
true
```

## Sample Input 19

```text
17 / 12 / 2020      7 / 12 / 2020      27 / 10 / 1999
```

## Sample Output 19

```text
false
```

## Sample Input 20

```text
27 / 1 / 1999      7 / 1 / 2020      7 / 1 / 2050
```

## Sample Output 20

```text
true
```

## Sample Input 21

```text
27 / 1 / 2020      7 / 12 / 2050      7 / 1 / 1999
```

## Sample Output 21

```text
false
```

## Sample Input 22

```text
27 / 10 / 1999      7 / 1 / 2020      7 / 1 / 2050
```

## Sample Output 22

```text
true
```

## Sample Input 23

```text
27 / 10 / 1999      27 / 10 / 2020      17 / 12 / 1999
```

## Sample Output 23

```text
false
```

## Sample Input 24

```text
27 / 12 / 1999      7 / 1 / 2020      7 / 1 / 2050
```

## Sample Output 24

```text
true
```

## Sample Input 25

```text
27 / 12 / 1999      27 / 10 / 2020      7 / 1 / 2020
```

## Sample Output 25

```text
false
```

## Sample Input 26

```text
27 / 12 / 2020      7 / 1 / 2050      7 / 10 / 2050
```

## Sample Output 26

```text
true
```

## Sample Input 27

```text
27 / 12 / 2020      27 / 10 / 2050      7 / 12 / 2020
```

## Sample Output 27

```text
false
```
