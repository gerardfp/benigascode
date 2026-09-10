# En qué posiciones está la palabra?

Dada una lista de palabras, imprime en qué posiciones se encuentra la palabra indicada

Algoritmo:

- Lee de la entrada la cantidad de palabras

- Crea un array para almacenar esas palabras

- Rellena el array con las palabras de la entrada

- Lee la palabra a buscar

- Recorre el array de palabras, y por cada palabra del array:

Si la palabra que estás viendo del array es igual a la palabra a buscar

Imprime la posición de la palabra del array que estás viendo (súmale 1 a esa posición para que parezca una posición "normal", y no la posición real en el array)

## Input Format

El primer número  indica la cantidad de palabras

A continuación vienen las  palabras.

## Constraints

-

## Output Format

Se imprimirán las posiciones (empezando por 1) en las que se ha encontrado la palabra a buscar, cada una en una línea.

## Sample Input 0

```text
5
main class void static main

main
```

## Sample Output 0

```text
1
5
```

## Sample Input 1

```text
6
public static void main string args

void
```

## Sample Output 1

```text
3
```

## Sample Input 2

```text
3
char int string

float
```

## Sample Input 3

```text
13
continue for switch boolean do if break else case int char float while

break
```

## Sample Output 3

```text
7
```
