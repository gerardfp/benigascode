# Fireball

![image](1612775587-3cd3d16243-clash.png)

En un videojoc els enemics es disposen en una fila. El jugador els hi pot llançar boles de foc i provocar un dany a l'enemic en el qual impacta i també als que estiguin a l'abast de la bola de foc.

Cada enemic té un nivell de vida, i quan els alcança la bola de foc els hi resta una quantitat determinada de vida. Quan un enemic té nivell zero, ja no se li pot restar més vida.

## Input

- El primer nombre  indica la quantitat d'enemics.

- A continuació venen els nivells de vida de cadascun dels enemics.

- Després venen les dades de les boles de foc. Tres números per cada bola de foc:

El primer nombre  indica la posició (començant per `0`) de l'enemic al qual impacta la bola de foc

- El segon nombre  indica l'abast de la bola de foc

- El tercer nombre  indica el dany que causa la bola de foc.

- L'entrada finalitza amb tres `-1`

Per exemple, la següent bola de foc impacta a l'enemic en la posició `4` i té un abast `2`:

![image](1612776346-f5253780cc-clash2.png)

## Output

Per cada bola llançada, s'imprimirà en una nova línia el nivell de vida resultant dels enemics, separats per espais.
