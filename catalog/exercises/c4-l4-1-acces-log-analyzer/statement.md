# Access.log analyzer

El servidor web emmagaztema el registre (log) dels accessos a l'arxiu 'access.log'.
Cada accés s'emmagatzema en una línia de l'arxiu amb aquest format:

```text
%h %l %u %t "%r" %s %b "%f" "%a"
```

El significat d'aquests camps és el següent:

- %h és l'adreça IP del client que ha realitzat la petició al servidor

- %l és la identitat de la màquina del client

- %u és l'userid de la persona determinada per l'autenticació HTTP

- %t és el temps en que s'ha rebut la petició. El format és:

```text
[day/month/year:hour:minute:second zone]
day = 2*digit
month = 3*letter
year = 4*digit
hour = 2*digit
minute = 2*digit
second = 2*digit
zone = (`+' | `-') 4*digit
```

- %r és la lína de petició realitzada pel client. El format és:

```text
%M %U%q %H
```

- %M és el Mètode (GET, POST, ...)

- %U és el path del recurs sol·licitat

- %q és la query realitzada sobre el recurs

- %H és el protocol (HTTP/1.0, HTTP/1.1, ...)

- %s és l'status code que el servidor retorna al client

- %b és el tamany de l'objecte retornat al client

- %f és el lloc del qual el client reporta que ha estat referenciat

- %a és l'user-agent: la identificació del navegador web del client

Es desitja fer una anàlisi d'aquest registre per tal d'esbrinar:
- El host que més peticions realitza al servidor
- El recurs més solicitat
- El lloc que més ens referencia
- El navegador més usat pels clients
- L'hora del dia en que més peticions rep el servidor

## Input

L'entrada consta de diverses línies de registre amb el format indicat.
El registre acaba amb la línia "**END**"

No hi ha

## Output

S'imprimirà en distintes línies:
- El host que més peticions ha realitzat
- El recurs que més peticions ha rebut
- El referrer que més ens ha direccionat
- L'User Agent més utilitzat pels visitants
- L'hora del dia que més peticions s'han realitzat
