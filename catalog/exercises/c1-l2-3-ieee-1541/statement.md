# [C2-L4-1] IEEE 1541 #if

L'stàndard IEEE 1541 estableix l'ús de prefixes per múltiples binaris. Tradicionalment s'utilitzaven (i encara s'utilitza en molts àmbits) els prefixes Kilo, Mega, Giga, Tera, etc. com a prefixes binaris, la qual cosa provocava confusió amb els prefixes decimals. Per exemple, un Kilo era 10^3 en el sistema decimal, i 2^10 en el sistema binari.

L'IEEE 1541 tracta de posar fi a aquesta confusió establint uns nous prefixes per al sistema binari:

```text
- kibi (Ki), 2^10 = 1024;
- mebi (Mi), 2^20 = 1048576;
- gibi (Gi), 2^30 = 1073741824;
- tebi (Ti), 2^40 = 1099511627776;
- pebi (Pi), 2^50 = 1125899906842624;
- exbi (Ei), 2^60 = 1152921504606846976;
```

Programa un conversor d'unitats binàries.

## Input Format

La entrada consisteix en les unitats (U), el prefixe binari (sP) i la unitat de mesura (sU), que s'han de convertir.

A continuació hi ha un fletxa "->" indicant la operació de conversió.

A continuació ve el prefixe binari (dP) i la unitat de mesura (dU) a la qual s'han de convertir.

Els Prefixs i Unitats són aquests:

Prefixs = { _ | Ki | Mi | Gi | Ti | Pi | Ei }

Unitats = { bit | byte }

El prefix '_' indica l'absència de prefix.

## Constraints

0 <= U <= 1152921504606846976

Els prefixs i les unitats són valids.

Tant les unitats d'entrada com les de sortida són nombres sense decimals.

## Output Format

S'escriurà la igualtat de la conversió.
S'ha d'eliminanr el _ , i s'han d'unir el prefix i la unitat de mesura:

Exemples:

```text
2 Kibytes = 16384 bits
```

```text
2 bytes = 16 bits
```

## Sample Input 0

```text
8 _ bits -> _ bytes
```

## Sample Output 0

```text
8 bits = 1 bytes
```

## Sample Input 1

```text
1 _ bytes -> _ bits
```

## Sample Output 1

```text
1 bytes = 8 bits
```

## Sample Input 2

```text
1 Ki bytes -> _ bytes
```

## Sample Output 2

```text
1 Kibytes = 1024 bytes
```

## Sample Input 3

```text
1 Mi bytes -> _ bytes
```

## Sample Output 3

```text
1 Mibytes = 1048576 bytes
```

## Sample Input 4

```text
1 Ki bytes -> _ bits
```

## Sample Output 4

```text
1 Kibytes = 8192 bits
```

## Sample Input 5

```text
1 Ki bits -> _ bytes
```

## Sample Output 5

```text
1 Kibits = 128 bytes
```

## Sample Input 6

```text
1073741824 Mi bits -> Gi bytes
```

## Sample Output 6

```text
1073741824 Mibits = 131072 Gibytes
```

## Sample Input 7

```text
1125899906842624 Ki bytes -> Ei bits
```

## Sample Output 7

```text
1125899906842624 Kibytes = 8 Eibits
```

## Sample Input 8

```text
1099511627776 Mi bits -> Pi bytes
```

## Sample Output 8

```text
1099511627776 Mibits = 128 Pibytes
```

## Sample Input 9

```text
4 Pi bytes -> Mi bytes
```

## Sample Output 9

```text
4 Pibytes = 4294967296 Mibytes
```

## Sample Input 10

```text
10 Ti bytes -> Gi bits
```

## Sample Output 10

```text
10 Tibytes = 81920 Gibits
```

## Sample Input 11

```text
1024 Ti bytes -> Pi bits
```

## Sample Output 11

```text
1024 Tibytes = 8 Pibits
```

## Sample Input 12

```text
1048576 Ki bytes -> Gi bytes
```

## Sample Output 12

```text
1048576 Kibytes = 1 Gibytes
```

## Sample Input 13

```text
256 _ bytes -> Ki bits
```

## Sample Output 13

```text
256 bytes = 2 Kibits
```
