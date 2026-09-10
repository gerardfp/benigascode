# Está la palabra? si o no?

Dada una lista de palabras, imprime si se encuentra o no la palabra indicada

Algoritmo:

- Lee de la entrada la cantidad de palabras

- Crea un array para almacenar esas palabras

- Rellena el array con las palabras de la entrada

- Lee la palabra a buscar

- Recorre el array de palabras, y por cada palabra del array:

Si la palabra que estás viendo del array es igual a la palabra a buscar

Guarda en una variable boolean que has encontrado la palabra. En este punto, puedes cortar el bucle con break, porque si ya has encontrado la palabra no tiene sentido seguir buscando.

- Imprime `YES` si la variable boolean te indica que has encontrado la palabra. `NO` en caso contrario

## Input Format

El primer número  indica la cantidad de palabras

A continuación vienen las  palabras.

## Constraints

-

## Output Format

`YES` | `NO`

## Sample Input 0

```text
5
main class void static main

main
```

## Sample Output 0

```text
YES
```

## Sample Input 1

```text
6
public static void main string args

void
```

## Sample Output 1

```text
YES
```

## Sample Input 2

```text
3
char int string

float
```

## Sample Output 2

```text
NO
```

## Sample Input 3

```text
13
continue for switch boolean do if break else case int char float while

break
```

## Sample Output 3

```text
YES
```
