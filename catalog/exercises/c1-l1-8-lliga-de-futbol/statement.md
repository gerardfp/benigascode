# [ff762] Lliga de futbol  #operadors

En la Lliga de futbol un equip rep 3 punts si guanya un partit, 1 punt si empata i 0 punts si perd.
L'equip A vol saber si està per davant a la classificació que l'equip B.

La classificació s'ordena segons els punts de cada equip, i en cas d'empat es mira la diferència entre els gols marcats i els gols rebuts.

## Input Format

Els primers 5 nombres son les dades de l'equip A.

Els següents 5 nombres les dades de l'equip B.

Las dades de cada equip són:

- El primer nombre  indica la quantitat de partits guanyats.

- El segon nombre  indica la quantitat de partitas empatats.

- El tercer nombre  indica la quantitat de partits perduts.

- El quart nombre  indica la quantitat de gols a favor.

- El cinquè nombre  indica la quantitat de gols en contra.

## Constraints

-

## Output Format

true - si l'equip A va per davant de l'equip B

false - si l'equip A va per darrere de l'equip B

## Sample Input 0

```text
3 0 0 6 0
0 1 2 0 8
```

## Sample Output 0

```text
true
```

## Explanation 0

L'equip A ha guanyat 3 partits, per tant té 9 punts
L'equip B ha empatat 1 partits, per tant té 1 punt.

## Sample Input 1

```text
3 0 0 5 0
3 0 0 6 0
```

## Sample Output 1

```text
false
```

## Explanation 1

Els dos equips tenen 9 punts, però la diferència de gols de l'equip A és menor

## Sample Input 2

```text
5 0 10 20 2
0 15 0 25 8
```

## Sample Output 2

```text
true
```

## Explanation 2

Els dos equips tenen 15 punts, però la diferència de gols de l'equip A és major.
