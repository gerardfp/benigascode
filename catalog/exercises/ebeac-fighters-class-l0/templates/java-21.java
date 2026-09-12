import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;


class Fighter {
    String name;
    float strength;
    float speed;
    float agility;

    Fighter(String name, float strength, float speed, float agility) {
        this.name = name;
        this.strength = strength;
        this.speed = speed;
        this.agility = agility;
    }

    float getSum(){
        return strength + speed + agility;
    }
}

class Fight {
    // escriu el codi aqui
}

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        Fighter f1 = new Fighter(scanner.next(), scanner.nextFloat(), scanner.nextFloat(), scanner.nextFloat());
        Fighter f2 = new Fighter(scanner.next(), scanner.nextFloat(), scanner.nextFloat(), scanner.nextFloat());

        Fighter winner = new Fight().winner(f1, f2);

        System.out.println(winner == null ? "DOUBLE KO" : winner.name);
    }
}