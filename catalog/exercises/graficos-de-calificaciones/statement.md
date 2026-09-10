# [C3-L1-11] Gràfics de qualificacions #for

Donades les notes que han tret els alumnes en una matèria, genera un gràfic que resumeixi les qualificacions obtingudes.

- Excel·lent: entre 9 i 10

- Notable: entre 7 i 9

- Bé: entre 6 i 7

- Suficient: entre 5 i 6

- Insuficient: menys de 5

La gràfica mostrarà un caracter coixinet '#' per cada estudiant que ha tret cada qualificació.

Exemple:

```text
E: #######
N: #########
B: #####
S: ###
I: #
```

## Input Format

Una seqüència de  nombres enters.

Cada nombre és la Nota obtinguda per un alumne en la matèria.

La seqüència acaba amb un -1.

## Constraints

-

## Output Format

La gràfica amb el resum de les notes, amb el format indicat.

## Sample Input 0

```text
4 5 6 7 8 9 10    -1
```

## Sample Output 0

```text
E:##
N:##
B:#
S:#
I:#
```

## Explanation 0

Dos alumnes han obtingut Excel·lente (per això hi ha dos  '#')

Dos alumnes han obtingut Notable

Un alumne ha obtingut Bé

Un alumne ha obtingut Suficient

Un alumne ha obtingut Insuficient

## Sample Input 1

```text
4 4 4 4 5 6 6 7 7 7 9   -1
```

## Sample Output 1

```text
E:#
N:###
B:##
S:#
I:####
```

## Sample Input 2

```text
4 5 3 6 7 5 6 8 5 6  9 8 5 8 7 9 5 8 4 3 7 8 6   -1
```

## Sample Output 2

```text
E:##
N:########
B:####
S:#####
I:####
```

## Sample Input 3

```text
5 6 7 3 5 8 9 5 6 7 6 5 8 7 9 2 9 3 7 9 9 5 4 6 9 3 8 9 10 10 8 10 6    -1
```

## Sample Output 3

```text
E:##########
N:########
B:#####
S:#####
I:#####
```

## Sample Input 4

```text
10 10 10 10 10 10 10 10 10 10    -1
```

## Sample Output 4

```text
E:##########
N:
B:
S:
I:
```
