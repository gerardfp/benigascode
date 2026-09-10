# [e9ac5] Prova mecanogràfica  #conversio

En les proves de mecanografia es demana teclejar un text i es medeix la precisió i la velocitat:

- La PRECISIÓ es mideix en **Percentatge** entre el nombre de caracters del text i el nombre d'errors comesos.

- La VELOCITAT es medeix en **Paraules Per Minut** (es considera que **una paraula són 5 caracters -sense importar si són lletres, signes o espais-**).

Donades les dades d'una prova, determina la precisió i la velocitat.

Les dades d'una prova consisteixen en el nombre de caracters del text, el nombre d'errores comesos i el temps trigat **(en segons)**.

## Input Format

La entrada consta de tres nombres:

: nombre de caracters del text

: nombre d'errors comesos

: temps trigat (en segons)

## Constraints

-

## Output Format

S'ha d'imprimir la Precisió (percentatge d'encerts) i la Velocitat (paraules per minut), cadscun en una línia, i sense decimals.

## Sample Input 0

```text
100 10 60
```

## Sample Output 0

```text
90
20
```

## Explanation 0

Si en un text de **100** caracters s'han comés **10** errors i s'ha trigat **60** segons, el resultat de la prova és:

Precisió: **90**%

Velocitat: **20** PPM

## Sample Input 1

```text
10 3 60
```

## Sample Output 1

```text
70
2
```

## Explanation 1

Si en un text de **10** caracters s'han comés **3** errors i s'ha trigat **60** segons, el resultat de la prova és:

Precisió: **70**%

Velocitat: **2** PPM

## Sample Input 2

```text
60 0 10
```

## Sample Output 2

```text
100
72
```

## Explanation 2

Si en un text de **60** caracters s'han comeés **0** errors i s'ha trigat **10** segons, el resultat de la prova és:

Precisió: **100**%

Velocitat: **72** PPM

## Sample Input 3

```text
300 37 65
```

## Sample Output 3

```text
87
55
```

## Sample Input 4

```text
789 7 165
```

## Sample Output 4

```text
99
57
```

## Sample Input 5

```text
60 60 6
```

## Sample Output 5

```text
0
120
```

## Sample Input 6

```text
1 1 1
```

## Sample Output 6

```text
0
12
```
