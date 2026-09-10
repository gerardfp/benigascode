# [a116a] Aprovar el mòdul  #operadors

Per a aprovar el mòdul de programació, un alumne ha d'aprovar les 3 Unitats Formatives.

Per a aprovar la UF1, un alumne ha d'entregar com a mínim el 75% de les pràctiques i traure un com a mínim un 4 en l'examen. També pot aprovar aquesta UF si entrega el 50% de les pràctiques i trau mínim un 5. I també aprova si trau més d'un 7 a l'examen (independentment de les practiques que hagi entregat).

Per a aprovar la UF2, ha d'entregar com a mínim el 75% de les pràctiques i traure un com a mínim un 4 en l'examen. També pot aprovar si entrega totes les pràctiques o si entrega mínim el 50% de les pràctiques i trau com a mínim un 5 a l'examen.

Per a aprovar la UF3, un alumne ha d'entregar totes les pràctiques i traure un com a mínim un 5 en l'examen.

## Input Format

La entrada consisteix en 9 nombres:

     (UF1)

     (UF2)

     (UF3)

## Constraints

-

## Output Format

S'imprimirà `true` si l'alumne aprova el mòdul, o `false` si no l'aprova.

## Sample Input 0

```text
6 2 4
3 0 0
1 0 0
```

## Sample Output 0

```text
false
```

## Explanation 0

En la UF1 hi havia 6 pràctiques, se n'han entregat 2 i ha tret un 4 en l'examen.
No reuneix cap condició per aprovar la UF1, per tant no aprova el Mòdul.

## Sample Input 1

```text
6 5 4
3 1 5
1 0 0
```

## Sample Output 1

```text
false
```

## Explanation 1

En la UF1 hi havia 6 pràctiques, n'ha entregat 5 i ha tret un 4 a l'examen. Per tant, aprova la UF1.
En la UF2 hi havia 3 pràctiques, n'ha entregat 1 i ha tret un 5 a l'examen. No aprova la UF2, ja que no ha entregat el 50% de les pràctiques. Per tant no aprova el Mòdul.

## Sample Input 2

```text
6 0 8
3 2 5
1 0 10
```

## Sample Output 2

```text
false
```

## Explanation 2

En la UF1 no ha entregat cap pràctica però ha tret més d'un 7 a l'examen, per tant aprova la UF1.
En la UF2 ha entregat com a mínim el 50% de les pràctiques i ha tret com a mínim un 5 a l'examen, per tant aprova la UF2.
En la UF3 no ha entregat totes les pràctiques, així que tot i que té un 10 a l'examen, està suspés de la UF3. No aprova el mòdul.

## Sample Input 3

```text
6 3 4
3 3 5
1 1 10
```

## Sample Output 3

```text
false
```

## Explanation 3

En la UF1 ha entregat el 50% de les pràctiques però no ha tret com a mínim un 5 a l'examen, per tant no aprova la UF1.
Tot i que la UF2 i la UF3 estan aprovades, no aprova el mòdul.

## Sample Input 4

```text
6 3 5
3 3 10
1 1 10
```

## Sample Output 4

```text
true
```

## Explanation 4

En la UF1 ha entregat el 50% de les pràctiques i ha tret un 5 a l'examen, per tant l'aprova.
En les altres dos UF, ha entregat totes les pràctiques i ha aprovat l'examen, per tant les aprova.
Aprova el mòdul.

## Sample Input 5

```text
10 5 5
3 3 0
1 1 5
```

## Sample Output 5

```text
true
```
