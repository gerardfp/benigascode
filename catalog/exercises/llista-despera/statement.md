# [f67de] Llista d'espera

A l'hora de fer la matrícula en un institut, els aspirants s'ordenen en una llista en base a diferents criteris, com la nota de batxillerat, etc.

Cada alumne escull un centre, i aleshores es van assignant les places disponibles en cada centre seguint l'ordre d'aquesta llista.

Es vol fer una aplicació que digui per a cada aspirant, quants hi ha per davant seu a la llista que hagin escollit el mateix centre.

## Input Format

El primer nombre  indica la quantitat d'aspirants de la llista.

A continuació ve la llista amb el nom (una paraula) del centre escollit per cada aspirant. Els noms van separats per espais en blanc

## Constraints

-

## Output Format

S'imprimirà per a cada aspirant, quants hi ha per davant seu que han elegit el mateix centre, separant els números amb espais en blanc.

## Sample Input 0

```text
5
A B A B A
```

## Sample Output 0

```text
0 0 1 1 2
```

## Sample Input 1

```text
7
A A B C A A D
```

## Sample Output 1

```text
0 1 0 0 2 3 0
```

## Sample Input 2

```text
10
InstitutA InstitutB InstitutC InstitutD InstitutA InstitutA InstitutA InstitutA InstitutB InstitutB
```

## Sample Output 2

```text
0 0 0 0 1 2 3 4 1 2
```

## Sample Input 3

```text
5
A B C D E
```

## Sample Output 3

```text
0 0 0 0 0
```

## Sample Input 4

```text
10
A A A A A A A A A B
```

## Sample Output 4

```text
0 1 2 3 4 5 6 7 8 0
```
