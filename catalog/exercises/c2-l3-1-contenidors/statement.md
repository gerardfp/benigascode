# Contenidors

Els contenidors són entorns d'execució aïllats que només tenen accés als recursos (cpu, memòria, sistema d'arxius, xarxa, etc.) que li són assignats.

Existeixen moltes solucions de software que permeten el maneig de contenidors (crear, iniciar, parar, eliminar...).

Una forma habitual de gestionar els contenidors és a través de comandaments. Per exemple, el comandament START inicia un contenidor, i STOP l'atura. És clar, que un contenidor ha d'estar un estat adequat per a poder enviar-li un comandament. Per exemple, no es pot aturar un contenidor que no estigui en execució.

El següent diagrama ilustra els estats en els que pot estar un contenidor, i els comandaments que es poden executar sobre ell, canviant el seu estat.

![image](1557270926-18375a3fbe-statemachine1.png)

Es requereix crear un programa per a gestionar els estats d'un contenidor a través de comandaments.

## Input

La entrada consisteix en un estat i un comandament.

Un contenidor que encara no existeix s'indica amb l'estat '_'

estat = { _ | CREATED | RUNNING | PAUSED | STOPPED }

comandament = { CREATE | START | PAUSE | UNPAUSE | STOP | RM }

## Output

S'indicarà l'estat en que ha de quedar el contenidor si el comandament es pot realitzar.
Si no es pot realitzar, s'indicarà amb el missatge d'error "Invalid command  for state "
