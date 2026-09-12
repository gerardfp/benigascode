# Estadístiques al teatre

El Gran Teatre necessita tenir estadístiques sobre les edats dels assistents.

A partir del registre d'entrada s'ha indicar quantes persones en cada franja d'edat han acudit els divendres, dissabtes o diumenges.

Les franjes d'edat són:

- Menors de 18 anys

- Entre 18 i 65 anys

- Majors de 65 anys

## Input

L'entrada comença amb un enter  que indica el número registres que hi ha.

Per a cada registre s'indica el dia de la setmana: `DIVENDRES`, `DISSABTE`, `DIUMENGE` i, a la següent línia, una seqüència d'enters que indiquen les edats dels assistents aquell dia (la seqüència acaba amb `-1`).

## Output

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
