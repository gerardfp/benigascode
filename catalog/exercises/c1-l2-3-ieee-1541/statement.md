# IEEE 1541

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

## Input

La entrada consisteix en les unitats (U), el prefixe binari (sP) i la unitat de mesura (sU), que s'han de convertir.

A continuació hi ha un fletxa "->" indicant la operació de conversió.

A continuació ve el prefixe binari (dP) i la unitat de mesura (dU) a la qual s'han de convertir.

Els Prefixs i Unitats són aquests:

Prefixs = { _ | Ki | Mi | Gi | Ti | Pi | Ei }

Unitats = { bit | byte }

El prefix '_' indica l'absència de prefix.

0 <= U <= 1152921504606846976

Els prefixs i les unitats són valids.

Tant les unitats d'entrada com les de sortida són nombres sense decimals.

## Output

S'escriurà la igualtat de la conversió.
S'ha d'eliminanr el _ , i s'han d'unir el prefix i la unitat de mesura:

Exemples:

```text
2 Kibytes = 16384 bits
```

```text
2 bytes = 16 bits
```
