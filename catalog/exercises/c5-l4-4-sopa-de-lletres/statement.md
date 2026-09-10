# [C5-L4-4] Sopa de lletres #strings

Pedro Ocón de Oro, va inventar la sopa de lletres. Les paraules poden estar en diagonal, horitzontal o vertical i en qualsevol sentit.

En la nostra versió només podran estar en vertical de dalt a baix, i en horitzontal d'esquerra a dreta (*un cop tenim aquests algoritmes, no seria massa complicat extendre-ho a totes les direccions*).

## Input Format

La entrada consisteix en primer lloc en un nombre que indica la quantitat de files que té la sopa de lletres.

Cada línia de la sopa de lletres consta d'una sèrie de caracters separats per espais en blanc.

A continuació ve una línia en blanc, i després una llista de paraules que hi ha que cercar, separadaes per espais en blanc.

## Constraints

No hi ha restriccions significatives.

## Output Format

S'imprimirà la sopa de lletres amb les paraules trobades escrites en majúscules.

(No totes les paraules a cercar estan a la llista, i una paraula pot estar més d'una vegada)

## Sample Input 0

```text
3
t e w
k j x
y q v

te
```

## Sample Output 0

```text
T E w
k j x
y q v
```

## Sample Input 1

```text
3
t e w
k j x
m a r

te mar
```

## Sample Output 1

```text
T E w
k j x
M A R
```

## Sample Input 2

```text
4
c e w x
a j x y
s w r v
a z h q

casa mapa
```

## Sample Output 2

```text
C e w x
A j x y
S w r v
A z h q
```

## Sample Input 3

```text
4
c e w x
a j x y
s w r v
m a p a

casa mapa
```

## Sample Output 3

```text
c e w x
a j x y
s w r v
M A P A
```

## Sample Input 4

```text
5
c e w x a
a j x y m
s w r v i
m a p a g
p i s t a

casa mapa amiga pista
```

## Sample Output 4

```text
c e w x A
a j x y M
s w r v I
M A P A G
P I S T A
```

## Sample Input 5

```text
6
a e w x a v c
p k h w x q t
s w i t c h k
j w l v i m i
s w e t i h y
p z s t f o r

if switch while for where
```

## Sample Output 5

```text
a e W x a v c
p k H w x q t
S W I T C H k
j w L v i m i
s w E t I h y
p z s t F O R
```

## Sample Input 6

```text
3
i f i f
f i f i
i f i f

if
```

## Sample Output 6

```text
I F I F
F I F I
I F I F
```

## Sample Input 7

```text
9
t r u e i f s x z w n e b r
c h a r n e w o y m u s y e
f l o a t i i f i n a l t t
c a h v e r t w u d o l e u
a u f o r o c h l o n g c r
s t r i n g h i v u q s l n
e j u d u h k l b b r e a k
j i m p o r t e e l s e s e
f a l s e b o o l e a n s a

true if new float final for long string break import else false boolean case void int switch double class return byte char
```

## Sample Output 7

```text
T R U E I F S x z w n e B R
C H A R N E W o y m u s Y E
F L O A T i I F I N A L T T
C a h V e r T w u D o l E U
A u F O R o C h L O N G C R
S T R I N G H i v U q s L N
E j u D u h k l b B R E A K
j I M P O R T e E L S E S e
F A L S E B O O L E A N S a
```
