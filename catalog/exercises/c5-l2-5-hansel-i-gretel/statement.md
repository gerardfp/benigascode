# [C5-L2-5] Hansel i Gretel

Hänsel i Gretel són dos germans d'una família de llenyataires molt pobra. La madrastra convenç el seu pare d'abandonar-los al bosc per no haver de repartir amb ells el menjar familiar però ells poden tornar a casa seguint un rastre de pedretes que havien deixat al camí. Els nens repeteixen l'operació i aquest cop el rastre està fet d'engrunes de pa, que es mengen els ocells i per tant els nens es perden...

Ajuda a Hansel i Gretel a fer el camí de tornada a casa!

## Input Format

La entrada consisteix en un mapa del bosc on es marca la casa, les engrunes de pa i el lloc on s'han perdut Hansel i Gretel.

La casa està marcada amb la lletra 'A', les engrunes amb un punt '.', i Hansel i Gretel amb una 'H'.

El mapa està envoltat d'un marc amb coixinets '#'.

## Constraints

El camí de punts només avança a en direcció Nord, Sud, Est o Oest. Per a cada punt només hi ha una direcció possible.

Es considera que Hansel i Gretel han arribat a la casa quan la lletra 'H', està tocant la lletra 'A'.

## Output Format

S'imprimirà el mapa del bosc a cada passa que hagin donat Hansel i Gretel recuperant les engrunes de pa.

## Sample Input 0

```text
7
#########
#       #
# A..   #
#   .   #
#   ..H #
#       #
#########
```

## Sample Output 0

```text
#########
#       #
# A..   #
#   .   #
#   ..H #
#       #
#########
#########
#       #
# A..   #
#   .   #
#   .H  #
#       #
#########
#########
#       #
# A..   #
#   .   #
#   H   #
#       #
#########
#########
#       #
# A..   #
#   H   #
#       #
#       #
#########
#########
#       #
# A.H   #
#       #
#       #
#       #
#########
#########
#       #
# AH    #
#       #
#       #
#       #
#########
```

## Sample Input 1

```text
5
######
#A.. #
#  . #
#H.. #
######
```

## Sample Output 1

```text
######
#A.. #
#  . #
#H.. #
######
######
#A.. #
#  . #
# H. #
######
######
#A.. #
#  . #
#  H #
######
######
#A.. #
#  H #
#    #
######
######
#A.H #
#    #
#    #
######
######
#AH  #
#    #
#    #
######
```

## Sample Input 2

```text
7
#########
# A     #
# ...   #
#   .   #
#   ... #
#     H #
#########
```

## Sample Output 2

```text
#########
# A     #
# ...   #
#   .   #
#   ... #
#     H #
#########
#########
# A     #
# ...   #
#   .   #
#   ..H #
#       #
#########
#########
# A     #
# ...   #
#   .   #
#   .H  #
#       #
#########
#########
# A     #
# ...   #
#   .   #
#   H   #
#       #
#########
#########
# A     #
# ...   #
#   H   #
#       #
#       #
#########
#########
# A     #
# ..H   #
#       #
#       #
#       #
#########
#########
# A     #
# .H    #
#       #
#       #
#       #
#########
#########
# A     #
# H     #
#       #
#       #
#       #
#########
```

## Sample Input 3

```text
8
##########
#  ....H #
#  .     #
#  ......#
#A      .#
#.      .#
#........#
##########
```

## Sample Output 3

```text
##########
#  ....H #
#  .     #
#  ......#
#A      .#
#.      .#
#........#
##########
##########
#  ...H  #
#  .     #
#  ......#
#A      .#
#.      .#
#........#
##########
##########
#  ..H   #
#  .     #
#  ......#
#A      .#
#.      .#
#........#
##########
##########
#  .H    #
#  .     #
#  ......#
#A      .#
#.      .#
#........#
##########
##########
#  H     #
#  .     #
#  ......#
#A      .#
#.      .#
#........#
##########
##########
#        #
#  H     #
#  ......#
#A      .#
#.      .#
#........#
##########
##########
#        #
#        #
#  H.....#
#A      .#
#.      .#
#........#
##########
##########
#        #
#        #
#   H....#
#A      .#
#.      .#
#........#
##########
##########
#        #
#        #
#    H...#
#A      .#
#.      .#
#........#
##########
##########
#        #
#        #
#     H..#
#A      .#
#.      .#
#........#
##########
##########
#        #
#        #
#      H.#
#A      .#
#.      .#
#........#
##########
##########
#        #
#        #
#       H#
#A      .#
#.      .#
#........#
##########
##########
#        #
#        #
#        #
#A      H#
#.      .#
#........#
##########
##########
#        #
#        #
#        #
#A       #
#.      H#
#........#
##########
##########
#        #
#        #
#        #
#A       #
#.       #
#.......H#
##########
##########
#        #
#        #
#        #
#A       #
#.       #
#......H #
##########
##########
#        #
#        #
#        #
#A       #
#.       #
#.....H  #
##########
##########
#        #
#        #
#        #
#A       #
#.       #
#....H   #
##########
##########
#        #
#        #
#        #
#A       #
#.       #
#...H    #
##########
##########
#        #
#        #
#        #
#A       #
#.       #
#..H     #
##########
##########
#        #
#        #
#        #
#A       #
#.       #
#.H      #
##########
##########
#        #
#        #
#        #
#A       #
#.       #
#H       #
##########
##########
#        #
#        #
#        #
#A       #
#H       #
#        #
##########
```
