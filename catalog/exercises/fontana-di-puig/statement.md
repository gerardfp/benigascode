# Fontana di Puig

La Fontana di Puig es una gran fuente que recibe las monedas de estudiantes que quieren aprobar el examen de programación.

Esta fuente tiene un contador que indica la cantidad total de euros recibidos (en céntimos de euro).

La fuente rechaza las monedas de 1 y 2 céntimos. y sólo acepta monedas de:

5 céntimos

10 céntimos

20 céntimos

50 céntimos

100 céntimos (1 euro)

200 céntimos (2 euros)

El contador de la fuente indica la cantidad de céntimos que se han acumulado y un pequeño programa guarda un registro de los cambios en este contador. El registro siempre empieza con la fuente vacía, sin monedas.

Nuestro programa leerá este registro y calculará cuantas monedas se han lanzado de cada tipo ese día.

5 15 35 85 185 385 0

- 5 - Se ha lanzado una moneda de 5 céntimos

- 15 - Se ha lanzado una moneda de 10 céntimos

- 35 - Se ha lanzado una moneda de 20 céntimos

- 85 - Se ha lanzado una moneda de 50 céntimos

- 185 - Se ha lanzado una moneda de 100 céntimos

- 385 - Se ha lanzado una moneda de 200 céntimos

## Input

5 15 35 85 185 385 0

La entrada SIEMPRE será correcta. No se producirán incrementos diferentes a los indicados.

La entrada acabará con un 0.

## Output

5) 1

10) 1

20) 1

50) 1

100) 1

200) 1
