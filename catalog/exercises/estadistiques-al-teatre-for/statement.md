# Estadístiques al teatre #for

El Gran Teatre necessita tenir estadístiques sobre les edats dels assistents.

A partir del registre d'entrada s'ha indicar quantes persones en cada franja d'edat han acudit els divendres, dissabtes o diumenges.

Les franjes d'edat són:

- Menors de 18 anys

- Entre 18 i 65 anys

- Majors de 65 anys

## Input Format

L'entrada comença amb un enter  que indica el número registres que hi ha.

Per a cada registre s'indica el dia de la setmana: `DIVENDRES`, `DISSABTE`, `DIUMENGE` i, a la següent línia, una seqüència d'enters que indiquen les edats dels assistents aquell dia (la seqüència acaba amb `-1`).

## Constraints

-

## Output Format

Es mostrarà el resultat amb el següent format:

```text
nom_dia
0-17 : a
18-65: b
+65  : c
```

nom_dia = `divendres` | `dissabte` | `diumenge`

a = total persones menors de 18

b = total persones entre 18-65

c = total persones majors de 65

## Sample Input 0

```text
5
divendres
10 15 80   -1
dissabte
30 35 33   -1
diumenge
80 85 83 82   -1
divendres
11 11 82   -1
diumenge
82 81   -1
```

## Sample Output 0

```text
divendres
0-17 : 4
18-65: 0
+65  : 2

dissabte
0-17 : 0
18-65: 3
+65  : 0

diumenge
0-17 : 0
18-65: 0
+65  : 6
```

## Sample Input 1

```text
1
divendres
17 18 65 66    -1
```

## Sample Output 1

```text
divendres
0-17 : 1
18-65: 2
+65  : 1

dissabte
0-17 : 0
18-65: 0
+65  : 0

diumenge
0-17 : 0
18-65: 0
+65  : 0
```

## Sample Input 2

```text
10
divendres
10 15 80 35 45 67 23   -1
dissabte
30 35 33 33 23 65 67 45  -1
diumenge
80 85 83 82   -1
divendres
11 11 27 34 36 67 69   -1
diumenge
82 81 1 9 2  -1
divendres
10 15 80 17 18 19  -1
dissabte
30 35 33 55 43 52 41   -1
diumenge
80 85 83 82 78 69 70  -1
divendres
11 11 4 13 17 16 14   -1
diumenge
82 81 66 67 66  -1
```

## Sample Output 2

```text
divendres
0-17 : 14
18-65: 8
+65  : 5

dissabte
0-17 : 0
18-65: 14
+65  : 1

diumenge
0-17 : 3
18-65: 0
+65  : 18
```
