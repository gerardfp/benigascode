# Término N de la Sucesión de Fibonacci

## Enunciado
La sucesión de **Fibonacci** es una secuencia de números donde cada término se obtiene sumando los dos anteriores:
- `F(0) = 0`
- `F(1) = 1`
- `F(N) = F(N-1) + F(N-2)` para `N >= 2`

Escribe un programa en Java que lea un número entero `N` desde la entrada estándar y calcule el valor de `F(N)`.

- Si `N < 0`, el programa debe imprimir:
  `ERROR`
- Si `N >= 0`, el programa debe imprimir el número `F(N)` correspondiente.

## Formato de entrada
Un número entero `N`.

## Formato de salida
El valor de `F(N)` o la palabra `ERROR` en una única línea.

## Ejemplo 1
Entrada:
```text
6
```
Salida:
```text
8
```

## Ejemplo 2
Entrada:
```text
0
```
Salida:
```text
0
```

## Ejemplo 3
Entrada:
```text
-3
```
Salida:
```text
ERROR
```
