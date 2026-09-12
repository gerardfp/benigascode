# Auto-Indent Lines

Indentar -tabular, sagnar- és obligatori en Python. No obstant, és important fer-ho en tots els llenguatges, ja que ajuda a la comprensibilitat del codi.

Hi ha diferents estils d'indentació per als llenguatges que defineixen els blocs amb claus. La més comú és la K&R

- K&R

```text
while (x == y) {
    something();
    somethingelse();
}
```

- Allman

```text
while (x == y)
{
    something();
    somethingelse();
}
```

- GNU

```text
while (x == y)
  {
    something ();
    somethingelse ();
  }
```

- Whitesmiths

```text
while (x == y)
    {
    something();
    somethingelse();
    }
```

- Horstmann

```text
while (x == y)
{   something();
    somethingelse();
}
```

- Pico

```text
while (x == y)
{   something();
    somethingelse(); }
```

- Ratliff

```text
while (x == y) {
    something();
    somethingelse();
    }
```

- Lisp

```text
while (x == y)
  { something();
    somethingelse(); }
```

- Haskell

```text
while (x == y)
  { something()
  ; somethingelse()
  ;
  }
```

Amb els IDE tenim l'opció d'Auto-Indentar el codi. ¿Com ho fan?

## Input

La entrada és un codi escrit amb indentació K&R, però els espais d'indentació mal col·locats.
Tots els blocs del codi estan entre claus {}
El codi acaba amb la marca END.

No hi ha cap restricció significativa.

## Output

S'escriurà el codi correctament indentat, estil K&R. El tamany d'indentació és 4 espais.
