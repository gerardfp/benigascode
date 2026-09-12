# Joc de pistes

A les colònies de final de curs, una nit s'organitza un joc de pistes.

Es van deixant pistes que et porten a altres pistes fins arribar al premi final.

Farem un joc de pistes amb posicions d'un Array.

Per exemple:

```text
String[] pistes = {"Ves a 2", "Ves a 4", "Ves a 1", "PREMI", "Ves a 3"}
```

Començant per pistes[0] seguiríem aquestes pistes:

"Ves a 2" -> "Ves a 1" -> "Ves a 4" -> "Ves a 3" -> "PREMI"

## Input

A la primera línia hi ha el nombre de pistes, la posició de la pista inicial, i un caràcter que serveix per a marcar la posició de les pistes.

A continuació venen les pistes, una en cada línia.

Dintre de cada pista, la posició de la següent pista està just a continuació del caràcter marcador.

La pista final té la paraula PREMI.

## Output

Es mostraran les pistes en l'ordre que s'han anat seguint fins arribar al premi.
