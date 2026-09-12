# Bomberman

Al joc Bomberman, quan explota una bomba, totes les caselles que estan a la mateixa fila o la mateixa columna exploten.

![image](1548259875-acea15403b-tab.png)

Si la bomba explota a la casella 6, exploten totes les casellas a la mateixa fila o columna:

![image](1556796557-a1ff1d0cd4-bomberman.png)

## Input

La entrada consta en primer lloc del tamany del tauler:  files i  columnes.

A continuació ve el tauler: cada nombre indica l'identificador de la casella.

L'últim nombre  és l'identificador de la casella en la què explota la bomba.

## Output

S'haurà de mostrar el tauler resultant en explotar les caselles.

Les caselles que no han explotat es marcaran amb un # i les que han explotat amb una @

Seguint l'exemple proposat, el tauler resultant quedaria així:

```text
##@#
##@#
@@@@
##@#
```
