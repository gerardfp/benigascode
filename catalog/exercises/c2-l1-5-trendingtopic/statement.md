# [C5-L4-3] #TrendingTopic #strings

Una forma de veure la popularitat dels llenguatges de programació, es veure els cops que es mencionen a les xarxes socials.

A partir d'una sèrie de missatges publicats, volem fer un ranking dels hashtags més utilitzats.

## Input Format

En primer lloc ve el nombre de missatges. A continuació venen els missatges.

Cada missatge està encabit dintre d'unes claus {}

El missatge pot ocupar vàries línies, però totes elles tenen 1 grau de tabulació.

## Constraints

Un Hastag comença amb una # i es permeten lletres i números, i en general qualsevol caràcter que no sigui:

```text
. , - : ? !
```

## Output Format

S'imprimirà la llista de Hashtags i les vegades que apareix als missatges

## Sample Input 0

```text
4
{
    #Java
}
{
    #Python #Java
}
{
    #Java
}
{
    #Python
}
```

## Sample Output 0

```text
#java 3
#python 2
```

## Sample Input 1

```text
4
{
    The #Java world
}
{
    Programming in #Python #Java
}
{
    Everybody loves #PHP
}
{
    #Python is easy, #Java mmmm
}
```

## Sample Output 1

```text
#java 3
#python 2
#php 1
```

## Sample Input 2

```text
4
{
    What if... Oh, it actually works. #javascript
}
{
    #Java: New Developments & Features.
}
{
    Anyone out there know if there are any good books on #java?
}
{
    All computers wait at same speed #java, #JavaScript
}
```

## Sample Output 2

```text
#java 3
#javascript 2
```

## Sample Input 3

```text
6
{
    Everything you need to know about the newest garbage collectors in #Java.
}
{
    #python:  The boolean values False and True are equal to zero and one.
}
{
    Write everything in #JavaScript?
}
{
    Yet Another #javascript Framework
}
{
    got photo bombed by Guido van Rossum creator of #python
}
{
    Tonight I manipulated the DOM to add elements to a webpage using #javascript!
    Mind freaking blown!
}
```

## Sample Output 3

```text
#javascript 3
#python 2
#java 1
```

## Sample Input 4

```text
40
{
    #Java: New Developments & Features. #Java is growing and changing quickly,
    and there's a lot to keep up with.
}
{
    Everything you need to know about the newest garbage collectors in #Java.
}
{
    For #Java developers, learning Spring Boot is the first step to learning to developer
    applications for the cloud.
}
{
    A Reading List for #Java Programmers
}
{
    I used the last two days to complete the JUnit tutorial. #java
}
{
    Starting with my first #Java app
}
{
    Now I know #Java
}
{
    #Python is the most popular language in 2019
}
{
    How To: Configure #Python Virtual Environment
}
{
    console.log("good morning"); #JavaScript
    System.out.println("good morning"); #JAVA
    print "good morning"; #Python
    echo "good morning"; #PHP
    Good morning. #Human
}
{
    1 Minute #Python - String Indexing: Positive Indexes Enjoy! :)
}
{
    Creating a Neural Network from Scratch in #Python
}
{
    #python tip:  The boolean values False and True are equal to zero and one.
}
{
    got photo bombed by Guido van Rossum creator of #python
}
{
    Tonight I manipulated the DOM to add elements to a webpage using #javascript!
    Mind freaking blown!
}
{
    Today was spent going over regular expressions in #JavaScript
}
{
    I started learning React before having a solid grasp of #JavaScript and I regretted it.
}
{
    What if... Oh, it actually works. #javascript
}
{
    Write everything in #JavaScript
}
{
    This is going to change my entire workflow of building #javascript
}
{
    Yet Another #javascript Framework
}
{
    Time to relax after work and not think about #JavaScript Errors.
}
{
    if an image failed to load, show a customized broken image #javascript
}
{
    all about Machine Learning with #JavaScript
}
{
    Can you spot the vulnerability? #PHP
}
{
    Improve the security of your #PHP app
}
{

## Sample Output 4

```text
#javascript 14
#java 13
#php 11
#python 10
#csharp 8
#human 1
```
