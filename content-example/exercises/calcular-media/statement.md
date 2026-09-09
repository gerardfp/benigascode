# Calcular la media de una serie de números

## Enunciado
Escribe un programa en Java que lea desde la entrada estándar una serie de números enteros positivos terminada con un número negativo (el cual indica el final de la serie y no debe ser tenido en cuenta para el cálculo).

El programa debe calcular y mostrar por la salida estándar la **media aritmética** de los números positivos introducidos, formateada con exactamente dos decimales (ejemplo: `5.50`).

Si la serie no contiene ningún número positivo (es decir, el primer número introducido es negativo), el programa debe imprimir:
`NO_DATA`

## Formato de entrada
Una secuencia de números enteros separados por espacios o saltos de línea. El último número será un entero negativo.

## Formato de salida
Un número decimal con dos cifras decimales o la cadena `NO_DATA`.

## Ejemplo 1
Entrada:
```text
4 8 6 -1
```
Salida:
```text
6.00
```

## Ejemplo 2
Entrada:
```text
10 15 20 -5
```
Salida:
```text
15.00
```

## Ejemplo 3
Entrada:
```text
-1
```
Salida:
```text
NO_DATA
```

