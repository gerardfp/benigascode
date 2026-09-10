# FizzBuzz en Rango

## Enunciado
El clásico juego de **FizzBuzz** es un ejercicio fundamental de lógica y aritmética modular. En esta variante, tu programa debe procesar un rango de enteros definido por un valor inicial y uno final.

Escribe un programa en Java que lea dos números enteros `inicio` y `fin` (`inicio <= fin`) separados por un espacio.

Para cada número `i` en el rango inclusivo `[inicio, fin]`:
- Si `i` es divisible por 3 y por 5 (es decir, divisible por 15), muestra `FizzBuzz`.
- Si `i` es divisible solo por 3, muestra `Fizz`.
- Si `i` es divisible solo por 5, muestra `Buzz`.
- En cualquier otro caso, muestra el número `i`.

Todos los valores de la serie deben imprimirse en **una sola línea**, separados por un espacio en blanco.

## Formato de entrada
Dos números enteros `inicio` y `fin` separados por un espacio o salto de línea.

## Formato de salida
Una única línea con los resultados de la serie separados por un espacio.

## Ejemplo 1
Entrada:
```text
1 5
```
Salida:
```text
1 2 Fizz 4 Buzz
```

## Ejemplo 2
Entrada:
```text
10 16
```
Salida:
```text
Buzz 11 Fizz 13 14 FizzBuzz 16
```
