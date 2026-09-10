# [e25bb] Cubetris #array

En el juego Cubetris, el jugador va colocando unas piezas sobre un tablero intentando cubrir por completo el tablero. Puede poner las piezas en la posición que quiera, y la única limitación es que estas no pueden superponerse.

Por ejemplo, el jugador podría superar el juego así:

![image](1584006423-02c3bc4e19-cubetris1.png)

Si embargo, si juego de esta otra forma, no podría superar el juego, ya que las piezas verde y naranja no habría forma de colocarlas sin superponerse a otras piezas:

![image](1584006454-fc4581ef74-cubetris2.png)

Deseamos programar la parte del juego que nos dice si una pieza se puede colocar en una posición, o por el contrario no se puede debido a que se superpondría a otras piezas.

## Input Format

Los dos primeros números indican el tamaño del tablero:  y , respectivamente.

A continuación viene la definición del estado del tablero. Cada número indica el color de la pieza que esta en esa posición. Un cero significa que la posición está vacía.

Por último viene un tablero que define la pieza que se quiere colocar.

## Constraints

-

## Output Format

Se imprimirá el tablero resultante tras tras colocar (o no) la pieza.

## Sample Input 0

```text
4 4

1 1 2 3
1 1 2 3
0 2 2 3
0 0 0 3

0 0 0 0
0 0 0 0
4 0 0 0
4 4 4 0
```

## Sample Output 0

```text
1 1 2 3
1 1 2 3
4 2 2 3
4 4 4 3
```

## Explanation 0

![image](1584006558-f20e97da32-cubetris3.png)

## Sample Input 1

```text
3 3

1 1 0
1 1 0
0 0 0

0 0 2
0 0 2
0 2 2
```

## Sample Output 1

```text
1 1 2
1 1 2
0 2 2
```

## Explanation 1

![image](1584006584-1f3a991d34-cubetris4.png)

## Sample Input 2

```text
3 3

1 1 0
1 1 0
0 0 0

0 2 0
0 2 0
2 2 0
```

## Sample Output 2

```text
1 1 0
1 1 0
0 0 0
```

## Explanation 2

![image](1584006626-f379b73710-cubetris5.png)

## Sample Input 3

```text
3 3

0 0 0
0 1 1
1 1 1

2 2 0
2 2 0
0 0 0
```

## Sample Output 3

```text
0 0 0
0 1 1
1 1 1
```
