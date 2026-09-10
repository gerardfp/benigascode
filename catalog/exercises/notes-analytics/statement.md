# [C2-L1-6] Avaluació final #if

Un Institut on s'estudia FP d'Informàtica necessita un programa per a agilitzar les avaluacions. El programa ha de calcular si un alumne aprova una Unitat Formativa a partir dels següents elements:

- Pràctiques entregades.

- Notes dels 3 exàmens parcials.

- Nota de l'examen final.

- Faltes de assistència.

Els requisits per a aprovar la UF són:
a)
Haver entregar al menys els 75% de pràctiques.
No faltar a més del 20% de les horas de la UF.
Aprovar tots els exàmens parcials.
b)
També es pot aprovar simplement aprovant l'examen final, sempre i quant no s'hagi faltat a més del 20% de les hores de la UF.

## Input Format

En la primera línia el nombre de practiques totals (T) i el nombre de pràctiques entregades (E)
En la segona línia les notes dels 3 exàmens parcials (P1, P2, P3).
En la tercera línia la nota de l'examen final (EF).
En la quarta línia el nombre total d'hores de la UF (TH) i les hores de faltes d'assistència (FA).

## Constraints

0 <= T <= 10

0 <= E <= T

0 <= P1, P2, P3 <= 10

0 <= EF <= 10

1 <= TH <= 100

0 <= FA <= TH

## Output Format

Aprova | Suspen

## Sample Input 0

```text
10 5
6 5 0
7
85 14
```

## Sample Output 0

```text
Aprova
```

## Sample Input 1

```text
10 10
10 10 10
10
85 70
```

## Sample Output 1

```text
Suspen
```

## Sample Input 2

```text
5 4
5 5 5
3
85 0
```

## Sample Output 2

```text
Aprova
```

## Sample Input 3

```text
5 3
5 5 5
4
85 5
```

## Sample Output 3

```text
Suspen
```

## Sample Input 4

```text
5 3
4 9 9
0
85 70
```

## Sample Output 4

```text
Suspen
```

## Sample Input 5

```text
5 5
5 5 4
4
85 0
```

## Sample Output 5

```text
Suspen
```

## Sample Input 6

```text
5 5
10 10 10
10
85 17
```

## Sample Output 6

```text
Suspen
```
