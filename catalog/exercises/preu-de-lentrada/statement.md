# Preu de l'entrada

![image](1569595180-4a4864113f-ws9pryrtwvt7uqgpzdbo.png)
Un web de venta de tickets per a espectacles calcula el preu d'una entrada a partir d'una sèrie de dades:

- **L'edat de la persona**: si la persona és menor de 6 anys, l'entrada és gratuita. Si és menor de 18 anys, se li aplica un descompte del 10%. I si la persona té 65 anys o més se li aplica un descompte del 15%.

- **El dia de la setmana**: si l'entrada és per al dimecres (dia de l'espectador) se li aplica un 25% de descompte. En canvi si és per a dissabte o diumenge, el preu s'apuja un 5%.

- **Cupó de descompte**: si el comprador té un cupó de descompte, se li aplica un 30% de descompte.

El descompte per edat i cupó són mútuament exclusius. És a dir, si s'aplica el tíquet descompte no es pot aplicar el descompte per edat.

## Input

L'entrada consta de 4 dades.

- La primera dada P és un nombre flotant que indica el preu base del ticket.

- La segona dada E és un enter que indica l'edat del comprador.

- La tercera dada D és un enter que indica el dia de la setmana (1=dilluns, 2=dimarts, 3=dimecres, ...)

- L'ultima dada C és un booleà que indica si el comprador té cupó.

1 <= P <= 1000000

0 <= E <= 1000

1 <= D <= 7

C = true | false

## Output

S'imprimirà el preu final de l'entrada amb 2 xifres decimals.
