# [de165] Porter de discoteca #if

Algunes discoteques tenen unes normes d'accés extranyes. Aquesta en concret té les següents:

- Si ets menor d'edad no pots entrar

- Els homes no poden portar arracades

- S'ha d'anar ben vestit

- Els que tenen la tarjeta VIP poden entrar, sense tenir en compte aquestes normes.

Es desitja implementar un sistema de control d'accés automàtic a la discoteca que autoritzi l'accès en base a aquestes regles. (*Un sistema basat en el reconeixement d'imatges i NFC proporciona les dades d'entrada*).

## Input Format

L'entrada consta de 5 dades:

- Un nombre enter indica l'edat

- El sexe s'indica amb {home|dona}

- Un booleà indica si porta arracades

- Un booleà indica si va ben vestit

- Un booleà indica si té tarjeta VIP

## Constraints

No hi ha

## Output Format

S'imprimirà "ENTRA" si el sistema autoritza l'accés i "NO ENTRA" en cas contrari.

## Sample Input 0

```text
17 home true true true
```

## Sample Output 0

```text
ENTRA
```

## Sample Input 1

```text
17 home true true false
```

## Sample Output 1

```text
NO ENTRA
```

## Sample Input 2

```text
17 home true false true
```

## Sample Output 2

```text
ENTRA
```

## Sample Input 3

```text
17 home true false false
```

## Sample Output 3

```text
NO ENTRA
```

## Sample Input 4

```text
17 home false true true
```

## Sample Output 4

```text
ENTRA
```

## Sample Input 5

```text
17 home false true false
```

## Sample Output 5

```text
NO ENTRA
```

## Sample Input 6

```text
17 home false false true
```

## Sample Output 6

```text
ENTRA
```

## Sample Input 7

```text
17 home false false false
```

## Sample Output 7

```text
NO ENTRA
```

## Sample Input 8

```text
17 dona true true true
```

## Sample Output 8

```text
ENTRA
```

## Sample Input 9

```text
17 dona true true false
```

## Sample Output 9

```text
NO ENTRA
```

## Sample Input 10

```text
17 dona true false true
```

## Sample Output 10

```text
ENTRA
```

## Sample Input 11

```text
17 dona true false false
```

## Sample Output 11

```text
NO ENTRA
```

## Sample Input 12

```text
17 dona false true true
```

## Sample Output 12

```text
ENTRA
```

## Sample Input 13

```text
17 dona false true false
```

## Sample Output 13

```text
NO ENTRA
```

## Sample Input 14

```text
17 dona false false true
```

## Sample Output 14

```text
ENTRA
```

## Sample Input 15

```text
17 dona false false false
```

## Sample Output 15

```text
NO ENTRA
```

## Sample Input 16

```text
18 home true true true
```

## Sample Output 16

```text
ENTRA
```

## Sample Input 17

```text
18 home true true false
```

## Sample Output 17

```text
NO ENTRA
```

## Sample Input 18

```text
18 home true false true
```

## Sample Output 18

```text
ENTRA
```

## Sample Input 19

```text
18 home true false false
```

## Sample Output 19

```text
NO ENTRA
```

## Sample Input 20

```text
18 home false true true
```

## Sample Output 20

```text
ENTRA
```

## Sample Input 21

```text
18 home false true false
```

## Sample Output 21

```text
ENTRA
```

## Sample Input 22

```text
18 home false false true
```

## Sample Output 22

```text
ENTRA
```

## Sample Input 23

```text
18 home false false false
```

## Sample Output 23

```text
NO ENTRA
```

## Sample Input 24

```text
18 dona true true true
```

## Sample Output 24

```text
ENTRA
```

## Sample Input 25

```text
18 dona true true false
```

## Sample Output 25

```text
ENTRA
```

## Sample Input 26

```text
18 dona true false true
```

## Sample Output 26

```text
ENTRA
```

## Sample Input 27

```text
18 dona true false false
```

## Sample Output 27

```text
NO ENTRA
```

## Sample Input 28

```text
18 dona false true true
```

## Sample Output 28

```text
ENTRA
```

## Sample Input 29

```text
18 dona false true false
```

## Sample Output 29

```text
ENTRA
```

## Sample Input 30

```text
18 dona false false true
```

## Sample Output 30

```text
ENTRA
```

## Sample Input 31

```text
18 dona false false false
```

## Sample Output 31

```text
NO ENTRA
```

## Sample Input 32

```text
19 home true true true
```

## Sample Output 32

```text
ENTRA
```

## Sample Input 33

```text
19 home true true false
```

## Sample Output 33

```text
NO ENTRA
```

## Sample Input 34

```text
19 home true false true
```

## Sample Output 34

```text
ENTRA
```

## Sample Input 35

```text
19 home true false false
```

## Sample Output 35

```text
NO ENTRA
```

## Sample Input 36

```text
19 home false true true
```

## Sample Output 36

```text
ENTRA
```

## Sample Input 37

```text
19 home false true false
```

## Sample Output 37

```text
ENTRA
```

## Sample Input 38

```text
19 home false false true
```

## Sample Output 38

```text
ENTRA
```

## Sample Input 39

```text
19 home false false false
```

## Sample Output 39

```text
NO ENTRA
```

## Sample Input 40

```text
19 dona true true true
```

## Sample Output 40

```text
ENTRA
```

## Sample Input 41

```text
19 dona true true false
```

## Sample Output 41

```text
ENTRA
```

## Sample Input 42

```text
19 dona true false true
```

## Sample Output 42

```text
ENTRA
```

## Sample Input 43

```text
19 dona true false false
```

## Sample Output 43

```text
NO ENTRA
```

## Sample Input 44

```text
19 dona false true true
```

## Sample Output 44

```text
ENTRA
```

## Sample Input 45

```text
19 dona false true false
```

## Sample Output 45

```text
ENTRA
```

## Sample Input 46

```text
19 dona false false true
```

## Sample Output 46

```text
ENTRA
```

## Sample Input 47

```text
19 dona false false false
```

## Sample Output 47

```text
NO ENTRA
```
