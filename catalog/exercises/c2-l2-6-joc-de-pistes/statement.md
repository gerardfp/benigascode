# [C5-L2-6] Joc de pistes

A les colònies de final de curs, una nit s'organitza un joc de pistes.

Es van deixant pistes que et porten a altres pistes fins arribar al premi final.

Farem un joc de pistes amb posicions d'un Array.

Per exemple:

```text
String[] pistes = {"Ves a 2", "Ves a 4", "Ves a 1", "PREMI", "Ves a 3"}
```

Començant per pistes[0] seguiríem aquestes pistes:

"Ves a 2" -> "Ves a 1" -> "Ves a 4" -> "Ves a 3" -> "PREMI"

## Input Format

A la primera línia hi ha el nombre de pistes, la posició de la pista inicial, i un caràcter que serveix per a marcar la posició de les pistes.

A continuació venen les pistes, una en cada línia.

Dintre de cada pista, la posició de la següent pista està just a continuació del caràcter marcador.

La pista final té la paraula PREMI.

## Constraints

-

## Output Format

Es mostraran les pistes en l'ordre que s'han anat seguint fins arribar al premi.

## Sample Input 0

```text
5 0 #
Ves a #2
Ves a #4
Ves a #1
PREMI
Ves a #3
```

## Sample Output 0

```text
Ves a #2
Ves a #1
Ves a #4
Ves a #3
PREMI
```

## Sample Input 1

```text
5 0 {
A {2} trobaras el cami
Segueix buscant per {4}
Potser al {1} hi ha alguna cosa
PREMI
Prova al {3} a veure
```

## Sample Output 1

```text
A {2} trobaras el cami
Potser al {1} hi ha alguna cosa
Segueix buscant per {4}
Prova al {3} a veure
PREMI
```

## Sample Input 2

```text
4 2 $
Tebi $3
PREMI
Fred $0
Calent $1
```

## Sample Output 2

```text
Fred $0
Tebi $3
Calent $1
PREMI
```

## Sample Input 3

```text
5 0 @
Aqui no @1
Aqui tampoc @2
No, no @3
Mmmmmm @4
PREMI
```

## Sample Output 3

```text
Aqui no @1
Aqui tampoc @2
No, no @3
Mmmmmm @4
PREMI
```
