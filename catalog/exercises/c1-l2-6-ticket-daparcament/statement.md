# [b73e8] Ticket d'aparcament  #operadors

![image](1556180294-d84162eb53-Untitleddrawing1.png)

Un ticket d'aparcament et permet aparcar durant un temps en funció dels diners que hi posis i de la tarifa.

Quan s'imprimeix el ticket, s'indica l'hora d'inici de l'aparcament, i l'hora de finalització (calculada a partir dels diners i de la tarifa).

## Input Format

- un nombre enter indica l'hora d'inici (hores, minuts i segons),

- un nombre float indica la quantitat de diners introduits,

- un nombre float indica la tarifa.

Els diners s'indiquen en Euros.

La tarifa s'indica en Minuts/Euros.

## Constraints

Es garanteix que l'hora de finalització mai serà superior a 23:59:59

## Output Format

S'imprimirà l'hora de finalització en format H:M:S

## Sample Input 0

```text
0 0 0
60
1
```

## Sample Output 0

```text
1:0:0
```

## Explanation 0

L'hora d'inici és 0:0:0

La tarifa són 60 minuts per euro

S'ha introduit 1 euro

Per tant s'obté una hora d'aparcament

## Sample Input 1

```text
10 0 0
30
1
```

## Sample Output 1

```text
10:30:0
```

## Explanation 1

L'hora d'inici és 10:0:0
La tarifa són 30 minuts per euro
S'ha introduit 1 euro

Per tant es tenen 30 minuts d'aparcament

## Sample Input 2

```text
10 15 0
1
0.5
```

## Sample Output 2

```text
10:15:30
```

## Explanation 2

La tarifa és 1 minut per euro
S'ha introduit 0.5 euros

El temps d'aparcament són 30 segons

## Sample Input 3

```text
16 0 0
0.5
0.5
```

## Sample Output 3

```text
16:0:15
```

## Explanation 3

La tarifa és 0.5 minuts per euro (30 segons per euro)
S'han introduït 0.5 euros
El temps són 15 segons

## Sample Input 4

```text
16 45 0
30
1
```

## Sample Output 4

```text
17:15:0
```

## Sample Input 5

```text
16 30 45
0.5
1
```

## Sample Output 5

```text
16:31:15
```

## Sample Input 6

```text
16 30 45
1.5
40
```

## Sample Output 6

```text
17:30:45
```

## Sample Input 7

```text
8 30 45
30
20.75
```

## Sample Output 7

```text
18:53:15
```

## Sample Input 8

```text
6 17 59
20.5
13.15
```

## Sample Output 8

```text
10:47:33
```
