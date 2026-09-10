# Ice skating #arrays

![image](1612971145-b6c274e4d6-skating.png)

En un videojuego hay un mapa en forma de tablero con unas flechas en algunas casillas que apuntan en una dirección: Norte, Sur, Este y Oeste.

![image](1612970877-8634f734fc-skating2.png)

El personaje empieza en la casilla 0,0, y desliza en la dirección de la flecha hasta que encuentra otra flecha, y entonces desliza en la dirección de esa flecha. Y así sucesivamente hasta que en un momento dado sale del tablero.

## Input Format

Los dos primeros números  y  indican el ancho y alto del tablero.

A continuación viene la definición del tablero:

- Un caracter `.` indica que la casilla no tiene flecha

- En las casillas con flecha se indica su dirección: `N`, `S`, `E`, `W`

## Constraints

-

## Output Format

Indicar las coordenadas (x y) de la última casilla del tablero por la cual sale el personaje.

## Sample Input 0

```text
4 4
E . . S
. . . .
. . S W
. . E .
```

## Sample Output 0

```text
3 3
```

## Sample Input 1

```text
5 4
S . . N .
. E . . .
S N W . S
E . N . W
```

## Sample Output 1

```text
4 1
```

## Sample Input 2

```text
4 6
E . E S
. N . .
. S . .
. S . W
. . W E
. W . .
```

## Sample Output 2

```text
0 5
```
