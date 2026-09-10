# [C2-L3-2] Permisos UNIX #if

Els permisos de lecture, escritura i execució sobre fitxers en sistemes UNIX-like són gestionats en tres classes: usuari, grup i altres.

Els fitxers són propietat d'un usuari i d'un grup, i s'especifiquen permisos per a les tres classes: propietari del fitxer, els usuaris del grup propietari del fitxer i la resta d'usuaris.

![image](1557229688-38d8ac6b2b-permissions3.png)

Quan un usuari tracta d'accedir a un fitxer, els permisos efectius que té sobre el fitxer es determinen en base a la primera classe en la qual encaixi.

Donats els permisos, i l'usuari i grup propietaris d'un fitxer, calcula els permisos efectius que tindrà un usuari determinat sobre un fitxer.

## Input Format

A la primera línia venen els 9 permisos P, separats per espais en blanc, i l'usuari i grup propietaris.

A la segona línia ve l'usuari que tracta d'accedir al fitxer, i els 3 grups als que pertany.

## Constraints

P = { - | r | w | x }

L'usuari pertany sempre a 3 grups.

## Output Format

S'imprimiran els permisos efectius

## Sample Input 0

```text
r w x r - x r - - root root
alumne1 alumnes informatica dam
```

## Sample Output 0

```text
r--
```

## Sample Input 1

```text
r w - r w - - - - root alumnes
alumne1 alumnes informatica asix
```

## Sample Output 1

```text
rw-
```

## Sample Input 2

```text
r w x r - x r - - root root
alumne1 alumnes informatica dam
```

## Sample Output 2

```text
r--
```

## Sample Input 3

```text
r w - r - - - - - alumne2 dam
alumne1 alumnes informatica asix
```

## Sample Output 3

```text
---
```

## Sample Input 4

```text
r w x r w - r - - alumne3 asix
alumne2 alumnes informatica asix
```

## Sample Output 4

```text
rw-
```

## Sample Input 5

```text
r w x r w - r - - alumne3 root
alumne3 root informatica asix
```

## Sample Output 5

```text
rwx
```

## Sample Input 6

```text
r w x r w - r - - alumne3 root
alumne3 root informatica asix
```

## Sample Output 6

```text
rwx
```

## Sample Input 7

```text
r w x r w x r - - root root
alumne3 root informatica asix
```

## Sample Output 7

```text
rwx
```
