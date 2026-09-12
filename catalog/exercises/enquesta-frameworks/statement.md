# Enquesta frameworks

En les enquestes poden haver preguntes condicionades. Són preguntes que només es fan si s'ha donat una determinada resposta en una pregunta anterior.

En una enquesta sobre *frameworks* es pregunta als participants si en coneixen algun, i en cas afirmatiu se'ls pregunta quin.

```text
Benvingut a l'enquesta.
Coneixes algun framework?
> no
Gracies per contestar
```

```text
Benvingut a l'enquesta.
Coneixes algun framework?
> si
Quin?
> react
S'ha registrat la resposta: react
Gracies per contestar
```

## Input

L'entrada té dues opcions:

- un únic `no`

- un `si` i una nova línia de text

## Output

S'imprimirà l'enquesta en el format apuntat als casos de prova
