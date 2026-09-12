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

## Input

0 0 1 0 1 1 1 2 2 2 2 3 -1 -1

La entrada acabará cuando se lea un marcador  -1 -1

El formato de la entrada SIEMPRE será correcto.

## Output

EMPIEZA EL PARTIDO, EMPATE: 0 0

GOL LOCAL, GANA LOCAL: 1 0

GOL VISITANTE, EMPATE: 1 1

GOL VISITANTE, GANA VISITANTE: 1 2

GOL LOCAL, EMPATE: 2 2

GOL VISITANTE, GANA VISITANTE: 2 3

FINAL DEL PARTIDO, GANA VISITANTE: 2 3
