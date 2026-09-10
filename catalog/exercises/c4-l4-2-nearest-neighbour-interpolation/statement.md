# [e8b30] Nearest-neighbour interpolation

Nearest-neighbour interpolation és un algoritme d'escalat d'imatges.
Quan fem una imatge més gran, l'algoritme Nearest-neighbour genera els nous pixels a partir dels originals més propers:

![image](1559147189-0ee013341f-nninterpolation.png)

Aquest algoritme funciona bé per a imatges 'pixel-art', però no és el més adequat per a imatges fotogràfiques ja que crea "dents de serra".

## Input Format

La entrada consisteix en una imatge en ASCII-ART.
En primer lloc ve el tamany en línies  de la imatge, i a continuació la imatge.

Finalment venen el factor d'escalat horitzontal  i el vertical .

## Constraints

-

## Output Format

S'imprimirà la imatge escalada segons els factors horitzontal i vertical.

## Sample Input 0

```text
3
#..
.%.
..=
4 4
```

## Sample Output 0

```text
####........
####........
####........
####........
....%%%%....
....%%%%....
....%%%%....
....%%%%....
........====
........====
........====
........====
```

## Sample Input 1

```text
3
#..
.%.
..=
6 2
```

## Sample Output 1

```text
######............
######............
......%%%%%%......
......%%%%%%......
............======
............======
```

## Sample Input 2

```text
3
#..
.%.
..=
2 6
```

## Sample Output 2

```text
##....
##....
##....
##....
##....
##....
..%%..
..%%..
..%%..
..%%..
..%%..
..%%..
....==
....==
....==
....==
....==
....==
```

## Sample Input 3

```text
5
 ,od8888bn.      ,.od88bo,
d8P'   `*88bn. ,       `Y8b
88'      `*888b.        `D8
Y8b        ,`*Y8bn.    ,d8P
`*Y8bn,. ;     `*+88888P*'
1 3
```

## Sample Output 3

```text
,od8888bn.      ,.od88bo,
 ,od8888bn.      ,.od88bo,
 ,od8888bn.      ,.od88bo,
d8P'   `*88bn. ,       `Y8b
d8P'   `*88bn. ,       `Y8b
d8P'   `*88bn. ,       `Y8b
88'      `*888b.        `D8
88'      `*888b.        `D8
88'      `*888b.        `D8
Y8b        ,`*Y8bn.    ,d8P
Y8b        ,`*Y8bn.    ,d8P
Y8b        ,`*Y8bn.    ,d8P
`*Y8bn,. ;     `*+88888P*'
`*Y8bn,. ;     `*+88888P*'
`*Y8bn,. ;     `*+88888P*'
```

## Sample Input 4

```text
5
 ,od8888bn.      ,.od88bo,
d8P'   `*88bn. ,       `Y8b
88'      `*888b.        `D8
Y8b        ,`*Y8bn.    ,d8P
`*Y8bn,. ;     `*+88888P*'
3 2
```

## Sample Output 4

```text
,,,oooddd888888888888bbbnnn...                  ,,,...oooddd888888bbbooo,,,
   ,,,oooddd888888888888bbbnnn...                  ,,,...oooddd888888bbbooo,,,
ddd888PPP'''         ```***888888bbbnnn...   ,,,                     ```YYY888bbb
ddd888PPP'''         ```***888888bbbnnn...   ,,,                     ```YYY888bbb
888888'''                  ```***888888888bbb...                        ```DDD888
888888'''                  ```***888888888bbb...                        ```DDD888
YYY888bbb                        ,,,```***YYY888bbbnnn...            ,,,ddd888PPP
YYY888bbb                        ,,,```***YYY888bbbnnn...            ,,,ddd888PPP
```

```text

```

## Sample Input 5

```text
9
_________________
`$$$$$$$$$$$$$$$'
 $$'`$'`$'`$'`$$
 $$bd$bd$bd$bd$$
 $$$$*"` `"*$$$$
 $$$`       `$$$
 $$[         ]$$
 $$[         ]$$
j$$[         ]$$$L
2 1
```

## Sample Output 5

```text
__________________________________
``$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$''
  $$$$''``$$''``$$''``$$''``$$$$
  $$$$bbdd$$bbdd$$bbdd$$bbdd$$$$
  $$$$$$$$**""``  ``""**$$$$$$$$
  $$$$$$``              ``$$$$$$
  $$$$[[                  ]]$$$$
  $$$$[[                  ]]$$$$
jj$$$$[[                  ]]$$$$$$LL
```

## Sample Input 6

```text
9
_________________
`$$$$$$$$$$$$$$$'
 $$'`$'`$'`$'`$$
 $$bd$bd$bd$bd$$
 $$$$*"` `"*$$$$
 $$$`       `$$$
 $$[         ]$$
 $$[         ]$$
j$$[         ]$$$L
1 2
```

## Sample Output 6

```text
_________________
_________________
`$$$$$$$$$$$$$$$'
`$$$$$$$$$$$$$$$'
 $$'`$'`$'`$'`$$
 $$'`$'`$'`$'`$$
 $$bd$bd$bd$bd$$
 $$bd$bd$bd$bd$$
 $$$$*"` `"*$$$$
 $$$$*"` `"*$$$$
 $$$`       `$$$
 $$$`       `$$$
 $$[         ]$$
 $$[         ]$$
 $$[         ]$$
 $$[         ]$$
j$$[         ]$$$L
j$$[         ]$$$L
```
