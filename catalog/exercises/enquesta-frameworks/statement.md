# Enquesta frameworks #if

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

## Input Format

L'entrada té dues opcions:

- un únic `no`

- un `si` i una nova línia de text

## Constraints

-

## Output Format

S'imprimirà l'enquesta en el format apuntat als casos de prova

## Sample Input 0

```text
no
```

## Sample Output 0

```text
Benvingut a l'enquesta.
Coneixes algun framework?
Gracies per contestar
```

## Sample Input 1

```text
si
vue.js
```

## Sample Output 1

```text
Benvingut a l'enquesta.
Coneixes algun framework?
Quin?
S'ha registrat la resposta: vue.js
Gracies per contestar
```

## Sample Input 2

```text
si
svelte
```

## Sample Output 2

```text
Benvingut a l'enquesta.
Coneixes algun framework?
Quin?
S'ha registrat la resposta: svelte
Gracies per contestar
```

## Sample Input 3

```text
si
Spring
```

## Sample Output 3

```text
Benvingut a l'enquesta.
Coneixes algun framework?
Quin?
S'ha registrat la resposta: Spring
Gracies per contestar
```
