# [C2-L1-8] Preu de l'entrada #if

![image](1569595180-4a4864113f-ws9pryrtwvt7uqgpzdbo.png)
Un web de venta de tickets per a espectacles calcula el preu d'una entrada a partir d'una sèrie de dades:

- **L'edat de la persona**: si la persona és menor de 6 anys, l'entrada és gratuita. Si és menor de 18 anys, se li aplica un descompte del 10%. I si la persona té 65 anys o més se li aplica un descompte del 15%.

- **El dia de la setmana**: si l'entrada és per al dimecres (dia de l'espectador) se li aplica un 25% de descompte. En canvi si és per a dissabte o diumenge, el preu s'apuja un 5%.

- **Cupó de descompte**: si el comprador té un cupó de descompte, se li aplica un 30% de descompte.

El descompte per edat i cupó són mútuament exclusius. És a dir, si s'aplica el tíquet descompte no es pot aplicar el descompte per edat.

## Input Format

L'entrada consta de 4 dades.

- La primera dada P és un nombre flotant que indica el preu base del ticket.

- La segona dada E és un enter que indica l'edat del comprador.

- La tercera dada D és un enter que indica el dia de la setmana (1=dilluns, 2=dimarts, 3=dimecres, ...)

- L'ultima dada C és un booleà que indica si el comprador té cupó.

## Constraints

1 <= P <= 1000000

0 <= E <= 1000

1 <= D <= 7

C = true | false

## Output Format

S'imprimirà el preu final de l'entrada amb 2 xifres decimals.

## Sample Input 0

```text
10 25 1 false
```

## Sample Output 0

```text
10.00
```

## Explanation 0

Preu base=10

Edad=25. No se li aplica descompte

Dia=Dilluns. No se li aplica descompte

Cupó=false. No se li aplica descompte

## Sample Input 1

```text
10 3 1 false
```

## Sample Output 1

```text
0.00
```

## Explanation 1

Al ser menor de 6 anys, el tícket és gratuït

## Sample Input 2

```text
10 70 4 false
```

## Sample Output 2

```text
8.50
```

## Explanation 2

Al ser major de 65 anys, se li aplica un 15% de descompte.

## Sample Input 3

```text
10 25 3 true
```

## Sample Output 3

```text
4.50
```

## Explanation 3

Se li aplica un 25% per ser Dimecres, i un 30% pel cupó de descompte.

## Sample Input 4

```text
10 13 4 true
```

## Sample Output 4

```text
7.00
```

## Explanation 4

Se li aplica el 30% pel cupó de descompte, però no el 10% (menor 18 anys).

## Sample Input 5

```text
10 13 2 false
```

## Sample Output 5

```text
9.00
```

## Explanation 5

Se li aplica el 10% per ser menor de 18 anys.

## Sample Input 6

```text
10 25 6 false
```

## Sample Output 6

```text
10.50
```

## Explanation 6

S'incrementa el preu un 5% per ser dissabte.

## Sample Input 7

```text
10 25 7 false
```

## Sample Output 7

```text
10.50
```

## Explanation 7

S'incrementa el preu un 5% per ser diumenge.

## Sample Input 8

```text
10 12 6 false
```

## Sample Output 8

```text
9.50
```

## Explanation 8

Descompte del 10% per ser menor de 18, i increment del 5% per ser dissabte.

## Sample Input 9

```text
10 12 7 true
```

## Sample Output 9

```text
7.50
```

## Explanation 9

Descompte per del 30% per cupó. No se li aplica el de edad. Increment del 5% per diumenge.

## Sample Input 10

```text
10 65 3 false
```

## Sample Output 10

```text
6.00
```

## Explanation 10

Descompte del 15% per tenir 65 anys i del 25% per ser dimecres.

## Sample Input 11

```text
10 65 3 true
```

## Sample Output 11

```text
4.50
```
