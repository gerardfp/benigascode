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

## Input Format

5 15 35 85 185 385 0

## Constraints

La entrada SIEMPRE será correcta. No se producirán incrementos diferentes a los indicados.

La entrada acabará con un 0.

## Output Format

5) 1

10) 1

20) 1

50) 1

100) 1

200) 1

## Sample Input 0

```text
10 15 20 25 0
```

## Sample Output 0

```text
5) 3
10) 1
20) 0
50) 0
100) 0
200) 0
```

## Explanation 0

3 monedas de 5 céntimos
1 moneda de 10 céntimos

## Sample Input 1

```text
100 105 115 135 0
```

## Sample Output 1

```text
5) 1
10) 1
20) 1
50) 0
100) 1
200) 0
```

## Sample Input 2

```text
5 10 15 25 125 0
```

## Sample Output 2

```text
5) 3
10) 1
20) 0
50) 0
100) 1
200) 0
```
