# [C5-L2-4] Auto-Indent Lines

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

## Input Format

La entrada és un codi escrit amb indentació K&R, però els espais d'indentació mal col·locats.
Tots els blocs del codi estan entre claus {}
El codi acaba amb la marca END.

## Constraints

No hi ha cap restricció significativa.

## Output Format

S'escriurà el codi correctament indentat, estil K&R. El tamany d'indentació és 4 espais.

## Sample Input 0

```text
if(true){
   a=3;
      b=7;
}

END
```

## Sample Output 0

```text
if(true){
    a=3;
    b=7;
}
```

## Sample Input 1

```text
while(true){
   a=3;
  b=7;
}

END
```

## Sample Output 1

```text
while(true){
    a=3;
    b=7;
}
```

## Sample Input 2

```text
if(true){
        a=10;
      } else {
    b=7;
  }

END
```

## Sample Output 2

```text
if(true){
    a=10;
} else {
    b=7;
}
```

## Sample Input 3

```text
if(true){
   a=3;
      b=7;
 while(false){
 c=9;
    }
       }

END
```

## Sample Output 3

```text
if(true){
    a=3;
    b=7;
    while(false){
        c=9;
    }
}
```

## Sample Input 4

```text
if(true){
        a=10;
    } else {
  b=7;
for(int i=0; i

## Sample Output 4

```text
if(true){
    a=10;
} else {
    b=7;
    for(int i=0; i

## Sample Input 5

```text
if(true){
        a=10;
       } else {
       if(a==b){
          d=6;
   } else {
  b=7;
for(int i=0; i

## Sample Output 5

```text
if(true){
    a=10;
} else {
    if(a==b){
        d=6;
    } else {
        b=7;
        for(int i=0; i

## Sample Input 6

```text
while(!false){
    if(true){
        l--;
        sout();
        l++;
    } else if(false){
           sout();
           l++;
        } else if(true){
            l--;
            sout();
        } else {
            sout();
    }
}

END
```

## Sample Output 6

```text
while(!false){
    if(true){
        l--;
        sout();
        l++;
    } else if(false){
        sout();
        l++;
    } else if(true){
        l--;
        sout();
    } else {
        sout();
    }
}
```

## Sample Input 7

```text
if(true){
a();
    if(true){
        a();
    } else if(true){
        if(true){
        a();
    } else {
         if(true){
            a();
            }
            a();
               }
          } else {
              a();
    if(true){
        a();
    }
     a();
    }
    a();
    } else {
        if(true){
            if(true){
                a();
            }
            a();
} else {
    a();
    }
    a();
}

END
```

## Sample Output 7

```text
if(true){
    a();
    if(true){
        a();
    } else if(true){
        if(true){
            a();
        } else {
            if(true){
                a();
            }
            a();
        }
    } else {
        a();
        if(true){
            a();
        }
        a();
    }
    a();
} else {
    if(true){
        if(true){
            a();
        }
        a();
    } else {
        a();
    }
    a();
}
```
