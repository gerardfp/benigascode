# [a144f] Multi-armed bandit

En la teoria de la probabilitat, el problema dels bandits de múltiples braços és un problema en el qual s'ha d'assignar un conjunt fix limitat de recursos entre opcions competidores (alternatives) de manera que maximitzi el seu guany esperat, quan les propietats de cada elecció només es coneixen parcialment en el moment de l'assignació, i es poden entendre millor quan passa el temps o assignant recursos a l'elecció.
És un problema clàssic de **reinforcment learning** que exemplifica el dilema d'exploració-explotació. La seva aplicació va desde la tria entre una antiga i una nova posologia d'una vacuna o medicament, fins a l'elecció dels colors d'un botó a una pàgina web.

Diguem que triem un color per al botó "Comprar ara!". Les opcions són taronja, verd o blau.

![image](1559124318-8e5631e7b4-multiarmedbandits.png)

L'algoritme funciona així: inicialitzem les tres opcions a 1 click d'1 intent. Així, quan comencem, les dades de proves internes són aquestes:

```text
Taronja       Verd          Blau
1/1 = 100%    1/1 = 100%    1/1 = 100%
```

Llavors arriba un visitant al lloc web i hem de mostrar-li un botó. Escollim el primer amb la màxima expectativa de guanyar. L’algorisme creu que tots funcionen al 100% tot el temps, de manera que tria el primer: TARONJA. Però, per desgràcia, el visitant no fa clic al botó.

```text
Taronja      Verd          Blau
1/2 = 50%    1/1 = 100%    1/1 = 100%
```

Ve un altre visitant. Definitivament no li mostrarem el TARONJA, ja que pensem que només té un 50% de probabilitats de funcionar. De manera que triem el VERD. No fa clic. El mateix passa per a molts més visitants i acabem fent rondes per les opcions. En el procés, afinarem la nostra estimació del percentatge de clics per a cada opció cap avall.

```text
Taronja      Verd          Blau
1/4 = 25%    1/4 = 25%     1/4 = 25%
```

Però, de sobte, algú fa clic al botó TARONJA. Ràpidament, el navegador fa una trucada Ajax a la nostra funció de recompensa $.ajax(url:"/reward?testname=buy-button");i el nostre codi actualitza els resultats:

```text
Taronja      Verd          Blau
2/5 = 40%    1/4 = 25%     1/4 = 25%
```

Quan el nostre intrèpid desenvolupador web ho veu, s'esgarrapa el cap: "*El botó taronja és la pitjor opció. La seva font és petita. El botó verd és, òbviament, el millor. Tot està perdut! L’algoritme cobdiciós l’escollirà sempre per sempre!*"

Però espereu, vegem què passa si el TARONJA és realment l’elecció subóptima. Atès que l’algorisme ara creu que és el millor, sempre es mostrarà. És a dir, fins que deixi de funcionar bé. Llavors les altres opcions comencaran a semblar millor.

```text
Taronja      Verd          Blau
2/9 = 22%    1/4 = 25%     1/4 = 25%
```

Després de moltes més visites, s’ha trobat la millor opció, si n'hi ha, i es mostrarà tot el temps. El percentatge de clics per a cada opció podria ser aquest:

```text
Taronja            Verd                Blau
114/4071 = 2.8%    205/6385 = 3.2%     59/2264 = 2.6%
```

## Input Format

L'entrada consta en primer lloc del nombre d'opcions competidores alternatives.

Després ve la seqüència d'accions que indiquen l'èxit o fracàs de l'opció subòptima.
La seqüència comença amb un nombre enter que indica el nombre d'accions, i a continuació un seguit de booleans que indiquen l'èxit o fracàs de l'opció subòptima.

## Constraints

No hi ha

## Output Format

S'imprimirà el percentatge d'èxit de cada opció en format Array.

```text
[ 3.54, 2.98, 1.73 ]
```

## Sample Input 0

```text
3
6
true
true
false
true
false
false
```

## Sample Output 0

```text
[75.0, 66.66667, 50.0]
```

## Explanation 0

Tenim 3 botons. Els inicialitzem a 1 clic i mostrats 1 cop:

```text
1/1=100.0  1/1=100.0  1/1=100.0
```

A continuació venen les 6 accions que fan els visitants de la web.
Al primer visitant se li mostra el primer botó i fa clic (true). Actualitzem la probabilitat del primer botó: s'ha mostrat i s'ha fet clic:

```text
2/2=100.0   1/1=100.0   1/1=100.0
```

Al segon visitant se li mostra també el primer botó i fa clic (true). Actualitzem la seva probabilitat d'exit:

```text
3/3=100.0   1/1=100.0   1/1=100.0
```

Al tercer visitant se li mostra el primer botó, però aquest cop no fa clic (false). Actualitzem la seva probabilitat, sumem 1 als cops que s'ha mostrat, però no sumem 1 clic:

```text
3/4=75.0   1/1=100.0   1/1=100.0
```

Al quart visitant se li mostra ara el segon botó, i fa clic (true). Actualitzem el segon botó sumant 1 als cops mostrat i als clics:

```text
3/4=75.0   2/2=100.0   1/1=100.0
```

Al cinquè visitatnt se li mostra el segon botó, per no fa clic (false). Sumem 1 als cops mostrat, però no als clics:

