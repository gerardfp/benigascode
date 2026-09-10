# [C3-L1-9] Corregint els deures #for

A un alumne li han manat de deures fer un munt de divisions. Quan les ha acabades li demana a son pare si li pot ajudar a corregir-les. El pare, que té molt de treball i no té temps per a corregir divisions, decideix programar una intel·ligència artificial per a que les corregeixi en el seu lloc. Usant una tècnica de Reconeixement Òptic de Caracters, aconsegueix digitalitzar les divisions.

Per exemple, de la següent divisió

![image](1556747675-e04d312e24-1548237925-70aa87de1d-division.png)

es digitalitza el **Dividend**, el **Divisor**, el **Quocient** i el **Residu**, i s'obté:

```text
7 3 2 1
```

No obstant, el pare no és capac d'implementar un programa que, un cop digitalitzades les divisions, digui si són o no correctes. ¿Podries ajudar-lo?

El programa haurà de dir quines divisions són incorrectes, i donar el seu resultat correcte.

## Input Format

L'entrada consta de  divisions.

Per a cada divisió s'indiquen el , el , el  i el .

L'entrada acaba amb quatre zeros.

## Constraints

 >= 1

 >= 0

 >= 1

 >= 0

 >= 0

## Output Format

De les divisions incorrectes, el programa haurà de mostrar el número de divisió, i el resultat correcte (quocient i residu), separades per un salt de línia i amb el següent format:

```text
número) quocient residu
```

## Sample Input 0

```text
2 2 1 0
4 2 5 7
6 3 2 0
0 0 0 0
```

## Sample Output 0

```text
2) 2 0
```

## Explanation 0

La segunda división **2)** es incorrecta, el resultado correcto es cociente **2** y residuo **0**.

## Sample Input 1

```text
10 5 3 4
5 1 5 0
6 4 2 0
15 3 5 0
0 0 0 0
```

## Sample Output 1

```text
1) 2 0
3) 1 2
```

## Explanation 1

La primera división **1)** es incorrecta y el resultado correcto es cociente **2** y residuo **0**.

La tercera división **3)** es incorrecta y el resultado correcto es cociente **1** y residuo **2**.

## Sample Input 2

```text
33 10 3 3
12 11 1 1
0 0 0 0
```

## Explanation 2

Todas las divisiones son correctas

## Sample Input 3

```text
0 5 0 5
24 1 0 24
0 0 0 0
```

## Sample Output 3

```text
1) 0 0
2) 24 0
```

## Explanation 3

La primera división **1)** es incorrecta. El cociente es **0** y el residuo **0**.

La segunda división **2)** es incorrecta. El cociente es **24** y el residuo **0**.

## Sample Input 4

```text
2 4 3 5
0 4 0 0
0 4 8 0
0 4 0 8
3 4 0 0
1 4 5 0
0 0 0 0
```

## Sample Output 4

```text
1) 0 2
3) 0 0
4) 0 0
5) 0 3
6) 0 1
```
