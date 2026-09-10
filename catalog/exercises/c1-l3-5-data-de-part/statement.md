# [f13d9] Data de caducitat #operadors

Estem desenvolupant una aplicació per a dispositius mòbils que ajudi al consumidor a escollir els productes que compra al supermercat. L'usuari escaneja amb la càmera l'etiqueta d'un producte i l'aplicació li dona informació d'aquest producte.

Una de les opcions de l'aplicació és advertir a l'usuari dels productes que han superat la data de caducitat.

## Input Format

La entrada consta de 6 nombres corresponents a la data de caducitat i la data actual en format dd/mm/yyyy.

## Constraints

-

## Output Format

S'imprimirà  si el producte està caducat, o  si no ho està.

## Sample Input 0

```text
1 1 2030
1 1 2020
```

## Sample Output 0

```text
false
```

## Explanation 0

La data de caducitat 1/1/2030 és major que la data actual 1/1/2020

## Sample Input 1

```text
1 2 2020
1 1 2020
```

## Sample Output 1

```text
false
```

## Sample Input 2

```text
2 1 2020
1 1 2020
```

## Sample Output 2

```text
false
```

## Sample Input 3

```text
1 1 2020
2 1 2020
```

## Sample Output 3

```text
true
```

## Sample Input 4

```text
1 1 2020
1 2 2020
```

## Sample Output 4

```text
true
```

## Sample Input 5

```text
1 1 2020
1 1 2030
```

## Sample Output 5

```text
true
```

## Sample Input 6

```text
2 2 2020
1 1 2030
```

## Sample Output 6

```text
true
```

## Sample Input 7

```text
1 1 2030
2 2 2020
```

## Sample Output 7

```text
false
```
