# Tasca #arrays

![image](1612522198-d7c82ee0c9-assignment.png)

A la plataforma d'aprenentatge que estem desenvolupant, els alumnes han de poder realitzar trameses dels seus treballs. Aquestes trameses han de tenir una hora límit.
Als alumnes que realitzin la tramesa un cop superada aquesta hora límit, la plataforma els informarà del temps excedit.

Donades les hores de les trameses i l'hora límit, digues quan de temps s'ha excedit cada tramesa.

## Input Format

El primer número  indica la quantitat de trameses.

Per a cada tramesa s'indica: `hora minut segon`

Per últim s'indica l'hora límit: `hora minut segon`

## Constraints

Totes les hores són vàlides

## Output Format

S'imprimirà `ok` per a aquelles trameses que s'han fet dintre del temps límit.

Les trameses fora de temps s'escriurà: `S'ha excedit 0h 0m 0s` (canviant el `0` pel valor corresponent)

## Sample Input 0

```text
3
12 45 0
10 34 7
9 55 46

10 0 0
```

## Sample Output 0

```text
S'ha excedit 2h 45m 0s
S'ha excedit 0h 34m 7s
ok
```

## Sample Input 1

```text
6
11 0 0
10 1 0
10 0 1
9 0 0
9 59 0
9 59 59

10 0 0
```

## Sample Output 1

```text
S'ha excedit 1h 0m 0s
S'ha excedit 0h 1m 0s
S'ha excedit 0h 0m 1s
ok
ok
ok
```

## Sample Input 2

```text
5
14 55 23
23 59 59
0 0 0
0 0 1
18 0 1

12 0 0
```

## Sample Output 2

```text
S'ha excedit 2h 55m 23s
S'ha excedit 11h 59m 59s
ok
ok
S'ha excedit 6h 0m 1s
```

## Sample Input 3

```text
2
23 59 59
0 0 0

23 59 59
```

## Sample Output 3

```text
ok
ok
```

## Sample Input 4

```text
4
10 16 5
10 20 5
11 15 25
13 15 25

10 15 30
```

## Sample Output 4

```text
S'ha excedit 0h 0m 35s
S'ha excedit 0h 4m 35s
S'ha excedit 0h 59m 55s
S'ha excedit 2h 59m 55s
```
