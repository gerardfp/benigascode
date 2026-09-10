# [C5-L3-2] Diccionari

Quan programem jocs que utilitzen paraules (com l'Scrabble, Sopa de lletres, Penjat, ... ), ens pot ser molt útil tenir una llista amb totes les possibles paraules.

A Linux, tenim l'arxiu /usr/share/dict amb una completa llista de paraules, i podríem progamar un mètode per a cercar-hi una paraula.

També disposem del recurs de la metaprogramació, que consisteix en programes que escriuen altres programes. Fent ús d'aquesta eina, podem fer un programa que generi un programa en Java que contingui un array amb les paraules del diccionari.

## Input Format

Una llista de paraules, separades per salts de línia.

La llista de paraules acaba amb '**END**'

## Constraints

No hi ha restriccions significatives.

## Output Format

Es generarà una programa Java amb una classe anomenada "Dictionari", que inicialitzi un array d'strings amb les paraules, anomenat "words".

## Sample Input 0

```text
una
llista
de
paraules
__END__
```

## Sample Output 0

```text
class Dictionari {
    String[] words = {
        "una",
        "llista",
        "de",
        "paraules"
    };
}
```

## Sample Input 1

```text
festival
triangle
municipi
batalla
voleibol
__END__
```

## Sample Output 1

```text
class Dictionari {
    String[] words = {
        "festival",
        "triangle",
        "municipi",
        "batalla",
        "voleibol"
    };
}
```

## Sample Input 2

```text
metaprogramming
__END__
```

## Sample Output 2

```text
class Dictionari {
    String[] words = {
        "metaprogramming"
    };
}
```

## Sample Input 3

```text
metaprogramming
rocks
__END__
```

## Sample Output 3

```text
class Dictionari {
    String[] words = {
        "metaprogramming",
        "rocks"
    };
}
```
