# Estadísticas del partido

En un partido de fútbol el marcador normalmente se expresa de la siguiente manera (primero los goles del equipo local y luego los goles del equipo visitante):

**Ejemplo:**

**LOCAL - VISITANTE**

**3 - 0**

El equipo local ha marcado 3 goles mientras que el equipo visitante ha marcado 0 goles. Gana el equipo local  (LOCAL) porque ha marcado más goles que el equipo visitante (VISITANTE). Si el marcador es el mismo se considera que ha habido empate.

En nuestro problema leeremos la evolución del marcador y una vez leída imprimiremos una serie de estadísticas.

Este sería un ejemplo de entrada:

**0 0 1 0 1 1 1 2 2 2 2 3 -1 -1**

- Empieza el partido, empate 0 0

- Marca el equipo Local, 1 0

- Empata el equipo Visitante, 1 1

- Marca el equipo Visitante, 1 2

- Empata el equipo Local, 2 2

- Marca el equipo Visitante, 2 3

- Final del partido, -1 -1

- Gana el equipo Visitante

## Input Format

0 0 1 0 1 1 1 2 2 2 2 3 -1 -1

## Constraints

La entrada acabará cuando se lea un marcador  -1 -1

El formato de la entrada SIEMPRE será correcto.

## Output Format

EMPIEZA EL PARTIDO, EMPATE: 0 0

GOL LOCAL, GANA LOCAL: 1 0

GOL VISITANTE, EMPATE: 1 1

GOL VISITANTE, GANA VISITANTE: 1 2

GOL LOCAL, EMPATE: 2 2

GOL VISITANTE, GANA VISITANTE: 2 3

FINAL DEL PARTIDO, GANA VISITANTE: 2 3

## Sample Input 0

```text
0 0 1 0 -1 -1
```

## Sample Output 0

```text
EMPIEZA EL PARTIDO, EMPATE: 0 0
GOL LOCAL, GANA LOCAL: 1 0
FINAL DEL PARTIDO, GANA LOCAL: 1 0
```

## Sample Input 1

```text
0 0 0 1 -1 -1
```

## Sample Output 1

```text
EMPIEZA EL PARTIDO, EMPATE: 0 0
GOL VISITANTE, GANA VISITANTE: 0 1
FINAL DEL PARTIDO, GANA VISITANTE: 0 1
```

## Sample Input 2

```text
0 0 1 0 2 0 2 1 2 2 -1 -1
```

## Sample Output 2

```text
EMPIEZA EL PARTIDO, EMPATE: 0 0
GOL LOCAL, GANA LOCAL: 1 0
GOL LOCAL, GANA LOCAL: 2 0
GOL VISITANTE, GANA LOCAL: 2 1
GOL VISITANTE, EMPATE: 2 2
FINAL DEL PARTIDO, EMPATE: 2 2
```

## Sample Input 3

```text
0 0 0 1 0 2 1 2 -1 -1
```

## Sample Output 3

```text
EMPIEZA EL PARTIDO, EMPATE: 0 0
GOL VISITANTE, GANA VISITANTE: 0 1
GOL VISITANTE, GANA VISITANTE: 0 2
GOL LOCAL, GANA VISITANTE: 1 2
FINAL DEL PARTIDO, GANA VISITANTE: 1 2
```

## Sample Input 4

```text
0 0 1 0 2 0 2 1 2 2 2 3 3 3 3 4 4 4 5 4 -1 -1
```

## Sample Output 4

```text
EMPIEZA EL PARTIDO, EMPATE: 0 0
GOL LOCAL, GANA LOCAL: 1 0
GOL LOCAL, GANA LOCAL: 2 0
GOL VISITANTE, GANA LOCAL: 2 1
GOL VISITANTE, EMPATE: 2 2
GOL VISITANTE, GANA VISITANTE: 2 3
GOL LOCAL, EMPATE: 3 3
GOL VISITANTE, GANA VISITANTE: 3 4
GOL LOCAL, EMPATE: 4 4
GOL LOCAL, GANA LOCAL: 5 4
FINAL DEL PARTIDO, GANA LOCAL: 5 4
```

## Sample Input 5

```text
0 0 -1 -1
```

## Sample Output 5

```text
EMPIEZA EL PARTIDO, EMPATE: 0 0
FINAL DEL PARTIDO, EMPATE: 0 0
```