```text
3/4=75.0   2/3=66.66667   1/1=100.0
```

Al sisé visitant se li mostra ara el tercer botó, i no fa clic (false). Actualitzem el tercer botó:

```text
3/4=75.0   2/3=66.66667   1/2=50.0
```

## Sample Input 1

```text
2
5
true
false
false
true
true
```

## Sample Output 1

```text
[80.0, 50.0]
```

## Explanation 1

Es mostra el primer i es fa clic (true)

```text
2/2=100.0   1/1=100.0
```

Es mostra el primer i no es fa clic (false)

```text
2/3=66.66667   1/1=100.0
```

Es mostra el segon i no es fa clic (false)

```text
2/3=66.66667   1/2=50.0
```

Es mostra el primer i es fa clic (true)

```text
3/4=75.0   1/2=50.0
```

Es mostra el primer i es fa clic (true)

```text
4/5=80.0   1/2=50.0
```

## Sample Input 2

```text
5
10
false
true
false
true
true
false
false
false
false
true
```

## Sample Output 2

```text
[50.0, 75.0, 60.000004, 50.0, 50.0]
```

## Explanation 2

```text
false
1/2=50.0   1/1=100.0   1/1=100.0   1/1=100.0   1/1=100.0
true
1/2=50.0   2/2=100.0   1/1=100.0   1/1=100.0   1/1=100.0
false
1/2=50.0   2/3=66.66667   1/1=100.0   1/1=100.0   1/1=100.0
true
1/2=50.0   2/3=66.66667   2/2=100.0   1/1=100.0   1/1=100.0
true
1/2=50.0   2/3=66.66667   3/3=100.0   1/1=100.0   1/1=100.0
false
1/2=50.0   2/3=66.66667   3/4=75.0   1/1=100.0   1/1=100.0
false
1/2=50.0   2/3=66.66667   3/4=75.0   1/2=50.0   1/1=100.0
false
1/2=50.0   2/3=66.66667   3/4=75.0   1/2=50.0   1/2=50.0
false
1/2=50.0   2/3=66.66667   3/5=60.000004   1/2=50.0   1/2=50.0
true
1/2=50.0   3/4=75.0   3/5=60.000004   1/2=50.0   1/2=50.0
```

## Sample Input 3

```text
5
100
false true true false false false true false true false false true true true false false false true false false false false true false true false true true false false false false true true true true true true true false false true true true true false false true true false false true false true false false false true true true true false true true false false true true true true true false true true true false false false false true false false false false false true true false true true true true true true true false false true true false
```

## Sample Output 3

```text
[33.333336, 47.368423, 33.333336, 60.000004, 50.0]
```

## Sample Input 4

```text
3
1000
false false true false false false true false false false true false true false false false false false false false true false false false true false false false false false false false false false true false true false false false false false false false false false false false true false false false false false false false true false false false false false false false false false true false false false true true false false true false true false false true false false false false true true false false false false false false false true false true true true false false false false true true false false true false false false false true false false false false true false false false false false false false false true false false false false false false false true false false true false false false false false false false true false false false false false false true false false true true false false false false false false false false false false false false false false false false true false false false false false false false false false false false false true false false false false false true false false false true false false false false false false true true false false false false true false false true false false true false false true true false false true true false false false false false false false false false false false false false false false false false false false false false false false false true false false false false false false true false false false false false false true false false false false false false false false false false false false false false false false false false false false false true false false true false false false true false true false false false false true true false true false true false false false false true false true false false false false false false false false false false true false false false true false false false true false false true false false false false false false false false false false false true false false false false false false false false true false false false true false true true false false false false false false false false true false false false false false false false true false false true false false false false false false false false false false false false false false true false true true false true false false true false false false false false false false false false false false true false true false false true false false false false false false false false false false false false true false false false true false false false false false false false false false false false false true false true false false true false false false false true false false false false false false false false false false false false false false false false false false false false true true false false false false false false true true false false false false false false false false false false false true false false false true false false false false true false true false false false false false true false false false false false false false false false true true false true false false false true false false false false false false false true false false true false true false false true false false false false true false false false false false false true false false false false true false false true true false false false true false false false false false false false false false false true false false false false false false false true false false false false false true true false false true false false false false false false false true false false true true false false false false true false false false false false false false false false false true false false false false false true false false true false false true false true false false true false false true false true false false false true false false false true false false false false false false false true false false false true false true false false false false false false false false false false false false false false false false false false false false false true false false false false false false false false true true false false true false false false false false false false true false false false false true false false false false false false false false true false false false false false false false false false false false false false false false true false false true false false false false false false false false false true false false false true false false false false false true true false false true false true false false false false false true true false false true false false false false false true false false false true false false true false false false true false false false true false false false false false false true true false false true false false false false false false false false false false false false false false false false false false false true false false true false false false false false false false true false false true false false false false true false false false true false false false false false false true false false false false false false false false false false false false false false false false true false false true false false false false false false false false false true false false false false false false false false false false false false false false false false false true false false false false false true false false false true false false false false false false true false false false false true false false false true false false false false true false false false false false false false false false false true false true false true false true false false false false false true false false true false true false false false false false false false false true true true false false false true true true false false false true
```

## Sample Output 4

```text
[16.666668, 19.081633, 17.647058]
```
