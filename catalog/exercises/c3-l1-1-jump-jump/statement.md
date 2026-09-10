# [bf71d] Jump, jump! #for

En un joc de plataformes, el personatge ha d'anar fent salts per a poder avançar. En la situació següent, per exemple, haurà de fer 3 salts per a arribar al final:

![image](1556708844-15036d2a78-mariojump.png)

Podem entendre el mapa del joc com una succesió de nombres que indiquen l'altura del terreny. En el cas anterior es podria definir com:

```text
1 2 1 2 2 3 2 1
```

En cada salt, el personatge pot avançar només 1 casella.

## Input Format

La entrada consta d'una successió de N nombres que indiquen l'altura H del terreny . La successió acaba amb un -1 (que no s'ha tenir en compte).

## Constraints

-

## Output Format

S'imprimirà el nombre mínim de salts que necessita donar per a arribar al final.

## Sample Input 0

```text
1 2 1 2 1 2 3 1   -1
```

## Sample Output 0

```text
4
```

## Explanation 0

![image](1556709457-6cc7ee1123-mariojump1.png)

## Sample Input 1

```text
2 2 1 1 1 2 3 1   -1
```

## Sample Output 1

```text
2
```

## Explanation 1

![image](1556709511-828a9a0edb-mariojump2.png)

## Sample Input 2

```text
3 3 2 2 1   -1
```

## Sample Output 2

```text
0
```

## Explanation 2

![image](1556709588-dbfc64e6ec-mariojump3.png)

## Sample Input 3

```text
1 2 3 4   -1
```

## Sample Output 3

```text
3
```

## Explanation 3

![image](1556709670-a608b4b485-mariojump4.png)

## Sample Input 4

```text
1   -1
```

## Sample Output 4

```text
0
```

## Explanation 4

![image](1556709748-f6f5dce969-mariojump5.png)

## Sample Input 5

```text
1 2 3 4 1 2 3 4 5 6 7 8 1   -1
```

## Sample Output 5

```text
10
```

## Sample Input 6

```text
9 5 1 2 3 1 2  -1
```

## Sample Output 6

```text
3
```
