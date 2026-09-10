# Número de incrementos

Dada una secuencia de números, calcula las veces que ha habido un incremento respecto al número anterior.

## Input Format

Una secuencia de N números enteros, terminada con un 0.

## Constraints

1 <= N <= 100

## Output Format

Un número entero indicando la cantidad de incrementos.

## Sample Input 0

```text
6 8 3  0
```

## Sample Output 0

```text
1
```

## Explanation 0

Se ha producido **1** incremento: del 6 al 8

## Sample Input 1

```text
3 1 1 5 9    0
```

## Sample Output 1

```text
2
```

## Explanation 1

Se han producido **2** incrementos: del 1 al 5, y del 5 al 9

## Sample Input 2

```text
8 7 7 1 1    0
```

## Sample Output 2

```text
0
```

## Explanation 2

No se ha producido ningún incremento.

## Sample Input 3

```text
1   0
```

## Sample Output 3

```text
0
```

## Explanation 3

No se ha producido ningún incremento.

## Sample Input 4

```text
27 28 78 94 35 43 79 77 78 12 95 28 77 14 80 50 12 55    0
```

## Sample Output 4

```text
10
```

## Sample Input 5

```text
652 272 823 441 382 129 457 668 274 676 579 547 824 291 404 643 119 194 859 244 385 478 988 250 648 364 587 637 486 340 813 877 339 952 15 143 576 236 134 516 72 188 813 668 206 980 268 350 664 176 829 874 819 649 619 454 233 417 883 929 902 715 204 431 433 706 731 794 53 452 687 809 510 618 780 624 264 55 59 451 619 362 278 16 540 250 400 760 877 30 699 154 45 174 548 29 90 841 145 479 194 684 922 310 592 203 309 522 764 943 331 814 948 228 809 889 214 902 681 717 344 136 646 99 534 752 823 657 434 426 970 170 706 303 138 272 259 210 179 352 764 344 682 562 205 177 58 603 422 431 345 41    0
```

## Sample Output 5

```text
79
```
