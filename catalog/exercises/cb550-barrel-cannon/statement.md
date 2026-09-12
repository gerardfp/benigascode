# Barrel Cannon

En el juego Donkey Kong hay unos "barriles cañón" que disparan al gorila cuando cae sobre uno de ellos. Hay veces en los que caes sobre un barril y éste te dispara y vas a caer a otro barril, que a su vez te dispara sobre otro barril, y así sucesivamente hasta que vuelves a caer sobre tierra.

En esta versión, los barriles estan situados uno al lado de otro y cada barril dispara al gorila hacia arriba a la izquierda o hacia arriba a la derecha (describiendo una parábola).

Cada barril lo dispara con una fuerza, que se representa con un número. Este número indica cuántas posiciones proyectará al gorila. Si el número es positivo hacia la derecha, y si es negativo hacia la izquierda. Se puede observar en la siguiente imagen:

![image](1584006805-c463145c6d-dk1.png)

El problema consiste en: dadas la fuerzas de unos barriles y el barril donde cae inicialmente el gorila, averiguar si el gorila terminará saliendo por la IZQUIERDA, por la DERECHA, o si se quedará en un BUCLE sin poder salir.

## Input

El primer número  indica la cantidad de barriles.

A continuación vienen los  números que indican la fuerza de cada barril.

El último número  indica la posición de Donkey Kong (el primer barril en el que cae).

## Output

{ IZQUIERDA | DERECHA | BUCLE }
