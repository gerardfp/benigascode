# [C2-L2-4] Cotxes autònoms #if

Els cotxes autònoms ha de prendre decisions sobre la conducció a partir del les dades que perceben els seus sensors de l'entorn.

![image](1557227574-8acd780630-path3911-4.png)

El nostre cotxe elèctric ha de decidir si pot continuar la marxa en funció de les dades que li arriben del sensors. Aquestes dades són:

- Estat del semàfor: r = vermell, g = verd, o = àmbar

- Vianants creuant el carrer: true, false

- Agent de circulació: 0 = no hi ha agent, 1 = ens dona pas, 2 = ens fa stop

La decisió de continuar o no, en base a les combinacions de les dades del sensor es reflecteix en aquesta taula:

```text
semafor   r r r r r r g g g g g g o o o o o o
vianants  f f f t t t f f f t t t f f f t t t
agent     0 1 2 0 1 2 0 1 2 0 1 2 0 1 2 0 1 2
---------------------------------------------
creuar    f t f f f f t t f f f f t t f f f f
```

## Input Format

En primer lloc l'estat del semàfor S, després la presència de vianants V, finalment l'estat de l'agent de circulació A.

## Constraints

S = { r | g | b}

V = { true | false }

A = { 0 | 1 | 2 }

## Output Format

S'imprimirà "CONTINUAR" o "NO CONTINUAR"

## Sample Input 0

```text
r false 0
```

## Sample Output 0

```text
NO CONTINUAR
```

## Sample Input 1

```text
r false 1
```

## Sample Output 1

```text
CONTINUAR
```

## Sample Input 2

```text
r false 2
```

## Sample Output 2

```text
NO CONTINUAR
```

## Sample Input 3

```text
r true 0
```

## Sample Output 3

```text
NO CONTINUAR
```

## Sample Input 4

```text
r true 1
```

## Sample Output 4

```text
NO CONTINUAR
```

## Sample Input 5

```text
r true 2
```

## Sample Output 5

```text
NO CONTINUAR
```

## Sample Input 6

```text
g false 0
```

## Sample Output 6

```text
CONTINUAR
```

## Sample Input 7

```text
g false 1
```

## Sample Output 7

```text
CONTINUAR
```

## Sample Input 8

```text
g false 2
```

## Sample Output 8

```text
NO CONTINUAR
```

## Sample Input 9

```text
g true 0
```

## Sample Output 9

```text
NO CONTINUAR
```

## Sample Input 10

```text
g true 1
```

## Sample Output 10

```text
NO CONTINUAR
```

## Sample Input 11

```text
g true 2
```

## Sample Output 11

```text
NO CONTINUAR
```

## Sample Input 12

```text
o false 0
```

## Sample Output 12

```text
CONTINUAR
```

## Sample Input 13

```text
o false 1
```

## Sample Output 13

```text
CONTINUAR
```

## Sample Input 14

```text
o false 2
```

## Sample Output 14

```text
NO CONTINUAR
```

## Sample Input 15

```text
o true 0
```

## Sample Output 15

```text
NO CONTINUAR
```

## Sample Input 16

```text
o true 1
```

## Sample Output 16

```text
NO CONTINUAR
```

## Sample Input 17

```text
o true 2
```

## Sample Output 17

```text
NO CONTINUAR
```
