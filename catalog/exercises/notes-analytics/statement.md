# Avaluació final

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

## Input

En la primera línia el nombre de practiques totals (T) i el nombre de pràctiques entregades (E)
En la segona línia les notes dels 3 exàmens parcials (P1, P2, P3).
En la tercera línia la nota de l'examen final (EF).
En la quarta línia el nombre total d'hores de la UF (TH) i les hores de faltes d'assistència (FA).

0 <= T <= 10

0 <= E <= T

0 <= P1, P2, P3 <= 10

0 <= EF <= 10

1 <= TH <= 100

0 <= FA <= TH

## Output

Aprova | Suspen
